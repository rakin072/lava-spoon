import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface Skin {
  id: number;
  name: string;
  description: string;
  unlocked: boolean;
  color: string;
  key: string; // storage key id (e.g., 'spoon', 'blob')
}

interface SkinsProps {
  onBack: () => void;
}

const availableSkins: Skin[] = [
  {
    id: 0,
    name: "Lava Spirit Blob",
    description: "Mischievous and bubbly",
    unlocked: true,
    color: "#FF4500",
    key: "blob",
  },
  {
    id: 1,
    name: "Golden Spoon",
    description: "The legendary golden spoon",
    unlocked: true,
    color: "#FFD700",
    key: "spoon",
  },
  {
    id: 2,
    name: "Ruby Spoon",
    description: "Forged in volcanic fire",
    unlocked: false,
    color: "#E91E63",
    key: "ruby",
  },
  {
    id: 3,
    name: "Crystal Spoon",
    description: "Mined from crystal caverns",
    unlocked: false,
    color: "#9C27B0",
    key: "crystal",
  },
  {
    id: 4,
    name: "Ember Spoon",
    description: "Glows with eternal flame",
    unlocked: false,
    color: "#FF6B35",
    key: "ember",
  },
];

export const Skins = ({ onBack }: SkinsProps) => {
  const [selectedSkinKey, setSelectedSkinKey] = useState<string>("spoon");

  useEffect(() => {
    try {
      const existing = localStorage.getItem("lavaLegendsSelectedSkin");
      if (existing) setSelectedSkinKey(existing);
    } catch {}
  }, []);

  return (
    <div className="scroll-shell bg-gradient-to-b from-background via-background to-volcano-dark p-4">
      <div className="max-w-4xl mx-auto space-y-6 pt-safe pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mt-4 whitespace-nowrap overflow-hidden">
          <Button onClick={onBack} className="btn-pixel btn-pixel--sm flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-bold text-primary stage-title title-tight flex items-center gap-2 flex-shrink min-w-0">
            <span className="truncate">SKINS</span>
          </h2>
        </div>

        {/* Skins grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableSkins.map((skin) => (
            <Card
              key={skin.id}
              className={`relative p-6 border-4 transition-all cursor-pointer will-transform ${
                selectedSkinKey === skin.key
                  ? "border-primary bg-card scale-105"
                  : skin.unlocked
                  ? "border-border bg-background/90 hover:scale-105"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
              onClick={() => skin.unlocked && setSelectedSkinKey(skin.key)}
            >
              {/* Lock/Selected indicator */}
              <div className="absolute top-3 right-3">
                {!skin.unlocked ? (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                ) : selectedSkinKey === skin.key ? (
                  <Check className="w-6 h-6 text-primary" />
                ) : null}
              </div>

              <div className="space-y-4">
                {/* Skin preview */}
                <div className="w-full aspect-square flex items-center justify-center will-transform">
                  {skin.key === "blob" ? (
                    <div className="w-20 h-20 rounded-full shadow-lg" style={{
                      background: `radial-gradient(circle at 50% 60%, #FF6347 0%, #FF4500 70%)`
                    }} />
                  ) : (
                    <div className="w-20 h-28 rounded-lg shadow-lg" style={{ backgroundColor: skin.color }} />
                  )}
                </div>

                {/* Skin info */}
                <div>
                  <h3 className="font-bold text-foreground mb-1">{skin.name}</h3>
                  <p className="text-xs text-muted-foreground">{skin.description}</p>
                </div>

                {/* Action button */}
                {skin.unlocked ? (
                  <Button
                    variant={selectedSkinKey === skin.key ? "default" : "secondary"}
                    className={`w-full btn-pixel text-sm py-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!skin.unlocked) return;
                      setSelectedSkinKey(skin.key);
                      try { localStorage.setItem('lavaLegendsSelectedSkin', skin.key); } catch {}
                    }}
                  >
                    {selectedSkinKey === skin.key ? "EQUIPPED" : "EQUIP"}
                  </Button>
                ) : (
                  <div className="text-center text-xs text-muted-foreground">
                    Unlock at 500 pts
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      <div className="scroll-fade-bottom" />
      </div>
    </div>
  );
};
