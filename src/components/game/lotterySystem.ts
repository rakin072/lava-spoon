// Advanced Lottery / Slot Machine System
// Handles reel spins, weighted reward selection, near-miss feedback, and persistence.

export type ReelSymbol = '🔥' | '💎' | '⭐' | '🎁' | '❌';
export interface SpinResult { symbols: ReelSymbol[]; reward?: LotteryReward; nearMiss?: boolean; }

export interface LotteryRewardBase { rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'; summary: string; }
export interface PowerupReward extends LotteryRewardBase { type: 'powerup'; power: 'megaScore' | 'shield' | 'fever'; value: string; }
export interface CurrencyReward extends LotteryRewardBase { type: 'currency'; amount: number; }
export interface SkinReward extends LotteryRewardBase { type: 'skin'; skinId: string; }
export interface MysteryReward extends LotteryRewardBase { type: 'mystery'; contains: 'random'; }
export interface BoostReward extends LotteryRewardBase { type: 'boost'; boost: 'doubleXP'; duration: number; }

export type LotteryReward = PowerupReward | CurrencyReward | SkinReward | MysteryReward | BoostReward;

interface WeightedEntry<T> { item: T; weight: number; }

// Weighted reward distribution per spec.
// Note: We split common into small coin bundles.
const rewardTable: WeightedEntry<LotteryReward>[] = [
  { item: { type: 'currency', amount: 50, rarity: 'common', summary: '+50 Coins' }, weight: 30 },
  { item: { type: 'currency', amount: 100, rarity: 'common', summary: '+100 Coins' }, weight: 30 },
  { item: { type: 'powerup', power: 'megaScore', value: '3x next game', rarity: 'uncommon', summary: '3x Score Next Game' }, weight: 25 },
  { item: { type: 'skin', skinId: 'emberVariant', rarity: 'rare', summary: 'Unlock Skin: Ember Variant' }, weight: 12 },
  { item: { type: 'boost', boost: 'doubleXP', duration: 1, rarity: 'epic', summary: 'Double XP (1 game)' }, weight: 2.5 },
  { item: { type: 'skin', skinId: 'goldenSpoon', rarity: 'legendary', summary: 'Legendary Skin: Golden Spoon' }, weight: 0.5 },
];

export const reels: ReelSymbol[][] = [
  ['🔥', '💎', '⭐', '🎁', '❌'],
  ['🔥', '💎', '⭐', '🎁', '❌'],
  ['🔥', '💎', '⭐', '🎁', '❌'],
];

function pickWeighted<T>(entries: WeightedEntry<T>[]): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    if (r < e.weight) return e.item;
    r -= e.weight;
  }
  return entries[entries.length - 1].item; // fallback
}

function evaluateTriple(symbols: ReelSymbol[]): LotteryReward | undefined {
  const joined = symbols.join('');
  switch (joined) {
    case '🔥🔥🔥': return { type: 'powerup', power: 'megaScore', value: '3x next game', rarity: 'uncommon', summary: '3x Score Next Game' };
    case '💎💎💎': return { type: 'currency', amount: 500, rarity: 'rare', summary: '+500 Coins' };
    case '⭐⭐⭐': return { type: 'skin', skinId: 'lavaSpirit', rarity: 'rare', summary: 'Unlock Skin: Lava Spirit' };
    case '🎁🎁🎁': return { type: 'mystery', contains: 'random', rarity: 'epic', summary: 'Mystery Box' };
    default: return undefined;
  }
}

function isNearMiss(symbols: ReelSymbol[]): boolean {
  // Near miss: two leading or two trailing matches but not all three.
  const [a,b,c] = symbols;
  return (a === b || b === c) && !(a === b && b === c);
}

export function spinLogicalOutcome(): SpinResult {
  // Decide final symbols (random for now; could bias based on recent plays)
  const symbols: ReelSymbol[] = [0,1,2].map(() => {
    const reel = reels[0]; // all identical sets
    return reel[Math.floor(Math.random() * reel.length)];
  });
  let reward = evaluateTriple(symbols);
  if (!reward) {
    // Fallback weighted reward independent of symbols (keeping excitement)
    reward = pickWeighted(rewardTable);
  }
  return { symbols, reward, nearMiss: isNearMiss(symbols) };
}

// Persistence helpers
const LAST_REWARD_KEY = 'lavaLegendsLastLotteryReward';
const NEXT_GAME_BOOST_KEY = 'lavaLegendsNextGameBoost';

export function storeReward(reward: LotteryReward) {
  try { localStorage.setItem(LAST_REWARD_KEY, JSON.stringify(reward)); } catch {}
  if (reward.type === 'powerup' && reward.power === 'megaScore') {
    try { localStorage.setItem(NEXT_GAME_BOOST_KEY, JSON.stringify({ kind: 'megaScore', multiplier: 3 })); } catch {}
  }
  if (reward.type === 'boost' && reward.boost === 'doubleXP') {
    try { localStorage.setItem(NEXT_GAME_BOOST_KEY, JSON.stringify({ kind: 'doubleXP', multiplier: 2 })); } catch {}
  }
}

export function consumeNextGameBoost(): { kind: string; multiplier: number } | null {
  try {
    const raw = localStorage.getItem(NEXT_GAME_BOOST_KEY);
    if (!raw) return null;
    localStorage.removeItem(NEXT_GAME_BOOST_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredReward(): LotteryReward | null {
  try {
    const raw = localStorage.getItem(LAST_REWARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
