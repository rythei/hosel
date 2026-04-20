import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { AdminClient } from "./AdminClient";
import type { Tournament, TournamentPlayer } from "@/types";

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

  const playersByTournament: Record<string, TournamentPlayer[]> = {};
  for (const p of players ?? []) {
    if (!playersByTournament[p.tournament_id]) playersByTournament[p.tournament_id] = [];
    playersByTournament[p.tournament_id].push(p as TournamentPlayer);
  }

  return (
    <>
      <NavBar />
      <AdminClient
        tournaments={(tournaments ?? []) as Tournament[]}
        playersByTournament={playersByTournament}
      />
    </>
  );
}
