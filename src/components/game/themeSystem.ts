export type HSL = { h: number; s: number; l: number };

// Basic utilities
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpHSL(a: HSL, b: HSL, t: number): HSL {
  // Hue wrap-aware lerp
  let dh = ((b.h - a.h + 540) % 360) - 180;
  return {
    h: (a.h + dh * t + 360) % 360,
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
  };
}

export function hslToHex({ h, s, l }: HSL): number {
  const _s = s / 100;
  const _l = l / 100;
  const c = (1 - Math.abs(2 * _l - 1)) * _s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = _l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
  } else if (120 <= h && h < 180) {
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) + (G << 8) + B;
}

export const themeSystem = {
  lavaCave: {
    ambient: { h: 15, s: 85, l: 25 } as HSL, // deep background
    collectible: { base: "#FFD700", glow: "#FFA500" },
    particle: { spawn: "#FF4500", fade: "#8B0000" },
  },
  transitionDuration: 2000, // ms
  applyFilter: "contrast(1.1) saturate(1.2)",
};

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function numberToHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

// Difficulty palette shifting: warm -> cool -> dangerous
// t in [0,1]
function paletteShift(t: number) {
  // Three key hues: warm(15°), cool(220°), danger(0°)
  const warm: HSL = { h: 15, s: 85, l: 55 };
  const cool: HSL = { h: 220, s: 70, l: 55 };
  const danger: HSL = { h: 0, s: 85, l: 50 };

  let phase: HSL;
  if (t < 0.5) {
    const k = t / 0.5;
    phase = lerpHSL(warm, cool, k);
  } else {
    const k = (t - 0.5) / 0.5;
    phase = lerpHSL(cool, danger, k);
  }
  return phase;
}

export type DynamicPalette = {
  ambientHex: number;
  collectibleBase: number;
  collectibleGlow: number;
  particleSpawn: number;
  particleFade: number;
};

export function computeDynamicPalette(stageId: number, elapsedMs: number): DynamicPalette {
  // Difficulty grows by time and stage; cap at 90s to 1.0
  const tTime = clamp(elapsedMs / 90000);
  const tStage = clamp((stageId - 1) / 5); // assume up to 6 stages
  const t = clamp(0.6 * tTime + 0.4 * tStage);

  const hueHsl = paletteShift(t);

  // Ambient shifts slightly darker with difficulty
  const ambient = { h: hueHsl.h, s: 75, l: lerp(20, 10, t) };

  // Collectible base and glow derived from hueHsl
  const base = { h: hueHsl.h, s: 90, l: 60 };
  const glow = { h: hueHsl.h, s: 100, l: 55 };

  // Particles: bright spawn -> deep fade
  const pSpawn = { h: hueHsl.h, s: 95, l: 58 };
  const pFade = { h: hueHsl.h, s: 85, l: 20 };

  return {
    ambientHex: hslToHex(ambient),
    collectibleBase: hslToHex(base),
    collectibleGlow: hslToHex(glow),
    particleSpawn: hslToHex(pSpawn),
    particleFade: hslToHex(pFade),
  };
}

// Heat zone factor: 0 (cool) at top to 1 (hot) at bottom
export function heatFactor(x: number, y: number, width: number, height: number): number {
  return clamp(y / height);
}

export function lightenColor(hex: number, amount: number): number {
  const r = Math.min(255, ((hex >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((hex >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (hex & 0xff) + Math.round(255 * amount));
  return (r << 16) + (g << 8) + b;
}

export function numberHexToCss(n: number): string {
  return numberToHex(n);
}
