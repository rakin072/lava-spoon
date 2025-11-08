// Scoring & Progression System
// Provides dynamic difficulty adjustment (DDA) and combo/multiplier logic.

export interface DifficultySnapshot {
  accuracy: number;
  reactionTime: number; // average ms
  survivalRate: number;
  playerSkill: number; // 0-1
}

export class DifficultyEngine {
  playerSkill = 0.5;
  private targetCatchRate = 0.75;

  analyze(catches: number, misses: number, avgReaction: number, currentLives: number, maxLives: number, adjust: (factor: number) => void) : DifficultySnapshot {
    const total = catches + misses;
    const accuracy = total === 0 ? 0 : catches / total;
    const reactionTime = avgReaction || 500; // fallback
    const survivalRate = maxLives === 0 ? 0 : currentLives / maxLives;

    // Adaptive skill rating (clamped)
    this.playerSkill = clamp(
      accuracy * 0.5 + (1 - reactionTime / 500) * 0.3 + survivalRate * 0.2,
      0,
      1
    );

    // Adjust spawn rate softly to steer toward target catch rate.
    if (accuracy > this.targetCatchRate + 0.05) {
      adjust(1.08); // slightly faster
    } else if (accuracy < this.targetCatchRate - 0.08) {
      adjust(0.92); // slightly slower
    }

    return { accuracy, reactionTime, survivalRate, playerSkill: this.playerSkill };
  }
}

export class ComboSystem {
  current = 0;
  multiplier = 1.0;

  handleCatch(now: number): { current: number; multiplier: number; milestone?: number } {
    this.current++;
    if (this.current >= 50) this.multiplier = 5.0; // GOD MODE
    else if (this.current >= 25) this.multiplier = 3.0; // LEGENDARY
    else if (this.current >= 10) this.multiplier = 2.0; // EPIC
    else if (this.current >= 5) this.multiplier = 1.5; // HOT STREAK
    else this.multiplier = 1.0 + this.current / 20; // gentle ramp pre-5

    const milestone = this.current % 5 === 0 ? this.current : undefined;
    return { current: this.current, multiplier: this.multiplier, milestone };
  }

  handleMiss(): { current: number; multiplier: number } {
    this.current = Math.floor(this.current * 0.5); // graceful decay
    this.multiplier = 1.0 + this.current / 20;
    return { current: this.current, multiplier: this.multiplier };
  }

  reset() {
    this.current = 0;
    this.multiplier = 1.0;
  }
}

// Fever mode controller: risk/reward (double points, half lives temporarily)
export class FeverMode {
  active = false;
  private endAt = 0;

  start(now: number, durationMs = 10000) {
    this.active = true;
    this.endAt = now + durationMs;
  }
  update(now: number) {
    if (this.active && now >= this.endAt) {
      this.active = false;
    }
    return this.active;
  }
}

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
