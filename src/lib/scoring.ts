import type { Pool, PoolEntry, TournamentPlayer, LeaderboardRow } from "@/types";

type Round = 1 | 2 | 3 | 4;

function getRoundScore(player: TournamentPlayer, round: Round): number | null {
  const score = player[`r${round}_score` as keyof TournamentPlayer] as number | null;
  if (player.status === "cut" && round >= 3) return null;
  if (player.status === "withdrawn" || player.status === "disqualified") return null;
  return score;
}

function computeRoundTotal(
  scores: (number | null)[],
  method: Pool["scoring_method"]
): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => a - b);

  if (method === "best_3_of_5") return sorted.slice(0, 3).reduce((a, b) => a + b, 0);
  if (method === "best_4_of_5") return sorted.slice(0, 4).reduce((a, b) => a + b, 0);
  return valid.reduce((a, b) => a + b, 0); // all_5
}

export function computeLeaderboard(
  entries: PoolEntry[],
  players: TournamentPlayer[],
  pool: Pool,
  usersMap: Record<string, { display_name: string }>,
  par = 72
): LeaderboardRow[] {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const rows: LeaderboardRow[] = entries.map((entry) => {
    const pickedPlayers = Object.values(entry.picks ?? {})
      .map((pid) => playerMap[pid as string])
      .filter(Boolean);

    const roundScores: (number | null)[] = [null, null, null, null];
    let totalScore: number | null = null;

    for (let r = 1; r <= 4; r++) {
      const scores = pickedPlayers.map((p) => getRoundScore(p, r as Round));
      const hasAnyData = scores.some((s) => s !== null);
      if (hasAnyData) {
        roundScores[r - 1] = computeRoundTotal(scores, pool.scoring_method);
      }
    }

    // Total = best-X of each player's cumulative score across all completed rounds.
    // e.g. best_3_of_5 picks the 3 players with the lowest combined R1+R2+... score,
    // NOT the sum of per-round best-3 results (which could count different players each round).
    const playerCumulatives: (number | null)[] = pickedPlayers.map((p) => {
      let sum = 0;
      let hasAny = false;
      for (let r = 1; r <= 4; r++) {
        const s = getRoundScore(p, r as Round);
        if (s !== null) { sum += s; hasAny = true; }
      }
      return hasAny ? sum : null;
    });
    if (playerCumulatives.some((s) => s !== null)) {
      totalScore = computeRoundTotal(playerCumulatives, pool.scoring_method);
    }

    // Weekend eligibility: X+ players making the cut
    const madeCut = pickedPlayers.filter(
      (p) => p.status !== "cut" && p.status !== "withdrawn" && p.status !== "disqualified"
    ).length;
    const isEligibleWeekend = madeCut >= pool.cut_rule_minimum;

    const pickLabels = Object.entries(entry.picks ?? {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([tier, pid]) => {
        const p = playerMap[pid as string];
        return {
          tier: Number(tier),
          player_name: p?.name ?? "?",
          r1: p ? getRoundScore(p, 1) : null,
          r2: p ? getRoundScore(p, 2) : null,
          r3: p ? getRoundScore(p, 3) : null,
          r4: p ? getRoundScore(p, 4) : null,
          status: p?.status ?? "active",
        };
      });

    return {
      rank: 0,
      entry_id: entry.id,
      user_id: entry.user_id,
      display_name: usersMap[entry.user_id]?.display_name ?? "Unknown",
      picks: pickLabels,
      r1_score: roundScores[0],
      r2_score: roundScores[1],
      r3_score: roundScores[2],
      r4_score: roundScores[3],
      total_score: totalScore,
      is_eligible_weekend: isEligibleWeekend,
      tiebreaker: entry.tiebreaker ?? { r1: null, r2: null, r3: null, r4: null },
    };
  });

  // Compute the actual lowest score (relative to par) per round across all players
  const actualLowRelative: Record<"r1" | "r2" | "r3" | "r4", number | null> = { r1: null, r2: null, r3: null, r4: null };
  for (const p of players) {
    (["r1", "r2", "r3", "r4"] as const).forEach((rk) => {
      const s = p[`${rk}_score` as keyof TournamentPlayer] as number | null;
      if (s !== null) actualLowRelative[rk] = actualLowRelative[rk] === null ? s : Math.min(actualLowRelative[rk]!, s);
    });
  }
  // Convert to absolute strokes for comparison against tiebreaker guesses
  const actualLowStrokes: Record<"r1" | "r2" | "r3" | "r4", number | null> = {
    r1: actualLowRelative.r1 !== null ? actualLowRelative.r1 + par : null,
    r2: actualLowRelative.r2 !== null ? actualLowRelative.r2 + par : null,
    r3: actualLowRelative.r3 !== null ? actualLowRelative.r3 + par : null,
    r4: actualLowRelative.r4 !== null ? actualLowRelative.r4 + par : null,
  };

  // Tiebreaker comparison for a given round:
  // 1st: closest predicted score to actual daily low (abs diff, lower = better)
  // 2nd: entry picked a player who actually shot the daily low
  function tbCompare(a: LeaderboardRow, b: LeaderboardRow, rk: "r1" | "r2" | "r3" | "r4"): number {
    const actualLow = actualLowStrokes[rk];
    const actualLowRel = actualLowRelative[rk];
    const ta = a.tiebreaker[rk];
    const tb = b.tiebreaker[rk];

    if (ta !== null && tb !== null && actualLow !== null) {
      const diffA = Math.abs(ta - actualLow);
      const diffB = Math.abs(tb - actualLow);
      if (diffA !== diffB) return diffA - diffB;
      // Same diff → did they pick the player who shot the actual low?
      if (actualLowRel !== null) {
        const aPickedLow = a.picks.some((p) => p[rk] === actualLowRel);
        const bPickedLow = b.picks.some((p) => p[rk] === actualLowRel);
        if (aPickedLow !== bPickedLow) return aPickedLow ? -1 : 1;
      }
    }
    if (ta !== null && actualLow !== null) return -1;
    if (tb !== null && actualLow !== null) return 1;
    return 0;
  }

  // Sort: total score ASC, then R1 tiebreaker
  rows.sort((a, b) => {
    if (a.total_score === null && b.total_score === null) return 0;
    if (a.total_score === null) return 1;
    if (b.total_score === null) return -1;
    if (a.total_score !== b.total_score) return a.total_score - b.total_score;
    return tbCompare(a, b, "r1");
  });

  // Assign ranks — same rank only when both tiebreakers also resolve to a tie
  function areTied(a: LeaderboardRow, b: LeaderboardRow): boolean {
    if (a.total_score !== b.total_score) return false;
    return tbCompare(a, b, "r1") === 0;
  }

  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && areTied(rows[i], rows[i - 1])) {
      rows[i].rank = rows[i - 1].rank;
    } else {
      rows[i].rank = rank;
    }
    rank++;
  }

  return rows;
}

