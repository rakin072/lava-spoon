import { useEffect, useMemo, useState } from "react";

type DeviceClass = "mobile" | "tablet" | "desktop";

function detectDeviceClass(w: number): DeviceClass {
  if (w < 600) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useAdaptiveViewport() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const config = useMemo(() => {
    const device = detectDeviceClass(size.w);
    const autoScale = Math.min(size.dpr, 2);
    // Portrait-first base playfield (vertical canvas), tiered by viewport height
    // All dimensions are multiples of 16 for pixel-perfect scaling
    let baseWidth = 480;
    let baseHeight = 848;
    const h = size.h;
    if (h < 740) {
      baseWidth = 432; // 27*16
      baseHeight = 768; // 48*16
    } else if (h >= 900) {
      baseWidth = 544; // 34*16
      baseHeight = 960; // 60*16
    }

    // Pixel-perfect hint: prefer integer zoom
    // Compute a suitable zoom so playfield height fits within viewport minus safe areas
    const safeTop = 44; // px target padding for notch zone (additional to CSS env safe-area)
    const safeBottom = 88 + 34; // control zone + home indicator

    // Compute integer zoom based on height fitting
  const zoomH = Math.max(1, Math.floor((size.h - (safeTop + safeBottom)) / baseHeight));
    const zoom = Math.max(1, Math.min(5, zoomH));

    return {
      device,
      autoScale,
      baseWidth,
      baseHeight,
      zoom,
      safeTop,
      safeBottom,
      orientation: size.w >= size.h ? "landscape" : "portrait",
    } as const;
  }, [size]);

  return config;
}
