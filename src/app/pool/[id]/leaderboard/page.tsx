import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { LeaderboardClient } from "./LeaderboardClient";
import { computeLeaderboard } from "@/lib/scoring";
import type { Pool, PoolEntry, TournamentPlayer } from "@/types";

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("*, tournament:tournaments(*)")
    .eq("id", id)
    .single<Pool & { tournament: { name: string; course: string; status: string; current_round: number | null; par: number } }>();

  if (!pool) redirect("/");
  if (!pool.is_public && !authUser) redirect("/auth/login");

  const { data: entries } = await supabase
    .from("pool_entries")
    .select("*")
    .eq("pool_id", id);

  const { data: players } = await supabase
    .from("tournament_players")
    .select("*")
    .eq("tournament_id", pool.tournament_id);

  // Build users map
  const userIds = Array.from(new Set((entries ?? []).map((e) => e.user_id)));
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, display_name").in("id", userIds)
    : { data: [] };

  const usersMap = Object.fromEntries((users ?? []).map((u: { id: string; display_name: string }) => [u.id, { display_name: u.display_name }]));

  const leaderboard = computeLeaderboard(
    (entries ?? []) as PoolEntry[],
    (players ?? []) as TournamentPlayer[],
    pool as Pool,
    usersMap,
    pool.tournament?.par ?? 72
  );

  const isAdmin = authUser ? pool.organizer_id === authUser.id : false;
  const hasEntry = authUser ? (entries ?? []).some((e) => e.user_id === authUser.id) : false;

  // Pot only counts confirmed buy-ins
  const confirmedEntries = (entries ?? []).filter((e) => e.buyin_status === "confirmed");
  const entryCount = (entries ?? []).length;
  const totalPot = pool.buy_in * confirmedEntries.length;

  return (
    <>
      <NavBar poolName={pool.name} poolId={id} isAdmin={isAdmin} />
      <LeaderboardClient
        pool={pool as Pool & { tournament: { name: string; course: string; status: string; current_round: number | null } }}
        leaderboard={leaderboard}
        entryCount={entryCount}
        totalPot={totalPot}
        isAdmin={isAdmin}
        poolId={id}
        isPublic={pool.is_public ?? false}
        hasEntry={hasEntry}
        isAuthenticated={!!authUser}
      />
    </>
  );
}
