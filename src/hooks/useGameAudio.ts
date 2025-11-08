import { useEffect, useRef } from "react";

export type SoundEffect = "collect" | "gem" | "powerup" | "hazard" | "gameover" | "victory" | "combo" | "reelTick" | "reelStop";
export interface SoundOptions { pitch?: number } // pitch multiplier (1.0 = default)

export const useGameAudio = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.5);

  useEffect(() => {
    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create background music
    musicRef.current = new Audio();
    musicRef.current.loop = true;
    musicRef.current.volume = 0.3;

    return () => {
      audioContextRef.current?.close();
      musicRef.current?.pause();
    };
  }, []);

  const playSound = (type: SoundEffect, opts: SoundOptions = {}) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const pitch = Math.max(0.5, Math.min(2.0, opts.pitch ?? 1.0));

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different sound profiles for each effect
    switch (type) {
      case "collect":
        oscillator.frequency.setValueAtTime(440 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880 * pitch, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;

      case "gem":
        oscillator.frequency.setValueAtTime(523 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1046 * pitch, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
        break;

      case "powerup":
        oscillator.frequency.setValueAtTime(262 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(523 * pitch, ctx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(1046 * pitch, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        break;

      case "hazard":
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(200 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50 * pitch, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;

      case "gameover":
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220 * pitch, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;

      case "victory":
        oscillator.frequency.setValueAtTime(523 * pitch, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659 * pitch, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784 * pitch, ctx.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(1046 * pitch, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
        break;

      case "combo":
        oscillator.frequency.setValueAtTime(880 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760 * pitch, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.35, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
        break;
      case "reelTick":
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300 * pitch, ctx.currentTime);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.05);
        break;
      case "reelStop":
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(200 * pitch, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(120 * pitch, ctx.currentTime + 0.18);
        gainNode.gain.setValueAtTime(volumeRef.current * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.18);
        break;
    }
  };

  const setVolume = (volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    if (musicRef.current) {
      musicRef.current.volume = volumeRef.current * 0.3;
    }
  };

  return { playSound, setVolume };
};
