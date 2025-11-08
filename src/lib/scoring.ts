import scoringConfig from "@/config/scoring.json";

type OutcomeConfig = {
  id: string;
  prob: number;
  type: string;
  points?: number;
  min?: number;
  max?: number;
};

export type ScoreOutcome = { id: string; points: number; meta?: Record<string, any> };

function weightedPick<T extends { prob: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.prob, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.prob;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function sampleScoreOutcome(): ScoreOutcome {
  const outcomes = scoringConfig.outcomes as OutcomeConfig[];
  const picked = weightedPick(outcomes);
  if (picked.type === "fixed") {
    return { id: picked.id, points: picked.points ?? 0 };
  }
  if (picked.type === "range") {
    const min = picked.min ?? 0;
    const max = picked.max ?? min;
    const pts = Math.floor(Math.random() * (max - min + 1)) + min;
    return { id: picked.id, points: pts };
  }
  // jackpot
  if (picked.type === "jackpot") {
    const reward = (scoringConfig as any).jackpotReward;
    return { id: picked.id, points: reward.points ?? 0, meta: { rewardType: reward.type } };
  }
  return { id: picked.id, points: 0 };
}

export default sampleScoreOutcome;
