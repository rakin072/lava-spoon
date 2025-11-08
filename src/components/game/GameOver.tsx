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
    <div className="h-screen bg-gradient-to-b from-background to-volcano-dark flex items-center justify-center p-4">
      {/* Render the game-over UI as a single framed card that matches the mobile portrait layout.
          Fixed frame: narrow max-width and near-viewport height so content proportions remain consistent.
          No vertical scrolling — everything is sized to fit the frame. */}
      <Card
        className="bg-background/95 backdrop-blur-sm border-4 border-primary p-6 md:p-8 w-full max-w-[380px] flex flex-col items-center space-y-4 animate-scale-in"
      >
        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold text-primary">GAME OVER</h2>
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-secondary" />
            <p className="text-lg text-muted-foreground">Mission Complete!</p>
          </div>
        </div>

    {/* Scrollable middle area: Score and Lottery. Keeps buttons fixed at bottom so they remain visible after spin. */}
  <div className="overflow-auto no-scrollbar w-full">
    {/* Score and Rank */}
    <div className="text-center space-y-3 md:space-y-4 py-4 md:py-6 border-y-2 border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-2">FINAL SCORE</p>
            <p className="text-6xl font-bold text-primary animate-pulse-glow">
              {score}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">RANK</p>
            <p className={`text-7xl font-bold ${color}`}>{rank}</p>
          </div>
        </div>

    {/* Lottery is available as a popup — not rendered inline on this card. */}

    </div>
    {/* Buttons */}
  <div className="space-y-2 md:space-y-3 pt-2 md:pt-4 flex-shrink-0">
          <Button onClick={() => setShowLotteryPopup(true)} className="w-full btn-pixel flex items-center justify-center gap-2 bg-gradient-to-b from-amber-400 to-yellow-300 text-amber-900 border-yellow-500 shadow-lg hover:scale-105 transition-transform">
            🎰 LOTTERY
          </Button>
          
          <Button onClick={onPlayAgain} className="w-full btn-pixel flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </Button>
          <Button 
            onClick={onMainMenu} 
            variant="secondary"
            className="w-full btn-pixel flex items-center justify-center gap-2"
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
