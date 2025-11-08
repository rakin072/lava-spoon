import { useEffect, useState } from "react";

export type PopupDensity = "full" | "reduced";

export interface GameSettings {
  postProcessing: boolean; // bloom/chromatic
  particles: boolean; // particle bursts
  popupDensity: PopupDensity; // frequency of +N popups
  haptics: boolean; // mobile vibration
  tapZones: boolean; // left/right tap zones
}

const STORAGE_KEY = "lavaLegendsSettings";

const defaultSettings: GameSettings = {
  postProcessing: true,
  particles: true,
  popupDensity: "full",
  haptics: true,
  tapZones: true,
};

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultSettings, ...JSON.parse(raw) } as GameSettings;
    } catch {}
    return defaultSettings;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  return {
    settings,
    setSettings,
    toggle: (key: keyof GameSettings) =>
      setSettings((s) => ({ ...s, [key]: !s[key] })),
    setPopupDensity: (v: PopupDensity) =>
      setSettings((s) => ({ ...s, popupDensity: v })),
  };
}
