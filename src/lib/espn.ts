export interface ESPNPlayerScore {
  name: string;
  roundPars: (number | null)[];
  roundsComplete: boolean[]; // true only when all 18 holes are confirmed (not a live estimate)
  totalPar: number | null;
  thru: string;
  cut: "Y" | "N" | "WD" | "DQ" | "";
}

// ESPN league slugs we know about. The scoreboard endpoint is league-scoped, and
// requesting an event ID from the wrong league does NOT error — ESPN ignores the
// unknown event and returns that league's current event instead. There is no
// per-tournament "tour" stored anywhere, so every fetch discovers the right
// league itself by checking which one actually has the requested event ID.
export const TOURS = ["pga", "lpga", "champions-tour", "liv", "dpwt"] as const;
export type Tour = (typeof TOURS)[number];

export interface ESPNFetchResult {
  scores: ESPNPlayerScore[];
  /** Par derived from completed rounds in the field, or null when undeterminable. */
  detectedPar: number | null;
  /** Which ESPN league actually served this event. */
  tour: Tour;
}

// Tries each known tour's scoreboard endpoint for this event ID and returns the
// first one whose response actually contains that event (ESPN silently substitutes
// its current event for an unknown ID rather than 404ing, so this check is what
// keeps a tour mismatch from looking like a healthy sync of the wrong field).
export async function fetchESPNScores(eventId: string, par = 72): Promise<ESPNFetchResult> {
  const attempts = await Promise.allSettled(
    TOURS.map(async (tour) => ({ tour, event: await fetchEventForTour(eventId, tour) }))
  );

  for (const attempt of attempts) {
    if (attempt.status !== "fulfilled" || !attempt.value.event) continue;
    const { tour, event } = attempt.value;

    const competitors: ESPNCompetitor[] = event.competitions?.[0]?.competitors ?? [];
    if (competitors.length === 0) continue;

    const detectedPar = detectPar(competitors);
    const effectivePar = detectedPar ?? par;

    return {
      scores: competitors.map((c) => parseCompetitor(c, competitors, effectivePar)),
      detectedPar,
      tour,
    };
  }

  throw new Error(
    `ESPN event ${eventId} was not found on any known tour (${TOURS.join(", ")}). ` +
      `Double-check the event ID.`
  );
}

interface ESPNEvent {
  id?: string | number;
  name?: string;
  competitions?: { competitors?: ESPNCompetitor[] }[];
}

async function fetchEventForTour(eventId: string, tour: Tour): Promise<ESPNEvent | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/${tour}/scoreboard?event=${eventId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const json = await res.json();
  const event: ESPNEvent | undefined = json?.events?.[0];
  if (!event || String(event.id) !== String(eventId)) return null;

  return event;
}

// Derive course par from the field: for any player whose played rounds are all
// complete, (totalStrokes - toPar) / roundsPlayed === par. Requires consensus
// across at least 10 players so a stray malformed row can't shift every score.
function detectPar(competitors: ESPNCompetitor[]): number | null {
  const tally = new Map<number, number>();

  for (const c of competitors) {
    const played = (c.linescores ?? []).filter((ls) => (ls.linescores ?? []).length > 0);
    if (played.length === 0) continue;

    // Any partial round makes the player's total unusable for this calculation.
    if (played.some((ls) => (ls.linescores ?? []).length !== 18)) continue;

    let strokes = 0;
    let usable = true;
    for (const ls of played) {
      const v = ls.value !== undefined && ls.value !== "" ? Number(ls.value) : NaN;
      if (!Number.isFinite(v)) { usable = false; break; }
      strokes += v;
    }
    if (!usable) continue;

    const scoreStr = (c.score ?? "").toString().trim();
    const toPar = scoreStr === "E" ? 0 : parseInt(scoreStr, 10);
    if (isNaN(toPar)) continue;

    const implied = (strokes - toPar) / played.length;
    if (!Number.isInteger(implied) || implied < 62 || implied > 78) continue;

    tally.set(implied, (tally.get(implied) ?? 0) + 1);
  }

  let best: number | null = null;
  let bestCount = 0;
  for (const [value, count] of tally) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return bestCount >= 10 ? best : null;
}

interface ESPNLinescore {
  value?: number | string;
  displayValue?: string;
  period?: number;
  linescores?: unknown[];
}

