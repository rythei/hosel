import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { fetchESPNScores, type ESPNPlayerScore, type Tour } from "@/lib/espn";
import { ADMIN_EMAIL } from "@/lib/admin";

// A player is "done" with a given round if they have a confirmed score,
// missed the cut (excused from R3/R4), or withdrew/were DQ'd.
function playerDoneWithRound(score: ESPNPlayerScore, roundIdx: number): boolean {
  if (score.roundsComplete[roundIdx]) return true;
  if (score.cut === "N" && roundIdx >= 2) return true; // missed cut, skip R3/R4
  if (score.cut === "WD" || score.cut === "DQ") return true;
  return false;
}

// A round is complete when at least one player has a confirmed score AND
// every player in the field is done with it.
function isRoundComplete(scores: ESPNPlayerScore[], roundIdx: number): boolean {
  const hasConfirmedData = scores.some((s) => s.roundsComplete[roundIdx]);
  if (!hasConfirmedData) return false;
  return scores.every((s) => playerDoneWithRound(s, roundIdx));
}

// Returns the new current_round (1–4) and whether the tournament is now complete.
function detectRoundProgress(scores: ESPNPlayerScore[]): { currentRound: number; isComplete: boolean } {
  let currentRound = 1;
  for (let r = 0; r < 4; r++) {
    if (isRoundComplete(scores, r)) {
      currentRound = r + 2; // advance to the next round
    } else {
      break;
    }
  }
  const isComplete = currentRound > 4;
  return { currentRound: Math.min(currentRound, 4), isComplete };
}

// Syncs every in-progress tournament, or a single one when `tournamentId` is
// given. Shared by the cron GET and the admin-triggered POST.
async function syncScores(tournamentId?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find all in-progress tournaments with an ESPN event ID
  let query = supabase
    .from("tournaments")
    .select("id, external_id, name, par, tour")
    .not("external_id", "is", null);

  // A manual sync targets one tournament regardless of status, so an admin can
  // pull scores for an event that hasn't been flipped to in_progress yet.
  query = tournamentId ? query.eq("id", tournamentId) : query.eq("status", "in_progress");

  const { data: tournaments } = await query;

  if (!tournaments?.length) {
    return { message: tournamentId ? "Tournament not found, or it has no ESPN event ID" : "No live tournaments" };
  }

  const results = [];

  for (const tournament of tournaments) {
    try {
      const { scores, detectedPar } = await fetchESPNScores(
        tournament.external_id!,
        tournament.par ?? 72,
        (tournament.tour as Tour) ?? "pga"
      );

      let matched = 0;
      const unmatched: string[] = [];

      for (const score of scores) {
        const statusMap: Record<string, string> = {
          Y: "active",
          N: "cut",
          WD: "withdrawn",
          DQ: "disqualified",
          "": "active",
        };

        // `select` on an update returns the affected rows, so a name that doesn't
        // exist in our field comes back empty instead of failing silently.
        const { data: updated } = await supabase
          .from("tournament_players")
          .update({
            r1_score: score.roundPars[0],
            r2_score: score.roundPars[1],
            r3_score: score.roundPars[2],
            r4_score: score.roundPars[3],
            status: statusMap[score.cut] ?? "active",
          })
          .eq("tournament_id", tournament.id)
          .eq("name", score.name)
          .select("id");

        if (updated && updated.length > 0) matched += updated.length;
        else unmatched.push(score.name);
      }

      // Detect round progression and update the tournament row
      const { currentRound, isComplete } = detectRoundProgress(scores);
      const tournamentUpdate: Record<string, unknown> = { current_round: currentRound };
      if (isComplete) tournamentUpdate.status = "complete";
      // Correct a wrong stored par once the field gives us enough evidence.
      if (detectedPar !== null && detectedPar !== tournament.par) {
        tournamentUpdate.par = detectedPar;
      }
      await supabase.from("tournaments").update(tournamentUpdate).eq("id", tournament.id);

      results.push({
        tournament: tournament.name,
        tour: tournament.tour ?? "pga",
        players: scores.length,
        matched,
        // A large unmatched count means our field names disagree with ESPN's.
        unmatched: unmatched.length,
        unmatchedSample: unmatched.slice(0, 5),
        detectedPar,
        parUpdated: tournamentUpdate.par !== undefined,
        currentRound,
        isComplete,
      });
    } catch (err) {
      results.push({ tournament: tournament.name, error: String(err) });
    }
  }

  return { updated: results, timestamp: new Date().toISOString() };
}

// Vercel cron calls this route — see vercel.json
export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}` && cronHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await syncScores());
}

// Manual sync from the admin dashboard. The Vercel cron is disabled on the
// Hobby plan, so without this nothing triggers a sync automatically.
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tournamentId: string | undefined;
  try {
    const body = await request.json();
    tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId : undefined;
  } catch {
    // No body — sync all in-progress tournaments.
  }

  return NextResponse.json(await syncScores(tournamentId));
}
