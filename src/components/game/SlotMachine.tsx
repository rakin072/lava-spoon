import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGameAudio } from '@/hooks/useGameAudio';
import { reels, spinLogicalOutcome, storeReward, SpinResult, ReelSymbol } from './lotterySystem';

interface SlotMachineProps {
  onComplete?: (result: SpinResult) => void;
}

export const SlotMachine = ({ onComplete }: SlotMachineProps) => {
  const { playSound } = useGameAudio();
  const [display, setDisplay] = useState<ReelSymbol[]>(['❌','❌','❌']);
  const [spinning, setSpinning] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach((t) => window.clearInterval(t)); }, []);

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);

    // Start ticking each reel
    const tick = (col: number) => {
      const t = window.setInterval(() => {
        setDisplay((prev) => {
          const next = [...prev];
          const reel = reels[col];
          const idx = Math.floor(Math.random() * reel.length);
          next[col] = reel[idx];
          return next as ReelSymbol[];
        });
      }, 80);
      timers.current.push(t);
    };

    [0,1,2].forEach((i) => tick(i));
    playSound('reelTick', { pitch: 1.0 });

    // Determine logical outcome now
    const logical = spinLogicalOutcome();

    // Staggered stops
    for (let i = 0; i < 3; i++) {
      await new Promise<void>((res) => setTimeout(() => res(), 800 + i * 400));
      // Stop reel i and set to logical symbol
      const t = timers.current.shift();
      if (t) window.clearInterval(t);
      setDisplay((prev) => {
        const next = [...prev];
        next[i] = logical.symbols[i];
        return next as ReelSymbol[];
      });
      playSound('reelStop', { pitch: 0.9 + i * 0.05 });
      if (navigator.vibrate) navigator.vibrate(20);
    }

    // Persist reward, call callback
    if (logical.reward) storeReward(logical.reward);
    setSpinning(false);
    onComplete?.(logical);
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm border-4 border-primary p-4 w-full">
      <div className="flex items-center justify-center gap-4 py-4">
        {display.map((sym, i) => (
          <div key={i} className="w-20 h-20 border-2 border-border rounded bg-card flex items-center justify-center text-4xl select-none">
            {sym}
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button onClick={spin} disabled={spinning} className="btn-pixel">
          {spinning ? 'SPINNING…' : 'SPIN'}
        </Button>
      </div>
    </Card>
  );
};
