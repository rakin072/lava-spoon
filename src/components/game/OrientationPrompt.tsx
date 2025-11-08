import React from "react";

interface OrientationPromptProps {
  show: boolean;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({ show }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="bg-card border-4 border-primary max-w-sm w-full p-6 text-center space-y-4 animate-slide-in">
        <h2 className="text-xl font-bold">Rotate for Best Experience</h2>
        <p className="text-sm leading-relaxed">
          Landscape mode gives you a wider view of falling collectibles and keeps the HUD visible.
        </p>
        <p className="text-xs opacity-70">
          (If you prefer portrait you can continue — gameplay still works.)
        </p>
      </div>
    </div>
  );
};
