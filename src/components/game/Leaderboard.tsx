import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useLottery } from "@/lib/useLottery";
import LotteryBadge from "./LotteryBadge";
import LotteryModal from "./LotteryModal";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string;
}

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard = ({ onBack }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("lavaLegendsLeaderboard");
    if (stored) {
      setEntries(JSON.parse(stored));
    } else {
      // Demo data
      setEntries([
        { rank: 1, name: "FLAME_KING", score: 2450, date: "2024-01-15" },
        { rank: 2, name: "LAVA_PRO", score: 1980, date: "2024-01-14" },
        { rank: 3, name: "SPOON_MASTER", score: 1750, date: "2024-01-13" },
        { rank: 4, name: "HOT_SHOT", score: 1420, date: "2024-01-12" },
        { rank: 5, name: "EMBER_ACE", score: 1150, date: "2024-01-11" },
      ]);
    }
  }, []);

  // compute lottery tickets whenever leaderboard entries change
  const { computeTickets } = useLottery();
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    // map entries to {id, score}
    const list = entries.map((e) => ({ id: e.name, name: e.name, score: e.score }));
    computeTickets(list, 5); // award tickets to top 5 by default
  }, [entries, computeTickets]);

  // open modal when a new draw occurs
  const { meta } = useLottery();
  const [modalOpen, setModalOpen] = useState(false);
  const lastDrawRef = useRef<number | null>(null);
  useEffect(() => {
    if (meta?.lastWinner && meta.lastWinner.drawAt) {
      if (lastDrawRef.current !== meta.lastWinner.drawAt) {
        lastDrawRef.current = meta.lastWinner.drawAt;
        setModalOpen(true);
      }
    }
  }, [meta?.lastWinner]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-gold fill-gold" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-ember" />;
    return <span className="text-muted-foreground font-bold">#{rank}</span>;
  };

  return (
    <div className="scroll-shell bg-gradient-to-b from-background via-background to-volcano-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-safe pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mt-4 whitespace-nowrap overflow-hidden">
          <Button onClick={onBack} className="btn-pixel btn-pixel--sm flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-bold text-primary stage-title title-tight flex items-center gap-2 flex-shrink min-w-0">
            <Trophy className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">LEADERBOARD</span>
          </h2>
        </div>

        {/* Leaderboard list */}
        <Card className="bg-background/95 backdrop-blur-sm border-4 border-primary p-6">
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between p-4 rounded border-2 transition-all hover:scale-105 will-transform ${
                  entry.rank <= 3
                    ? "border-primary bg-card"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 flex items-center justify-center">
                    {getMedalIcon(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{entry.name} <LotteryBadge playerId={entry.name} className="ml-2" /></p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{entry.score}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>

          {entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No scores yet. Be the first!</p>
            </div>
          )}
        </Card>
      </div>
      <div className="scroll-fade-bottom" />
      <LotteryModal open={modalOpen} winner={meta?.lastWinner ?? null} onClose={() => setModalOpen(false)} />
    </div>
  );
};
