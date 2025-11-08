import React, { useEffect, useState } from "react";
import { useLottery, formatTimeRemaining } from "@/lib/useLottery";

export const LotteryCountdown = () => {
  const { meta } = useLottery();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes } = formatTimeRemaining(meta.nextDrawAt);

  return (
    <div className="inline-flex items-center gap-2 text-xs bg-background/80 px-2 py-1 rounded">
      <span className="font-mono">{String(days).padStart(2, "0")}</span>
      <span className="text-muted-foreground">d</span>
      <span className="font-mono">{String(hours).padStart(2, "0")}</span>
      <span className="text-muted-foreground">h</span>
      <span className="font-mono">{String(minutes).padStart(2, "0")}</span>
      <span className="text-muted-foreground">m</span>
    </div>
  );
};

export default LotteryCountdown;
