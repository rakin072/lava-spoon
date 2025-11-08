import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { SlotMachine } from "./SlotMachine";
import { SpinResult } from "./lotterySystem";
import { useState, useEffect } from "react";

interface GameOverProps {
  score: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOver = ({ score, onPlayAgain, onMainMenu }: GameOverProps) => {
  const [lotteryResult, setLotteryResult] = useState<SpinResult | null>(null);
  const [showLotteryPopup, setShowLotteryPopup] = useState(false);

  useEffect(() => {}, []);

  const getRank = (score: number) => {
    if (score >= 1000) return { rank: "S", color: "text-gold" };
    if (score >= 700) return { rank: "A", color: "text-secondary" };
    if (score >= 400) return { rank: "B", color: "text-accent" };
    if (score >= 200) return { rank: "C", color: "text-foreground" };
    return { rank: "D", color: "text-muted-foreground" };
  };

  const { rank, color } = getRank(score);

  return (
  <div className="h-screen bg-gradient-to-b from-background to-volcano-dark flex items-center justify-center p-3 md:p-4">
      {/* Render the game-over UI as a single framed card that matches the mobile portrait layout.
          Fixed frame: narrow max-width and near-viewport height so content proportions remain consistent.
          No vertical scrolling — everything is sized to fit the frame. */}
      <Card
        className="bg-background/95 backdrop-blur-sm border-4 border-primary p-5 md:p-8 w-full max-w-[380px] flex flex-col items-center space-y-3 md:space-y-4 animate-scale-in"
        style={{ height: 'min(92svh, 800px)' }}
      >
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-3xl md:text-4xl font-bold text-primary">GAME OVER</h2>
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-secondary" />
            <p className="text-sm md:text-lg text-muted-foreground">Mission Complete!</p>
          </div>
        </div>

    {/* Scrollable middle area: Score and Lottery. Keeps buttons fixed at bottom so they remain visible after spin. */}
  <div className="overflow-auto no-scrollbar w-full">
    {/* Score and Rank */}
    <div className="text-center space-y-2 md:space-y-4 py-3 md:py-6 border-y-2 border-border">
          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-2">FINAL SCORE</p>
            <p
              className="font-bold text-primary animate-pulse-glow leading-tight"
              style={{ fontSize: 'clamp(2.5rem, 9vw, 4.5rem)' }}
            >
              {score}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground mb-2">RANK</p>
            <p
              className={`font-bold ${color} leading-tight`}
              style={{ fontSize: 'clamp(3rem, 12vw, 5rem)' }}
            >
              {rank}
            </p>
          </div>
        </div>

    {/* Lottery is available as a popup — not rendered inline on this card. */}

    </div>
    {/* Buttons */}
  <div className="space-y-1.5 md:space-y-2 pt-1.5 md:pt-3 flex-shrink-0">
          <Button onClick={() => setShowLotteryPopup(true)} className="w-full btn-pixel flex items-center justify-center gap-1 py-2 md:py-3 bg-gradient-to-b from-amber-400 to-yellow-300 text-amber-900 border-yellow-500 shadow-md hover:scale-105 transition-transform">
            🎰 LOTTERY
          </Button>

          <Button onClick={onPlayAgain} className="w-full btn-pixel flex items-center justify-center gap-1 py-2 md:py-3">
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </Button>
          <Button 
            onClick={onMainMenu} 
            variant="secondary"
            className="w-full btn-pixel flex items-center justify-center gap-1 py-2 md:py-3"
          >
            <Home className="w-5 h-5" />
            MAIN MENU
          </Button>
        </div>

        {/* Social share placeholder */}
        <p className="text-center text-xs text-muted-foreground">
          Share your score with friends!
        </p>
      </Card>
      {/* Lottery modal popup — rendered at the page level so it cannot be clipped by the card. */}
      {showLotteryPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLotteryPopup(false)} />
          <div className="relative z-60 w-full max-w-sm p-4">
            <SlotMachine onComplete={(res) => { setLotteryResult(res); setShowLotteryPopup(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};
