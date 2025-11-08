import React from "react";
import { useLottery } from "@/lib/useLottery";

interface Props {
  playerId: string;
  className?: string;
}

export const LotteryBadge = ({ playerId, className = "" }: Props) => {
  const { isTicketHolder } = useLottery();
  if (!isTicketHolder(playerId)) return null;
  return (
    <span
      className={`inline-flex items-center text-base ${className}`}
      role="img"
      aria-label="Mega Lottery ticket"
      title="Mega Lottery ticket"
    >
      🎟️
    </span>
  );
};

export default LotteryBadge;
