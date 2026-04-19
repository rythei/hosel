import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { PickPlayersClient } from "./PickPlayersClient";
import type { Pool, TournamentPlayer, PoolEntry } from "@/types";

const TIER_LABELS: Record<number, string> = {
  1: "Elite",
  2: "Contenders",
  3: "Dark Horses",
  4: "Sleepers",
  5: "Longshots",
  6: "Wildcards",
};

const TIER_COLORS: Record<number, string> = {
  1: "var(--tier-1)",
  2: "var(--tier-2)",
  3: "var(--tier-3)",
  4: "var(--tier-4)",
  5: "var(--tier-5)",
  6: "var(--text-muted)",
};

export default async function PickPlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/auth/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("*, tournament:tournaments(*)")
    .eq("id", id)
    .single<Pool & { tournament: { name: string; course: string; start_date: string; status: string } }>();

  if (!pool) redirect("/");

  // Check if user has an entry
  const { data: entry } = await supabase
    .from("pool_entries")
    .select("*")
    .eq("pool_id", id)
    .eq("user_id", authUser.id)
    .single<PoolEntry>();

  if (!entry) redirect(`/join?code=${pool.invite_code}`);

  // If deadline passed, show locked state
  const deadlinePassed = new Date(pool.entry_deadline) < new Date();
  if (deadlinePassed || pool.status === "live" || pool.status === "locked") {
    redirect(`/pool/${id}/leaderboard`);
  }

  const { data: players } = await supabase
    .from("tournament_players")
    .select("*")
    .eq("tournament_id", pool.tournament_id)
    .eq("status", "active")
    .order("tier", { ascending: true })
    .order("world_ranking", { ascending: true });

  const tierGroups: Record<number, TournamentPlayer[]> = {};
  for (let t = 1; t <= pool.num_tiers; t++) {
    tierGroups[t] = (players ?? []).filter((p) => p.tier === t);
  }

  return (
    <>
      <NavBar poolName={pool.name} />
      <PickPlayersClient
        pool={pool as Pool & { tournament: { name: string; course: string; start_date: string } }}
        entry={entry}
        tierGroups={tierGroups}
        tierLabels={TIER_LABELS}
        tierColors={TIER_COLORS}
        authUserId={authUser.id}
      />
    </>
  );
}
