import { useCallback, useEffect, useState } from "react";

type Winner = { id: string; name: string; drawAt: number } | null;

interface LotteryMeta {
  nextDrawAt: number;
  drawInterval: "monthly";
  ticketHolders: string[]; // player ids
  lastWinner: Winner;
}

const STORAGE_KEY = "lavaLotteryMeta_v1";

function computeNextMonthlyBoundary(from = Date.now()) {
  const d = new Date(from);
  // move to first day of next month at 00:00 UTC
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
}

function loadMeta(): LotteryMeta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LotteryMeta;
  } catch (e) {
    // ignore parse errors
  }
  return {
    nextDrawAt: computeNextMonthlyBoundary(),
    drawInterval: "monthly",
    ticketHolders: [],
    lastWinner: null,
  };
}

function persist(meta: LotteryMeta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {
    // ignore
  }
}

export function useLottery() {
  const [meta, setMeta] = useState<LotteryMeta>(() => loadMeta());

  // persist on change
  useEffect(() => {
    persist(meta);
  }, [meta]);

  // schedule check every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() >= meta.nextDrawAt) {
        // perform draw
        doDraw();
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [meta]);

  const computeTickets = useCallback(
    (leaderboard: Array<{ id: string; name?: string; score: number }>, topN = 10) => {
      // sort by score desc and take topN ids
      const top = [...leaderboard]
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map((p) => p.id);
      setMeta((m) => ({ ...m, ticketHolders: top }));
    },
    []
  );

  const doDraw = useCallback(() => {
    setMeta((m) => {
      if (!m.ticketHolders || m.ticketHolders.length === 0) {
        // advance draw
        return { ...m, nextDrawAt: computeNextMonthlyBoundary(m.nextDrawAt) };
      }
      const idx = Math.floor(Math.random() * m.ticketHolders.length);
      const winnerId = m.ticketHolders[idx];
      const winner: Winner = { id: winnerId, name: winnerId, drawAt: Date.now() };
      const next = computeNextMonthlyBoundary(m.nextDrawAt);
      const newMeta: LotteryMeta = {
        ...m,
        lastWinner: winner,
        nextDrawAt: next,
      };
      // persist immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMeta));
      } catch {}
      return newMeta;
    });
  }, []);

  const triggerDraw = useCallback(() => {
    doDraw();
  }, [doDraw]);

  const isTicketHolder = useCallback((id: string) => meta.ticketHolders.includes(id), [meta.ticketHolders]);

  return { meta, computeTickets, triggerDraw, isTicketHolder } as const;
}

export function formatTimeRemaining(targetMs: number) {
  const now = Date.now();
  let diff = Math.max(0, targetMs - now);
  const days = Math.floor(diff / (24 * 3600 * 1000));
  diff -= days * 24 * 3600 * 1000;
  const hours = Math.floor(diff / (3600 * 1000));
  diff -= hours * 3600 * 1000;
  const minutes = Math.floor(diff / (60 * 1000));
  diff -= minutes * 60 * 1000;
  const seconds = Math.floor(diff / 1000);
  return { days, hours, minutes, seconds };
}
