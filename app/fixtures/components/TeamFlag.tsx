import React from "react";
import Flag from "react-world-flags";
import { COUNTRY_CODES } from "../utils/constants";

export const TeamFlag = ({ teamName, className = "w-6 h-4" }: { teamName: string; className?: string }) => {
  const code = COUNTRY_CODES[teamName];

  if (code) {
    return (
      <div className={`relative overflow-hidden rounded-[3px] border border-white/10 ${className}`}>
        <Flag code={code} className="object-cover w-full h-full" />
      </div>
    );
  }

  // Muted text code for bracket placeholders (e.g. Winner Match 74 -> WIN)
  const codeText = teamName.startsWith("Winner")
    ? "WIN"
    : teamName.startsWith("Runner")
      ? "RUN"
      : teamName.startsWith("3rd")
        ? "3RD"
        : teamName.startsWith("Loser")
          ? "LOS"
          : teamName.substring(0, 3).toUpperCase();

  return (
    <div className={`flex items-center justify-center bg-white/10 text-white/50 border border-white/10 rounded-[3px] font-black text-[9px] ${className}`}>
      {codeText}
    </div>
  );
};
