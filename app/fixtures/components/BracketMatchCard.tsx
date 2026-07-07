import React from "react";
import { Clock } from "lucide-react";
import { Match, TeamStats } from "../types";
import { isWinner, resolveTeamName } from "../utils/helpers";
import { TeamFlag } from "./TeamFlag";

interface BracketMatchCardProps {
  matchNum: number;
  match?: Match;
  allMatches: Match[];
  standings: Record<string, TeamStats[]>;
}

export const BracketMatchCard = ({
  matchNum,
  match,
  allMatches,
  standings,
}: BracketMatchCardProps) => {
  if (!match) return <div className="w-[210px] p-3 border border-dashed border-white/20 rounded-xl bg-[#0c0824]/80 backdrop-blur-md text-xs font-semibold text-center text-zinc-400">Match {matchNum} Pending</div>;

  const hasPlayed = !!match.score;
  const score1 = hasPlayed ? (match.score?.et ? match.score.et[0] : match.score?.ft[0]) : "-";
  const score2 = hasPlayed ? (match.score?.et ? match.score.et[1] : match.score?.ft[1]) : "-";

  const displayTeam1 = resolveTeamName(match.team1, allMatches, standings);
  const displayTeam2 = resolveTeamName(match.team2, allMatches, standings);

  return (
    <div className="w-[210px] rounded-xl border transition-all duration-300 shadow-lg bg-[#0c0824]/90 backdrop-blur-md border-white/20 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:-translate-y-0.5">
      {/* Match Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 bg-white/[0.04] text-[9px] font-bold text-zinc-300">
        <span className="text-primary">Match {match.num}</span>
        <span className="truncate max-w-[100px] text-zinc-400">{match.ground.split(" (")[0]}</span>
      </div>

      {/* Teams List */}
      <div className="p-2.5 space-y-2">
        {/* Team 1 */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${hasPlayed && !isWinner(match, 1) ? "text-zinc-500" : "text-zinc-100"}`}>
            <TeamFlag teamName={displayTeam1} className="w-5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{displayTeam1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasPlayed && match.score?.p && (
              <span className="text-[10px] text-zinc-400 font-bold">({match.score.p[0]})</span>
            )}
            <span className={`font-black px-1.5 py-0.5 rounded-sm bg-white/[0.08] ${hasPlayed && isWinner(match, 1) ? "text-emerald-400" : "text-zinc-200"}`}>
              {score1}
            </span>
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${hasPlayed && !isWinner(match, 2) ? "text-zinc-500" : "text-zinc-100"}`}>
            <TeamFlag teamName={displayTeam2} className="w-5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{displayTeam2}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasPlayed && match.score?.p && (
              <span className="text-[10px] text-zinc-400 font-bold">({match.score.p[1]})</span>
            )}
            <span className={`font-black px-1.5 py-0.5 rounded-sm bg-white/[0.08] ${hasPlayed && isWinner(match, 2) ? "text-emerald-400" : "text-zinc-200"}`}>
              {score2}
            </span>
          </div>
        </div>
      </div>

      {/* Match DateTime */}
      <div className="flex items-center gap-1 border-t border-white/10 px-3 py-1.5 bg-white/[0.04] text-[8px] font-semibold text-zinc-300">
        <Clock size={8} className="text-primary flex-shrink-0" />
        <span className="truncate">
          {match.formattedDateTime
            ? match.formattedDateTime.replace(/^[A-Za-z]+, /, "").replace(/ \d{4} at/, ",")
            : `${match.date} ${match.time}`}
        </span>
      </div>
    </div>
  );
};
