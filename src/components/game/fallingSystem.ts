import Phaser from "phaser";
import { computeDynamicPalette, lightenColor } from "./themeSystem";

export type SpawnType = "collectible" | "hazard" | "powerup" | "chain" | "fakeout" | "splitting";

export type BehaviorType = "straight" | "zigzag" | "spiral" | "cluster" | "orbit";

export interface SpawnDecision {
  lane: number;
  type: SpawnType;
  ratePerSec: number;
  behavior: BehaviorType;
}

export interface SpawnContext {
  stageId: number;
  elapsedMs: number;
  score: number;
  lanes: number;
  width: number;
}

// Helper random utilities
const choose = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export class SpawnManager {
  private history: number[] = [];
  constructor(public lanes = 5) {}

  next(ctx: SpawnContext): SpawnDecision {
    const all = Array.from({ length: this.lanes }, (_, i) => i);
    const recent = this.history.slice(-2);
    const available = all.filter((l) => !recent.includes(l));

    // Difficulty curve: grows with score and time
    const ratePerSec = clamp(1.5 + (ctx.score / 500) * 0.5 + ctx.elapsedMs / 120000, 1.5, 7);

    // Weighted type selection
    const r = Math.random();
  let type: SpawnType = r < 0.5 ? "collectible" : r < 0.8 ? "hazard" : r < 0.9 ? "powerup" : Math.random() < 0.5 ? "chain" : "fakeout";
  // Occasionally upgrade hazard to splitting variant
  if (type === "hazard" && Math.random() < 0.2) type = "splitting";

    // Behavior weighting: simple for now
    const behavior: BehaviorType = choose(["straight", "zigzag", "spiral"]);

    const lane = choose(available.length ? available : all);
    this.history.push(lane);
    if (this.history.length > 10) this.history.shift();

    return { lane, type, ratePerSec, behavior };
  }
}

export interface CreateResult {
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  type: SpawnType;
  points: number;
  isHazard: boolean;
  isPowerUp: boolean;
  meta?: any;
}

// Create a rectangle-based token with optional satellites
export function createFallingObject(scene: Phaser.Scene, x: number, y: number, type: SpawnType, stageId: number, elapsedMs: number): CreateResult {
  const palette = computeDynamicPalette(stageId, elapsedMs);

  let color = palette.collectibleBase;
  let points = 10;
  let isHazard = false;
  let isPowerUp = false;
  const width = 40;
  const height = 40;

  if (type === "hazard") {
    color = 0x2c2c2c;
    points = 0;
    isHazard = true;
  } else if (type === "splitting") {
    color = 0x404040; // slightly lighter to hint it's special
    points = 0;
    isHazard = true;
  } else if (type === "powerup") {
    color = lightenColor(palette.collectibleGlow, 0.05);
    points = 50;
    isPowerUp = true;
  } else if (type === "fakeout") {
    // Slightly desaturated/incorrect color
    color = lightenColor(palette.collectibleBase, -0.12);
    points = 5; // low
  } else if (type === "chain") {
    color = palette.collectibleGlow;
    points = 15;
  }

  // Randomly choose a visual shape for variety: square, rect, circle, oval, pentagon
  const shapeKinds = ['square', 'rect', 'circle', 'oval', 'pentagon'] as const;
  const kind = choose(shapeKinds as any) as typeof shapeKinds[number];
  let shape: Phaser.GameObjects.GameObject;
  // Slight size variance
  const w = width * (0.8 + Math.random() * 0.6);
  const h = height * (0.8 + Math.random() * 0.6);
  if (kind === 'square' || kind === 'rect') {
    const rectShape = scene.add.rectangle(0, 0, kind === 'square' ? Math.max(w, h) : w, kind === 'square' ? Math.max(w, h) : h, color);
    shape = rectShape;
  } else if (kind === 'circle') {
    const r = Math.max(w, h) * 0.5;
    shape = scene.add.circle(0, 0, r, color);
  } else if (kind === 'oval') {
    // ellipse via graphics -> texture (Phaser doesn't have ellipse gamobject with fill easily), use ellipse GameObject
    const rx = w * 0.5; const ry = h * 0.5;
    shape = scene.add.ellipse(0, 0, rx * 2, ry * 2, color);
  } else {
    // pentagon (regular)
    const radius = Math.max(w, h) * 0.5;
    const points: number[] = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      points.push(Math.cos(a) * radius);
      points.push(Math.sin(a) * radius);
    }
    shape = scene.add.polygon(0, 0, points, color);
  }
  const container = scene.add.container(x, y, [shape]);
  scene.physics.add.existing(container);
  const body = container.body as Phaser.Physics.Arcade.Body;
  body.setAllowGravity(false);

  // Shape-correct physics: adjust the arcade body to match the visual
  // For circles/oval/pentagon we approximate with a circular body; for rects use sized box.
  try {
    if ((kind === 'circle') || (kind === 'oval') || (kind === 'pentagon')) {
      const radius = Math.max(w, h) * 0.5;
      // setCircle expects radius (not diameter)
      body.setCircle(Math.round(radius));
      // center the circle on the container origin
      body.setOffset(Math.round(-radius), Math.round(-radius));
    } else {
      // square/rect: set size to visual bounds and center it
      const bw = Math.round(kind === 'square' ? Math.max(w, h) : w);
      const bh = Math.round(kind === 'square' ? Math.max(w, h) : h);
      body.setSize(bw, bh);
      body.setOffset(Math.round(-bw / 2), Math.round(-bh / 2));
    }
  } catch (e) {
    // ignore if body adjustments fail on unexpected physics implementations
  }

  // Orbiting satellites around collectibles sometimes
  let meta: any = undefined;
  if (type === "collectible" && Math.random() < 0.3) {
    const sat = scene.add.circle(0, 0, 6, lightenColor(palette.collectibleBase, 0.2));
    container.add(sat);
    meta = { satellite: sat, satAngle: 0 };
  }

  return { container, body, type, points, isHazard, isPowerUp, meta };
}

export function applyBehavior(obj: CreateResult, behavior: BehaviorType, time: number, delta: number) {
  const b = obj.body;
  const c = obj.container;
  switch (behavior) {
    case "straight": {
      b.setVelocity(0, 200);
      break;
    }
    case "zigzag": {
      const vy = 180;
      const vx = Math.sin(time * 0.005) * 70; // time in ms
      b.setVelocity(vx, vy);
      break;
    }
    case "spiral": {
      const vy = 150;
      const angle = time * 0.002;
      const radius = 28;
      c.x += Math.cos(angle) * 1.2; // use position updates for spiral
      c.y += vy * (delta / 1000);
      break;
    }
    case "orbit": {
      // handled via meta.satellite in update loop
      b.setVelocity(0, 170);
      break;
    }
  }

  // Update any satellites
  if (obj.meta?.satellite) {
    obj.meta.satAngle += 0.1;
    const r = 16;
    obj.meta.satellite.x = Math.cos(obj.meta.satAngle) * r;
    obj.meta.satellite.y = Math.sin(obj.meta.satAngle) * r;
  }
}
