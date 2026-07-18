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

    // Weekend eligibility must be computed first so R3/R4 scores can be suppressed
    const madeCut = pickedPlayers.filter(
      (p) => p.status !== "cut" && p.status !== "withdrawn" && p.status !== "disqualified"
    ).length;
    const isEligibleWeekend = madeCut >= pool.cut_rule_minimum;

    const roundScores: (number | null)[] = [null, null, null, null];
    let totalScore: number | null = null;

    for (let r = 1; r <= 4; r++) {
      // Ineligible entries don't compete in R3/R4
      if (r >= 3 && !isEligibleWeekend) continue;
      const scores = pickedPlayers.map((p) => getRoundScore(p, r as Round));
      const hasAnyData = scores.some((s) => s !== null);
      if (hasAnyData) {
        roundScores[r - 1] = computeRoundTotal(scores, pool.scoring_method);
      }
    }

    const totalScoringMethod = pool.total_scoring_method ?? "sum_of_rounds";

    if (totalScoringMethod === "best_players_overall") {
      // Pick the best-X players by cumulative tournament score, sum their totals.
      const playerCount = pool.scoring_method === "best_4_of_5" ? 4 : pool.scoring_method === "all_5" ? 5 : 3;
      const eligiblePlayers = pickedPlayers
        .filter((p) => p.status !== "cut" && p.status !== "withdrawn" && p.status !== "disqualified")
        .filter((p) => p.total_score !== null);
      if (isEligibleWeekend) {
        const sorted = [...eligiblePlayers].sort((a, b) => (a.total_score ?? 0) - (b.total_score ?? 0));
        const counting = sorted.slice(0, playerCount);
        if (counting.length > 0) {
          totalScore = counting.reduce((sum, p) => sum + (p.total_score ?? 0), 0);
        }
      }
    } else {
      // sum_of_rounds: sum the per-round best-X totals
      const computed = roundScores.filter((s): s is number => s !== null);
      if (computed.length > 0) {
        totalScore = computed.reduce((a, b) => a + b, 0);
      }
    }

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

  // Use the most recently active round's tiebreaker (highest round with score data)
  const activeTbRound: "r1" | "r2" | "r3" | "r4" =
    actualLowRelative.r4 !== null ? "r4" :
    actualLowRelative.r3 !== null ? "r3" :
    actualLowRelative.r2 !== null ? "r2" : "r1";

  // Sort: eligible entries first, then by total score ASC, then current round's tiebreaker
  rows.sort((a, b) => {
    if (a.is_eligible_weekend !== b.is_eligible_weekend) return a.is_eligible_weekend ? -1 : 1;
    if (a.total_score === null && b.total_score === null) return 0;
    if (a.total_score === null) return 1;
    if (b.total_score === null) return -1;
    if (a.total_score !== b.total_score) return a.total_score - b.total_score;
    return tbCompare(a, b, activeTbRound);
  });

  // Assign ranks — same rank only when both tiebreakers also resolve to a tie
  function areTied(a: LeaderboardRow, b: LeaderboardRow): boolean {
    if (a.is_eligible_weekend !== b.is_eligible_weekend) return false;
    if (a.total_score !== b.total_score) return false;
    return tbCompare(a, b, activeTbRound) === 0;
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

  const roundPayoutAmounts = [splits.first, splits.second, splits.third].map(
    (pct) => Math.floor(roundPot * pct / 100)
  );
  const placementLabels = ["first", "second", "third"];

  // Per-round payouts with tie splitting
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

    let pos = 0;
    while (pos < roundRanked.length && pos < roundPayoutAmounts.length) {
      const score = roundScoresByEntry[roundRanked[pos].entry_id]?.[r] ?? Infinity;
      let end = pos;
      while (
        end + 1 < roundRanked.length &&
        (roundScoresByEntry[roundRanked[end + 1].entry_id]?.[r] ?? Infinity) === score
      ) end++;
      const slotsUsed = Math.min(end - pos + 1, roundPayoutAmounts.length - pos);
      const groupTotal = roundPayoutAmounts.slice(pos, pos + slotsUsed).reduce((a, b) => a + b, 0);
      const share = Math.floor(groupTotal / (end - pos + 1));
      for (let k = pos; k <= end; k++) {
        payouts.push({
          user_id: roundRanked[k].user_id,
          category,
          placement: placementLabels[pos],
          token_amount: share,
        });
      }
      pos = end + 1;
    }
  }

  // Overall winner - split if tied at rank 1
  const overallWinners = leaderboard.filter((row) => row.rank === 1 && row.total_score !== null);
  if (overallWinners.length > 0) {
    const share = Math.floor(overallPot / overallWinners.length);
    for (const winner of overallWinners) {
      payouts.push({
        user_id: winner.user_id,
        category: "overall",
        placement: "winner",
        token_amount: share,
      });
    }
  }

  return payouts;
}
