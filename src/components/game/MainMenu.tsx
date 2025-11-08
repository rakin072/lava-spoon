import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Play, Trophy, Palette } from "lucide-react";
import lavaCaveBg from "@/assets/lava-cave-bg.png";

interface MainMenuProps {
  onPlayClick: () => void;
  onLeaderboardClick: () => void;
  onSkinsClick: () => void;
}

export const MainMenu = ({ onPlayClick, onLeaderboardClick, onSkinsClick }: MainMenuProps) => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${lavaCaveBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Animated overlay */}
      <div className="absolute inset-0 animate-lava opacity-30" />
      
      {/* Floating embers */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-ember rounded-full animate-float opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <Card className="relative z-10 bg-background/90 backdrop-blur-sm border-4 border-primary p-8 max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 animate-float">
            <Flame className="w-12 h-12 text-secondary animate-pulse-glow" />
            <h1 className="text-4xl font-bold text-primary drop-shadow-lg">
              LAVA LEGENDS
            </h1>
            <Flame className="w-12 h-12 text-secondary animate-pulse-glow" />
          </div>
          <p className="text-sm text-muted-foreground">Catch & Survive!</p>
        </div>

        {/* Menu buttons */}
        <div className="space-y-4">
          <Button
            onClick={onPlayClick}
            className="w-full btn-pixel flex items-center justify-center gap-3 text-xl"
          >
            <Play className="w-6 h-6" />
            PLAY
          </Button>

          <Button
            onClick={onLeaderboardClick}
            variant="secondary"
            className="w-full btn-pixel flex items-center justify-center gap-3"
          >
            <Trophy className="w-5 h-5" />
            LEADERBOARD
          </Button>

          <Button
            onClick={onSkinsClick}
            variant="secondary"
            className="w-full btn-pixel flex items-center justify-center gap-3"
          >
            <Palette className="w-5 h-5" />
            SKINS
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          <p>Use mouse or touch to catch falling items!</p>
        </div>
      </Card>
    </div>
  );
};
