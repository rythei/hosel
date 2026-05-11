import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { AdminClient } from "./AdminClient";
import type { Tournament, TournamentPlayer, Pool } from "@/types";

const ADMIN_EMAIL = "ryanctheisen@gmail.com";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) redirect("/");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  const { data: players } = await supabase
    .from("tournament_players")
    .select("*")
    .order("tier", { ascending: true })
    .order("world_ranking", { ascending: true });

  const { data: pools } = await supabase
    .from("pools")
    .select("*")
    .order("created_at", { ascending: false });

  const playersByTournament: Record<string, TournamentPlayer[]> = {};
  for (const p of players ?? []) {
    if (!playersByTournament[p.tournament_id]) playersByTournament[p.tournament_id] = [];
    playersByTournament[p.tournament_id].push(p as TournamentPlayer);
  }

  const poolsByTournament: Record<string, Pool[]> = {};
  for (const p of pools ?? []) {
    if (!poolsByTournament[p.tournament_id]) poolsByTournament[p.tournament_id] = [];
    poolsByTournament[p.tournament_id].push(p as Pool);
  }

  return (
    <>
      <NavBar />
      <AdminClient
        tournaments={(tournaments ?? []) as Tournament[]}
        playersByTournament={playersByTournament}
        poolsByTournament={poolsByTournament}
      />
    </>
  );
}
