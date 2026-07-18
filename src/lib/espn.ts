export interface ESPNPlayerScore {
  name: string;
  roundPars: (number | null)[];
  roundsComplete: boolean[]; // true only when all 18 holes are confirmed (not a live estimate)
  totalPar: number | null;
  thru: string;
  cut: "Y" | "N" | "WD" | "DQ" | "";
}

export async function fetchESPNScores(eventId: string, par = 72): Promise<ESPNPlayerScore[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?event=${eventId}`;
  const res = await fetch(url, { next: { revalidate: 0 } });

  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);

  const json = await res.json();
  let competitors: ESPNCompetitor[] = [];

  try {
    competitors = json.events[0].competitions[0].competitors ?? [];
  } catch {
    return [];
  }

  return competitors.map((c) => parseCompetitor(c, competitors, par));
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
