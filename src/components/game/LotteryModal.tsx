import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  winner: { id: string; name?: string; drawAt: number } | null;
  onClose: () => void;
}

export const LotteryModal = ({ open, winner, onClose }: Props) => {
  if (!open || !winner) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background border-4 border-primary p-6 rounded-md text-center">
        <h3 className="text-2xl font-bold text-primary mb-2">🎉 Mega Lottery Winner!</h3>
        <p className="text-lg font-mono text-foreground mb-4">{winner.name || winner.id}</p>
        <div className="space-x-2">
          <Button onClick={onClose} className="btn-pixel">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default LotteryModal;