interface ESPNCompetitor {
  athlete?: { displayName?: string };
  score?: string | number;
  linescores?: ESPNLinescore[];
  status?: { type?: { name?: string }; displayValue?: string } | string;
}

function parseCompetitor(c: ESPNCompetitor, allCompetitors: ESPNCompetitor[], par: number): ESPNPlayerScore {
  const name = c.athlete?.displayName ?? "";

  // Overall to-par
  let totalPar: number | null = null;
  const scoreStr = (c.score ?? "").toString().trim();
  if (scoreStr === "E") totalPar = 0;
  else {
    const n = parseInt(scoreStr, 10);
    if (!isNaN(n)) totalPar = n;
  }

  // Per-round to-par
  const roundPars: (number | null)[] = [null, null, null, null];
  const roundsComplete: boolean[] = [false, false, false, false];
  const linescores = c.linescores ?? [];
  let thruHoles = 0;

  for (let r = 0; r < Math.min(linescores.length, 4); r++) {
    const ls = linescores[r];
    const holeScores = (ls.linescores ?? []).length;
    const rawStrokes = ls.value !== undefined && ls.value !== "" ? Number(ls.value) : null;
    const roundIdx = (ls.period ?? r + 1) - 1;
    const isLastRound = r === linescores.length - 1;

    if (isLastRound) thruHoles = holeScores;

    if (holeScores === 18 && rawStrokes !== null) {
      roundPars[roundIdx] = rawStrokes - par;
      roundsComplete[roundIdx] = true; // confirmed 18 holes, not a live estimate
    }
  }

  // Fill in-progress round from live total — find the last round with holes played but not finished
  if (totalPar !== null) {
    for (let r = linescores.length - 1; r >= 0; r--) {
      const ls = linescores[r];
      const holeScores = (ls.linescores ?? []).length;
      const roundIdx = (ls.period ?? r + 1) - 1;
      if (holeScores > 0 && holeScores < 18) {
        const completedSum = roundPars.reduce<number>((acc, v) => acc + (v ?? 0), 0);
        roundPars[roundIdx] = totalPar - completedSum;
        break;
      }
    }
  }

  // Thru display
  let thruDisplay: string;
  if (linescores.length === 0) thruDisplay = "—";
  else if (thruHoles === 18) thruDisplay = "F";
  else if (thruHoles === 0) thruDisplay = "—";
  else thruDisplay = String(thruHoles);

  // Cut status
  let cut: ESPNPlayerScore["cut"] = "";
  const status = c.status;
  if (status && typeof status === "object") {
    const typeName = (status.type?.name ?? status.displayValue ?? "").toLowerCase();
    if (["cut", "mc", "missed cut"].includes(typeName)) cut = "N";
    else if (["wd", "withdrawn"].includes(typeName)) cut = "WD";
    else if (["dq", "disqualified"].includes(typeName)) cut = "DQ";
  }

  if (!cut) {
    // ESPN uses displayValue="-" with holes=0 as a sentinel meaning "not playing this round".
    // Check every linescore: the first sentinel round tells us when the player stopped competing.
    const firstSentinelRound = linescores.findIndex(
      (ls) => (ls.linescores ?? []).length === 0 && ls.displayValue === "-"
    );

    if (firstSentinelRound === 0) {
      // Sentinel in R1 — withdrew before the tournament started, treat as WD
      cut = "WD";
    } else if (firstSentinelRound === 1) {
      // Sentinel in R2 — withdrew after R1
      cut = "WD";
    } else if (firstSentinelRound >= 2) {
      // Sentinel in R3+ — missed the cut
      cut = "N";
    } else {
      // No sentinel found — use hole-activity fallback for cut detection
      const anyoneInR3 = allCompetitors.some((comp) => {
        const ls3 = (comp.linescores ?? [])[2];
        return ls3 && (ls3.linescores ?? []).length > 0;
      });
      if (anyoneInR3) {
        const hasWeekendActivity = linescores.slice(2).some((ls) => (ls.linescores ?? []).length > 0);
        const hasR2Complete = linescores[1] && (linescores[1].linescores ?? []).length === 18;
        cut = hasWeekendActivity ? "Y" : hasR2Complete ? "N" : "";
      }
    }
  }

  return { name, roundPars, roundsComplete, totalPar, thru: thruDisplay, cut };
}
