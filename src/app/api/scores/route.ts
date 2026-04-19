import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchESPNScores } from "@/lib/espn";

// Vercel cron calls this route — see vercel.json
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all in-progress tournaments with an ESPN event ID
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, external_id, name")
    .eq("status", "in_progress")
    .not("external_id", "is", null);

  if (!tournaments?.length) {
    return NextResponse.json({ message: "No live tournaments" });
  }

  const results = [];

  for (const tournament of tournaments) {
    try {
      const scores = await fetchESPNScores(tournament.external_id!);

      for (const score of scores) {
        const statusMap: Record<string, string> = {
          Y: "active",
          N: "cut",
          WD: "withdrawn",
          DQ: "disqualified",
          "": "active",
        };

        await supabase
          .from("tournament_players")
          .update({
            r1_score: score.roundPars[0],
            r2_score: score.roundPars[1],
            r3_score: score.roundPars[2],
            r4_score: score.roundPars[3],
            status: statusMap[score.cut] ?? "active",
          })
          .eq("tournament_id", tournament.id)
          .eq("name", score.name);
      }

      results.push({ tournament: tournament.name, players: scores.length });
    } catch (err) {
      results.push({ tournament: tournament.name, error: String(err) });
    }
  }

  return NextResponse.json({ updated: results, timestamp: new Date().toISOString() });
}