export function computePayouts(
  leaderboard: LeaderboardRow[],
  pool: Pool,
  roundScoresByEntry: Record<string, (number | null)[]>
): Array<{
  user_id: string;
  category: string;
  placement: string;
  token_amount: number;
}> {
  const totalPot = pool.buy_in * leaderboard.length;
  const payouts: Array<{ user_id: string; category: string; placement: string; token_amount: number }> = [];
  const roundPct = pool.payout_structure.rounds.percentage / 100;
  const overallPct = pool.payout_structure.overall.percentage / 100;
  const splits = pool.payout_structure.rounds.splits;

  const roundPot = Math.floor(totalPot * roundPct);
  const overallPot = Math.floor(totalPot * overallPct);

  // Per-round payouts
  for (let r = 0; r < 4; r++) {
    const category = `round_${r + 1}`;
    const roundRanked = leaderboard
      .filter((row) => {
        if (r >= 2 && !row.is_eligible_weekend) return false;
        return roundScoresByEntry[row.entry_id]?.[r] !== null;
      })
      .sort((a, b) => {
        const sa = roundScoresByEntry[a.entry_id]?.[r] ?? Infinity;
        const sb = roundScoresByEntry[b.entry_id]?.[r] ?? Infinity;
        return (sa as number) - (sb as number);
      });

    const placements = [
      { placement: "first", pct: splits.first / 100 },
      { placement: "second", pct: splits.second / 100 },
      { placement: "third", pct: splits.third / 100 },
    ];

    placements.forEach(({ placement, pct }, idx) => {
      if (roundRanked[idx]) {
        payouts.push({
          user_id: roundRanked[idx].user_id,
          category,
          placement,
          token_amount: Math.floor(roundPot * pct),
        });
      }
    });
  }

  // Overall winner
  const overallWinner = leaderboard[0];
  if (overallWinner && overallWinner.total_score !== null) {
    payouts.push({
      user_id: overallWinner.user_id,
      category: "overall",
      placement: "winner",
      token_amount: overallPot,
    });
  }

  return payouts;
}
