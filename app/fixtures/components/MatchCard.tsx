import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock, MapPin } from "lucide-react";
import { Match } from "../types";
import { isWinner } from "../utils/helpers";
import { TeamFlag } from "./TeamFlag";

interface MatchCardProps {
  match: Match;
  idx: number;
  isToday?: boolean;
}

export const MatchCard = ({ match, idx, isToday = false }: MatchCardProps) => {
  const hasPlayed = !!match.score;
  const score1 = hasPlayed ? match.score?.ft[0] : "-";
  const score2 = hasPlayed ? match.score?.ft[1] : "-";

  const [timeStatus, setTimeStatus] = useState<{
    label: string;
    isLive: boolean;
    isFuture: boolean;
    isFinished: boolean;
  } | null>(null);

  useEffect(() => {
    if (!match.date || !match.time) return;

    const parseMatchDate = () => {
      const timeMatch = match.time.match(/(\d{2}):(\d{2})\s+(AM|PM)/);
      if (!timeMatch) return null;
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      return new Date(`${match.date}T${hh}:${mm}:00+06:00`);
    };

    const matchDate = parseMatchDate();
    if (!matchDate) return;

    const updateStatus = () => {
      const now = new Date();
      const diffMs = matchDate.getTime() - now.getTime();

      if (diffMs > 0) {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        let label = "Starts In ";
        if (d > 0) label += `${d}D `;
        if (h > 0) label += `${h}H `;
        label += `${m} Min`;
        setTimeStatus({ label, isLive: false, isFuture: true, isFinished: false });
      } else if (diffMs <= 0 && diffMs > -120 * 60 * 1000) {
        setTimeStatus({ label: "Ongoing Live", isLive: true, isFuture: false, isFinished: false });
      } else {
        setTimeStatus({ label: "Finished", isLive: false, isFuture: false, isFinished: true });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [match.date, match.time]);

  return (
    <motion.div
      key={`${match.num || idx}-${match.team1}-${match.team2}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.4) }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col h-full ${
        timeStatus?.isLive
          ? "bg-linear-to-b from-[#0a1f15]/95 to-[#0c0824]/98 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20"
          : isToday
            ? "bg-linear-to-b from-[#150e3d]/90 to-[#0c0824]/98 border-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.15)] ring-1 ring-primary/20"
            : "bg-linear-to-b from-[#150e3d]/50 to-[#0c0824]/60 border-white/10 hover:border-white/20 hover:from-[#150e3d]/70 hover:to-[#0c0824]/80"
      }`}
    >
      {/* Status Banner — prominent full-width strip at the top */}
      {timeStatus && (
        <div className={`w-full px-4 py-2 sm:py-2.5 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-extrabold tracking-wider ${
          timeStatus.isLive
            ? "bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/20"
            : timeStatus.isFuture
              ? "bg-amber-500/10 text-amber-400 border-b border-amber-500/15"
              : "bg-zinc-500/10 text-zinc-500 border-b border-zinc-500/10"
        }`}>
          {timeStatus.isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          {timeStatus.isFuture && (
            <Clock size={13} className="text-amber-400" />
          )}
          {timeStatus.label}
        </div>
      )}

      <div className="flex flex-col gap-3.5 flex-grow p-4 sm:p-5">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-bold text-zinc-400 mt-1">
            <span className="text-primary">{match.round}</span>
            {match.group && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300">{match.group}</span>
              </>
            )}
            {match.num && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300">Match {match.num}</span>
              </>
            )}
          </div>
          <div className="flex flex-col items-end text-right flex-shrink-0">
             <div className="text-sm sm:text-base text-white font-black flex items-center gap-1.5 tracking-tight">
               <Clock size={14} className="text-primary" />
               {match.formattedDateTime ? match.formattedDateTime.split(" at ")[1] : match.time}
             </div>
             <div className="text-[9px] sm:text-[10px] text-zinc-400 font-semibold mt-0.5">
               {match.formattedDateTime ? match.formattedDateTime.split(" at ")[0] : match.date}
             </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="space-y-3">
          {/* Team 1 Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3">
                <TeamFlag teamName={match.team1} className="w-7 h-5 flex-shrink-0" />
                <span className={`text-sm sm:text-base font-bold ${hasPlayed && !isWinner(match, 1) ? "text-zinc-500" : "text-white"} truncate`}>
                  {match.team1}
                </span>
              </div>
              {/* Scorers for Team 1 */}
              {hasPlayed && match.goals1 && match.goals1.length > 0 && (
                <div className="pl-10 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-400 font-medium">
                  {match.goals1.map((g, i) => (
                    <span key={i} className="flex items-center gap-0.5 whitespace-nowrap">
                      <span className="text-[9px] text-zinc-500">⚽</span>
                      <span>{g.name} ({g.minute}&apos;){g.penalty && " (P)"}{g.owngoal && " (OG)"}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center border font-black text-sm sm:text-base flex-shrink-0 transition-all duration-300 ${
              hasPlayed
                ? (isWinner(match, 1) ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/[0.02] text-zinc-400")
                : "border-white/5 bg-white/[0.01] text-zinc-600"
            }`}>
              {score1}
            </span>
          </div>

          {/* Team 2 Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3">
                <TeamFlag teamName={match.team2} className="w-7 h-5 flex-shrink-0" />
                <span className={`text-sm sm:text-base font-bold ${hasPlayed && !isWinner(match, 2) ? "text-zinc-500" : "text-white"} truncate`}>
                  {match.team2}
                </span>
              </div>
              {/* Scorers for Team 2 */}
              {hasPlayed && match.goals2 && match.goals2.length > 0 && (
                <div className="pl-10 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-400 font-medium">
                  {match.goals2.map((g, i) => (
                    <span key={i} className="flex items-center gap-0.5 whitespace-nowrap">
                      <span className="text-[9px] text-zinc-500">⚽</span>
                      <span>{g.name} ({g.minute}&apos;){g.penalty && " (P)"}{g.owngoal && " (OG)"}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center border font-black text-sm sm:text-base flex-shrink-0 transition-all duration-300 ${
              hasPlayed
                ? (isWinner(match, 2) ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/[0.02] text-zinc-400")
                : "border-white/5 bg-white/[0.01] text-zinc-600"
            }`}>
              {score2}
            </span>
          </div>
        </div>

      </div>

      {/* Footer Row */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 mt-auto flex items-center justify-between text-[10px] sm:text-xs font-semibold text-zinc-400">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-primary" />
          <span className="truncate">{match.ground}</span>
        </div>
        
        {isToday && (
          <Link
            href="/"
            className="flex items-center gap-1 bg-primary hover:bg-primary-dark text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/20 cursor-pointer flex-shrink-0 ml-2"
          >
            <span className="relative flex h-1.5 w-1.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            Watch Live Stream
          </Link>
        )}
      </div>
    </motion.div>
  );
};
