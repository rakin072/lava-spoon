import powerConfig from "@/config/powerups.json";

export type PlayerState = {
  score: number;
  speed: number;
  hp: number;
  effects?: Record<string, { expiresAt: number; payload?: any }>;
  // baselineSpeed is optional external reference for restoring speed
  baselineSpeed?: number;
};

function nowMs() {
  return Date.now();
}

export function applyPowerup(player: PlayerState, powerupId: string): PlayerState {
  const power = (powerConfig as any).powerups[powerupId];
  if (!power) return player;
  const next: PlayerState = { ...player, effects: { ...(player.effects || {}) } };

  switch (power.type) {
    case "bonus":
      next.score = (next.score || 0) + (power.scoreDelta || 0);
      break;
    case "attract":
      next.effects![power.id] = { expiresAt: nowMs() + (power.durationMs || 0), payload: { radiusBonus: power.radiusBonus } };
      break;
    case "slow":
      next.effects![power.id] = { expiresAt: nowMs() + (power.durationMs || 0), payload: { speedFactor: power.speedFactor } };
      // apply speed factor relative to baselineSpeed if present
      const base = next.baselineSpeed ?? next.speed;
      next.speed = base * (power.speedFactor ?? 1);
      break;
    case "revive":
      if ((next.hp ?? 0) <= 0) next.hp = (power.reviveHp ?? 1);
      else next.effects![power.id] = { expiresAt: nowMs() + (power.durationMs || 0) };
      break;
  }
  return next;
}

export function applyObstacle(player: PlayerState, obstacleId: string): PlayerState {
  const obs = (powerConfig as any).obstacles[obstacleId];
  if (!obs) return player;
  const next: PlayerState = { ...player, effects: { ...(player.effects || {}) } };

  switch (obs.type) {
    case "damage":
      next.score = (next.score || 0) + (obs.scoreDelta || 0);
      break;
    case "vision":
      next.effects![obs.id] = { expiresAt: nowMs() + (obs.durationMs || 0), payload: { darkenFactor: obs.darkenFactor } };
      break;
    case "steal":
      const stolen = Math.min(next.score || 0, obs.stealPoints || 0);
      next.score = (next.score || 0) - stolen;
      next.effects![obs.id] = { expiresAt: nowMs() + 2000, payload: { stolen } };
      break;
  }
  return next;
}

export function cleanupExpiredEffects(player: PlayerState): PlayerState {
  const now = nowMs();
  const effects = { ...(player.effects || {}) };
  for (const key of Object.keys(effects)) {
    if (effects[key].expiresAt <= now) {
      delete effects[key];
    }
  }
  // note: restoring speed should be done using baselineSpeed tracked on the player externally
  return { ...player, effects };
}

export default { applyPowerup, applyObstacle, cleanupExpiredEffects };
