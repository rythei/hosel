import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeLeaderboard } from "@/lib/scoring";
import type { PoolEntry, TournamentPlayer, Pool } from "@/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("id", id)
    .single<Pool>();

  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

  const { data: entries } = await supabase
    .from("pool_entries")
    .select("*")
    .eq("pool_id", id);

  const { data: players } = await supabase
    .from("tournament_players")
    .select("*")
    .eq("tournament_id", pool.tournament_id);

  const userIds = Array.from(new Set((entries ?? []).map((e) => e.user_id)));
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, display_name").in("id", userIds)
    : { data: [] };

  const usersMap = Object.fromEntries((users ?? []).map((u: { id: string; display_name: string }) => [u.id, { display_name: u.display_name }]));

  const leaderboard = computeLeaderboard(
    (entries ?? []) as PoolEntry[],
    (players ?? []) as TournamentPlayer[],
    pool,
    usersMap
  );

  return NextResponse.json({ leaderboard });
}
