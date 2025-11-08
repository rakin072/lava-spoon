import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { useMemo } from "react";
import lavaCaveBg from "@/assets/lava-cave-bg.png";

interface Stage {
  id: number;
  name: string;
  difficulty: number;
  unlocked: boolean;
  description: string;
}

interface StageSelectProps {
  onBack: () => void;
  onSelectStage: (stageId: number) => void;
  unlockedStages: number[];
}

export const StageSelect = ({ onBack, onSelectStage, unlockedStages }: StageSelectProps) => {
  const bestScore = useMemo(() => {
    try {
      const stored = localStorage.getItem("lavaLegendsLeaderboard");
      if (!stored) return 0;
      const list = JSON.parse(stored) as Array<{ score: number }>;
      return list.reduce((m, e) => Math.max(m, Number(e.score || 0)), 0);
    } catch { return 0; }
  }, []);

  const format = (n: number) => n.toLocaleString();
  const completionFor = (stageId: number) => {
    const target = stageId * 300; // simple target curve
    if (target <= 0) return 100;
    const pct = Math.min(100, Math.floor((bestScore / target) * 100));
    return pct;
  };
  const stages: Stage[] = [
    {
      id: 1,
      name: "LAVA CAVE KITCHEN",
      difficulty: 1,
      unlocked: unlockedStages.includes(1),
      description: "Warm up in the molten kitchen",
    },
    {
      id: 2,
      name: "VOLCANO PEAK",
      difficulty: 2,
      unlocked: unlockedStages.includes(2),
      description: "Intense heat at the summit",
    },
    {
      id: 3,
      name: "CRYSTAL CAVERN",
      difficulty: 3,
      unlocked: unlockedStages.includes(3),
      description: "Master the legendary cave",
    },
  ];
  return (
    <div 
      className="h-[100svh] flex flex-col p-3 md:p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${lavaCaveBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 animate-lava opacity-20" />
      
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8 mt-2 md:mt-4">
          <Button onClick={onBack} className="btn-pixel back-button">
            <ArrowLeft className="w-5 h-5" />
            <span>BACK</span>
          </Button>
          <h2 className="text-3xl font-bold text-primary">SELECT STAGE</h2>
        </div>

        {/* Scrollable area (mobile: vertical slide / snap) */}
        <div
          className="mt-2 md:mt-4 overflow-y-auto scroll-smooth snap-y snap-mandatory touch-pan-y"
          style={{ height: 'calc(100svh - 6rem)', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Stage cards */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {stages.map((stage) => (
            <Card
              key={stage.id}
              className={`relative p-4 md:p-6 border-4 transition-all stage-card snap-start md:snap-none min-h-[48vh] md:min-h-0 ${
                stage.unlocked
                  ? "border-primary bg-background/90 cursor-pointer"
                  : "border-muted bg-muted/50 opacity-60 locked"
              }`}
              onClick={() => stage.unlocked && onSelectStage(stage.id)}
            >
              {/* Lock indicator */}
              {!stage.unlocked && (
                <div className="absolute top-4 right-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 stage-title">
                    {stage.name}
                  </h3>
                  <p className="stage-description">{stage.description}</p>
                  {stage.id > 1 && !stage.unlocked && (
                    <p className="text-xs text-accent mt-1">
                      Score {stage.id * 300 - 300}+ to unlock
                    </p>
                  )}
                </div>

                {/* Difficulty stars */}
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className="stage-star">
                      <Star
                        className={`w-5 h-5 ${
                          i < stage.difficulty ? "text-primary fill-primary" : "text-muted"
                        }`}
                      />
                    </span>
                  ))}
                </div>

                {/* Progress metrics for unlocked stages */}
                {stage.unlocked && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Best Score: <span className="text-foreground font-bold">{format(bestScore)}</span></span>
                      <span className="text-muted-foreground">Completion: <span className="text-foreground font-bold">{completionFor(stage.id)}%</span></span>
                    </div>
                    <div className="stage-progress">
                      <div
                        className="stage-progress-fill"
                        style={{ width: `${completionFor(stage.id)}%` }}
                        aria-label={`Completion ${completionFor(stage.id)}%`}
                      />
                    </div>
                  </div>
                )}

                {stage.unlocked && (
                  <Button className="w-full btn-pixel">START</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
};
