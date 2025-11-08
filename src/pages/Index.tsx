import { useState } from "react";
import { MainMenu } from "@/components/game/MainMenu";
import { StageSelect } from "@/components/game/StageSelect";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameOver } from "@/components/game/GameOver";
import { Leaderboard } from "@/components/game/Leaderboard";
import { Skins } from "@/components/game/Skins";

type GameScreen = 
  | "menu" 
  | "stage-select" 
  | "gameplay" 
  | "game-over" 
  | "leaderboard" 
  | "skins";

const Index = () => {
  // detect embed mode (used when the app is loaded inside an <iframe> or by an external embed URL)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams('');
  const embedMode = urlParams.get('embed') === '1' || urlParams.get('embed') === 'true';
  const embedStageParam = Number(urlParams.get('stage')) || undefined;
  const [currentScreen, setCurrentScreen] = useState<GameScreen>("menu");
  const [selectedStage, setSelectedStage] = useState(() => {
    const stored = localStorage.getItem('lavaLegendsLastStage');
    return stored ? Number(stored) || 1 : 1;
  });
  const [finalScore, setFinalScore] = useState(0);
  const [unlockedStages, setUnlockedStages] = useState<number[]>(() => {
    const stored = localStorage.getItem("lavaLegendsUnlockedStages");
    return stored ? JSON.parse(stored) : [1];
  });

  const handleSelectStage = (stageId: number) => {
    setSelectedStage(stageId);
    try { localStorage.setItem('lavaLegendsLastStage', String(stageId)); } catch {}
    setCurrentScreen("gameplay");
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    
    // Check if player should unlock next stage (score threshold)
    const unlockThreshold = selectedStage * 300; // 300 for stage 1, 600 for stage 2, etc.
    if (score >= unlockThreshold && !unlockedStages.includes(selectedStage + 1) && selectedStage < 3) {
      const newUnlocked = [...unlockedStages, selectedStage + 1];
      setUnlockedStages(newUnlocked);
      localStorage.setItem("lavaLegendsUnlockedStages", JSON.stringify(newUnlocked));
    }
    
    // Save to leaderboard
    const stored = localStorage.getItem("lavaLegendsLeaderboard");
    const leaderboard = stored ? JSON.parse(stored) : [];
    
    leaderboard.push({
      rank: 0,
      name: "PLAYER",
      score,
      date: new Date().toISOString().split("T")[0],
    });
    
    leaderboard.sort((a: any, b: any) => b.score - a.score);
    leaderboard.forEach((entry: any, index: number) => {
      entry.rank = index + 1;
    });
    
    localStorage.setItem("lavaLegendsLeaderboard", JSON.stringify(leaderboard.slice(0, 10)));
    
    setCurrentScreen("game-over");
  };

  const renderScreen = () => {
    // If embed mode is enabled, render gameplay directly (GameCanvas only) so an iframe can point to `/?embed=1&stage=1`
    if (embedMode) {
      const stageToUse = embedStageParam ?? selectedStage;
      return (
        <GameCanvas
          stageId={stageToUse}
          onGameOver={handleGameOver}
          onBack={() => { /* no-op in embed mode */ }}
        />
      );
    }
    switch (currentScreen) {
      case "menu":
        return (
          <MainMenu
            onPlayClick={() => setCurrentScreen("stage-select")}
            onLeaderboardClick={() => setCurrentScreen("leaderboard")}
            onSkinsClick={() => setCurrentScreen("skins")}
          />
        );
      case "stage-select":
        return (
          <StageSelect
            onBack={() => setCurrentScreen("menu")}
            onSelectStage={handleSelectStage}
            unlockedStages={unlockedStages}
          />
        );
      case "gameplay":
        return (
          <GameCanvas
            stageId={selectedStage}
            onGameOver={handleGameOver}
            onBack={() => setCurrentScreen("stage-select")}
          />
        );
      case "game-over":
        return (
          <GameOver
            score={finalScore}
            onPlayAgain={() => setCurrentScreen("stage-select")}
            onMainMenu={() => setCurrentScreen("menu")}
          />
        );
      case "leaderboard":
        return <Leaderboard onBack={() => setCurrentScreen("menu")} />;
      case "skins":
        return <Skins onBack={() => setCurrentScreen("menu")} />;
      default:
        return null;
    }
  };

  return <div className="w-full">{renderScreen()}</div>;
};

export default Index;
