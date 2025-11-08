let slowTimeout: number | null = null;
export let slowFactor = 1;

export function setSlowFactor(factor: number, durationMs: number) {
  slowFactor = factor;
  try {
    if (slowTimeout) window.clearTimeout(slowTimeout);
  } catch {}
  slowTimeout = window.setTimeout(() => {
    slowFactor = 1;
    slowTimeout = null;
  }, durationMs);
}

export default { slowFactor, setSlowFactor };
