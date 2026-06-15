"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Calendar,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  ChevronRight,
  ListFilter,
} from "lucide-react";
import BackgroundScene from "../components/BackgroundScene";
import Header from "../components/Header";

// Type declarations
interface GoalScorer {
  name: string;
  minute: string;
  penalty?: boolean;
  owngoal?: boolean;
}

interface MatchScore {
  ft: [number, number];
  ht: [number, number];
}

interface Match {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: MatchScore;
  goals1?: GoalScorer[];
  goals2?: GoalScorer[];
  group?: string;
  ground: string;
  originalDate?: string;
  originalTime?: string;
  formattedDateTime?: string;
}

interface WorldCupData {
  name: string;
  matches: Match[];
}

interface FixturesClientProps {
  initialData: WorldCupData | null;
}

// 2-Letter ISO Country Mappings for FlagCDN
const COUNTRY_CODES: Record<string, string> = {
  // Group A
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  // Group B
  "Canada": "ca",
  "Bosnia & Herzegovina": "ba",
  "Qatar": "qa",
  "Switzerland": "ch",
  // Group C
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  // Group D
  "USA": "us",
  "Paraguay": "py",
  "Australia": "au",
  "Turkey": "tr",
  // Group E
  "Germany": "de",
  "Curaçao": "cw",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  // Group F
  "Netherlands": "nl",
  "Japan": "jp",
  "Sweden": "se",
  "Tunisia": "tn",
  // Group G
  "Belgium": "be",
  "Egypt": "eg",
  "Iran": "ir",
  "New Zealand": "nz",
  // Group H
  "Spain": "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  "Uruguay": "uy",
  // Group I
  "France": "fr",
  "Senegal": "sn",
  "Iraq": "iq",
  "Norway": "no",
  // Group J
  "Argentina": "ar",
  "Algeria": "dz",
  "Austria": "at",
  "Jordan": "jo",
  // Group K
  "Portugal": "pt",
  "DR Congo": "cd",
  "Uzbekistan": "uz",
  "Colombia": "co",
  // Group L
  "England": "gb-eng",
  "Croatia": "hr",
  "Ghana": "gh",
  "Panama": "pa",
};

// Timezone Conversion logic
function convertTimeToDhaka(dateStr: string, timeStr: string): { date: string; time: string; formattedDateTime: string } {
  if (!dateStr || !timeStr) {
    return { date: dateStr, time: timeStr, formattedDateTime: "" };
  }

  const match = timeStr.match(/(\d{2}):(\d{2})\s+UTC(?:([+-]\d+))?/);
  if (!match) {
    return { date: dateStr, time: timeStr, formattedDateTime: `${dateStr} ${timeStr}` };
  }

  const offsetHours = match[3] ? parseInt(match[3], 10) : 0;

  // Setup Date in UTC
  const dt = new Date(`${dateStr}T${match[1]}:${match[2]}:00Z`);
  // Subtract offset to get back to UTC (e.g. if original is UTC-6, we subtract -6 i.e. add 6 hours to get UTC time)
  dt.setUTCHours(dt.getUTCHours() - offsetHours);

  // Convert to Dhaka (UTC+6)
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const dhakaTime = new Date(dt.getTime() + dhakaOffsetMs);

  // Formatting date
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const dayName = days[dhakaTime.getUTCDay()];
  const monthName = months[dhakaTime.getUTCMonth()];
  const dateNum = dhakaTime.getUTCDate();
  const year = dhakaTime.getUTCFullYear();
  
  const yyyy = dhakaTime.getUTCFullYear();
  const mm = String(dhakaTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dhakaTime.getUTCDate()).padStart(2, '0');
  
  const newDate = `${yyyy}-${mm}-${dd}`;
  
  const hours24 = dhakaTime.getUTCHours();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  
  const newHours = String(hours12).padStart(2, '0');
  const newMinutes = String(dhakaTime.getUTCMinutes()).padStart(2, '0');
  const newTime = `${newHours}:${newMinutes} ${ampm} UTC+6`;

  const formattedDateTime = `${dayName}, ${dateNum} ${monthName} ${year} at ${newHours}:${newMinutes} ${ampm} (BST)`;

  return { date: newDate, time: newTime, formattedDateTime };
}

// Flag URL Helper
const getFlagUrl = (teamName: string) => {
  const code = COUNTRY_CODES[teamName];
  if (code) {
    return `https://flagcdn.com/w40/${code}.png`;
  }
  return null;
};

// Render a Flag or Placeholder
const TeamFlag = ({ teamName, className = "w-6 h-4" }: { teamName: string; className?: string }) => {
  const flagUrl = getFlagUrl(teamName);
  if (flagUrl) {
    return (
      <div className={`relative overflow-hidden rounded-[3px] border border-white/10 ${className}`}>
        <Image
          src={flagUrl}
          alt={`${teamName} flag`}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
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
    <div className={`flex items-center justify-center bg-white/10 text-white/50 border border-white/10 rounded-[3px] font-black text-[9px] uppercase ${className}`}>
      {codeText}
    </div>
  );
};

// Helper to check if a team won the match
const isWinner = (match: Match, teamIndex: 1 | 2) => {
  if (!match.score) return false;
  const scores = match.score.ft;
  if (teamIndex === 1) return scores[0] > scores[1];
  return scores[1] > scores[0];
};

// Tree view Y-bracket connector components showing match progression with arrows
const LeftConnector300 = () => (
  <div className="h-[300px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[300px]" viewBox="0 0 32 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,75 L16,75 L16,225 L0,225 M16,150 L28,150" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M26,146 L32,150 L26,154 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

const LeftConnector600 = () => (
  <div className="h-[600px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[600px]" viewBox="0 0 32 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,150 L16,150 L16,450 L0,450 M16,300 L28,300" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M26,296 L32,300 L26,304 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

const LeftConnector1200 = () => (
  <div className="h-[1200px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[1200px]" viewBox="0 0 32 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,300 L16,300 L16,900 L0,900 M16,600 L28,600" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M26,596 L32,600 L26,604 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

const RightConnector300 = () => (
  <div className="h-[300px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[300px]" viewBox="0 0 32 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32,75 L16,75 L16,225 L32,225 M16,150 L4,150" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M6,146 L0,150 L6,154 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

const RightConnector600 = () => (
  <div className="h-[600px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[600px]" viewBox="0 0 32 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32,150 L16,150 L16,450 L32,450 M16,300 L4,300" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M6,296 L0,300 L6,304 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

const RightConnector1200 = () => (
  <div className="h-[1200px] flex items-center justify-center w-8 select-none">
    <svg className="w-8 h-[1200px]" viewBox="0 0 32 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32,300 L16,300 L16,900 L32,900 M16,600 L4,600" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" />
      <path d="M6,596 L0,600 L6,604 Z" fill="rgba(139,92,246,0.45)" />
    </svg>
  </div>
);

interface TeamStats {
  team: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  played: number;
}

// Dynamically calculates group standings for all groups (A to L) from matches
const calculateGroupStandings = (matches: Match[]): Record<string, TeamStats[]> => {
  const standings: Record<string, TeamStats[]> = {};

  matches.forEach((match) => {
    // Only process group stage matches
    if (!match.group || !match.group.startsWith("Group ")) return;

    const group = match.group;
    if (!standings[group]) {
      standings[group] = [];
    }

    // Initialize team records in the group
    [match.team1, match.team2].forEach((team) => {
      if (!standings[group].some((s) => s.team === team)) {
        standings[group].push({
          team,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          played: 0,
        });
      }
    });

    // Process played matches
    if (match.score) {
      const score1 = match.score.ft[0];
      const score2 = match.score.ft[1];

      const team1Stats = standings[group].find((s) => s.team === match.team1);
      const team2Stats = standings[group].find((s) => s.team === match.team2);

      if (team1Stats && team2Stats) {
        team1Stats.played += 1;
        team2Stats.played += 1;
        team1Stats.goalsFor += score1;
        team1Stats.goalsAgainst += score2;
        team2Stats.goalsFor += score2;
        team2Stats.goalsAgainst += score1;
        team1Stats.goalDifference = team1Stats.goalsFor - team1Stats.goalsAgainst;
        team2Stats.goalDifference = team2Stats.goalsFor - team2Stats.goalsAgainst;

        if (score1 > score2) {
          team1Stats.points += 3;
        } else if (score2 > score1) {
          team2Stats.points += 3;
        } else {
          team1Stats.points += 1;
          team2Stats.points += 1;
        }
      }
    }
  });

  // Sort groups by FIFA criteria: Points -> Goal Difference -> Goals Scored -> Alphabetical
  Object.keys(standings).forEach((group) => {
    standings[group].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team);
    });
  });

  return standings;
};

// Helper to check if a group has finished all its matches (6 matches * 2 team entries = 12 total played entries in standings)
const isGroupComplete = (groupName: string, standings: Record<string, TeamStats[]>): boolean => {
  const groupStandings = standings[groupName];
  if (!groupStandings) return false;
  const totalTeamPlayed = groupStandings.reduce((sum, team) => sum + team.played, 0);
  return totalTeamPlayed === 12;
};

// Gets team name by position in group standings (e.g. 1A, 2B)
const getTeamByStanding = (placeholder: string, standings: Record<string, TeamStats[]>): string => {
  const match = placeholder.match(/^([12])([A-L])$/);
  if (match) {
    const groupName = `Group ${match[2]}`;
    if (!isGroupComplete(groupName, standings)) {
      return ""; // Group stage matches are incomplete, keep placeholder name
    }
    const rank = parseInt(match[1], 10) - 1; // 1 -> index 0, 2 -> index 1
    const groupStandings = standings[groupName];
    if (groupStandings && groupStandings[rank]) {
      return groupStandings[rank].team;
    }
  }
  return "";
};

// Gets the best third-placed team among candidate groups that hasn't qualified yet
const getBestThirdPlaceTeam = (placeholder: string, standings: Record<string, TeamStats[]>): string => {
  const groupLetters = placeholder.substring(1).split("/");
  const candidateTeams: TeamStats[] = [];

  for (const letter of groupLetters) {
    const groupName = `Group ${letter}`;
    if (!isGroupComplete(groupName, standings)) {
      return ""; // Keep placeholder if any of the candidate groups is incomplete
    }
    const groupStandings = standings[groupName];
    // Index 2 is the 3rd placed team in a 4-team group
    if (groupStandings && groupStandings[2]) {
      candidateTeams.push(groupStandings[2]);
    }
  }

  if (candidateTeams.length > 0) {
    candidateTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team);
    });
    return candidateTeams[0].team;
  }

  return "";
};

// Recursive helper to dynamically resolve upcoming bracket placeholders based on played matches
const resolveTeamName = (
  teamIdentifier: string,
  matches: Match[],
  standings: Record<string, TeamStats[]>
): string => {
  if (!teamIdentifier) return "";

  // 1. Resolve winner placeholder (e.g. W73)
  if (teamIdentifier.startsWith("W")) {
    const matchNum = parseInt(teamIdentifier.substring(1), 10);
    if (!isNaN(matchNum)) {
      const prevMatch = matches.find((m) => m.num === matchNum);
      if (prevMatch && prevMatch.score) {
        const score1 = prevMatch.score.ft[0];
        const score2 = prevMatch.score.ft[1];
        if (score1 > score2) {
          return resolveTeamName(prevMatch.team1, matches, standings);
        } else if (score2 > score1) {
          return resolveTeamName(prevMatch.team2, matches, standings);
        }
      }
      return `Winner Match ${matchNum}`;
    }
  }

  // 2. Resolve loser placeholder (e.g. L101)
  if (teamIdentifier.startsWith("L")) {
    const matchNum = parseInt(teamIdentifier.substring(1), 10);
    if (!isNaN(matchNum)) {
      const prevMatch = matches.find((m) => m.num === matchNum);
      if (prevMatch && prevMatch.score) {
        const score1 = prevMatch.score.ft[0];
        const score2 = prevMatch.score.ft[1];
        if (score1 < score2) {
          return resolveTeamName(prevMatch.team1, matches, standings);
        } else if (score2 < score1) {
          return resolveTeamName(prevMatch.team2, matches, standings);
        }
      }
      return `Loser Match ${matchNum}`;
    }
  }

  // 3. Resolve group winner/runner-up placeholders (e.g. 1A, 2B)
  const groupMatch = teamIdentifier.match(/^([12])([A-L])$/);
  if (groupMatch) {
    const resolved = getTeamByStanding(teamIdentifier, standings);
    if (resolved) return resolved;

    const position = groupMatch[1] === "1" ? "Winner" : "Runner-up";
    const groupName = groupMatch[2];
    return `${position} Group ${groupName}`;
  }

  // 4. Resolve 3rd place placeholders (e.g. 3A/B/C/D/F)
  if (teamIdentifier.startsWith("3")) {
    const resolved = getBestThirdPlaceTeam(teamIdentifier, standings);
    if (resolved) return resolved;

    return `3rd Place Group ${teamIdentifier.substring(1)}`;
  }

  // 5. Otherwise, it is a real country name
  return teamIdentifier;
};

// Single Match Card for Bracket View
const BracketMatchCard = ({
  matchNum,
  match,
  allMatches,
  standings,
}: {
  matchNum: number;
  match?: Match;
  allMatches: Match[];
  standings: Record<string, TeamStats[]>;
}) => {
  if (!match) return <div className="p-3 border border-dashed border-white/10 rounded-xl bg-white/[0.01] text-xs text-center text-zinc-500">Match {matchNum} Pending</div>;

  const hasPlayed = !!match.score;
  const score1 = hasPlayed ? match.score?.ft[0] : "-";
  const score2 = hasPlayed ? match.score?.ft[1] : "-";

  const displayTeam1 = resolveTeamName(match.team1, allMatches, standings);
  const displayTeam2 = resolveTeamName(match.team2, allMatches, standings);

  return (
    <div className="w-[210px] rounded-xl border transition-all duration-300 shadow-md bg-linear-to-b from-[#150e3d]/50 to-[#0c0824]/60 border-white/10 hover:border-white/20 hover:from-[#150e3d]/70 hover:to-[#0c0824]/80">
      {/* Match Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5 bg-white/[0.02] text-[9px] font-bold text-zinc-400">
        <span className="uppercase">Match {match.num}</span>
        <span className="truncate max-w-[100px]">{match.ground.split(" (")[0]}</span>
      </div>

      {/* Teams List */}
      <div className="p-2.5 space-y-2">
        {/* Team 1 */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${hasPlayed && !isWinner(match, 1) ? "text-zinc-500" : "text-white"}`}>
            <TeamFlag teamName={displayTeam1} className="w-5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{displayTeam1}</span>
          </div>
          <span className={`font-black px-1.5 py-0.5 rounded-sm bg-white/[0.04] ${hasPlayed && isWinner(match, 1) ? "text-emerald-400" : "text-zinc-300"}`}>
            {score1}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 font-bold ${hasPlayed && !isWinner(match, 2) ? "text-zinc-500" : "text-white"}`}>
            <TeamFlag teamName={displayTeam2} className="w-5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{displayTeam2}</span>
          </div>
          <span className={`font-black px-1.5 py-0.5 rounded-sm bg-white/[0.04] ${hasPlayed && isWinner(match, 2) ? "text-emerald-400" : "text-zinc-300"}`}>
            {score2}
          </span>
        </div>
      </div>

      {/* Match DateTime */}
      <div className="flex items-center gap-1 border-t border-white/5 px-3 py-1 bg-white/[0.01] text-[8px] font-semibold text-zinc-500">
        <Clock size={8} className="text-zinc-500" />
        <span className="truncate">{match.formattedDateTime?.split(" at ")[1] || match.time} (BST)</span>
      </div>
    </div>
  );
};

// Helper to get today's date in Asia/Dhaka timezone
const getDhakaTodayDateString = () => {
  try {
    const options = { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date()); // Returns "YYYY-MM-DD"
  } catch {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
};

interface MatchCardProps {
  match: Match;
  idx: number;
  isToday?: boolean;
}

const MatchCard = ({ match, idx, isToday = false }: MatchCardProps) => {
  const hasPlayed = !!match.score;
  const score1 = hasPlayed ? match.score?.ft[0] : "-";
  const score2 = hasPlayed ? match.score?.ft[1] : "-";

  return (
    <motion.div
      key={`${match.num || idx}-${match.team1}-${match.team2}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.4) }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-4 sm:p-5 flex flex-col h-full ${
        isToday
          ? "bg-linear-to-b from-[#150e3d]/90 to-[#0c0824]/98 border-primary/40 shadow-[0_0_25px_rgba(139,92,246,0.15)] ring-1 ring-primary/20"
          : "bg-linear-to-b from-[#150e3d]/50 to-[#0c0824]/60 border-white/10 hover:border-white/20 hover:from-[#150e3d]/70 hover:to-[#0c0824]/80"
      }`}
    >
      <div className="flex flex-col gap-3.5 flex-grow">
        {/* Top Meta Row */}
        <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-bold text-zinc-400 mt-1">
            {isToday && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md text-[9px] border border-red-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping animate-pulse" />
                TODAY
              </span>
            )}
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
      <div className="pt-2 mt-auto flex items-center justify-between text-[10px] sm:text-xs font-semibold text-zinc-400">
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

export default function FixturesClient({ initialData }: FixturesClientProps) {
  const [data, setData] = useState<WorldCupData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(initialData ? null : "Failed to load fixtures.");

  // Tabs: 'fixtures' or 'bracket'
  const [activeTab, setActiveTab] = useState<"fixtures" | "bracket">("fixtures");

  // Forces the bracket tab to revert to fixtures if resized to mobile width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && activeTab === "bracket") {
        setActiveTab("fixtures");
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // Filters for fixtures list
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "played" | "upcoming">("upcoming");

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch fixtures: ${res.status}`);
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to connect to the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // Convert time for all matches
  const processedMatches = data
    ? data.matches.map((match) => {
        const { date, time, formattedDateTime } = convertTimeToDhaka(match.date, match.time);
        return {
          ...match,
          originalDate: match.date,
          originalTime: match.time,
          date,
          time,
          formattedDateTime,
        };
      })
    : [];

  // Dynamically calculate group standings from matches to resolve placeholders in the bracket
  const groupStandings = calculateGroupStandings(processedMatches);

  // Group options in matches
  const groupOptions = [
    "All",
    "Group A", "Group B", "Group C", "Group D", "Group E", "Group F",
    "Group G", "Group H", "Group I", "Group J", "Group K", "Group L"
  ];

  // Filter matches based on criteria
  const filteredMatches = processedMatches.filter((match) => {
    // Search filter (handles team names, ground, round)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      match.team1.toLowerCase().includes(query) ||
      match.team2.toLowerCase().includes(query) ||
      match.ground.toLowerCase().includes(query) ||
      match.round.toLowerCase().includes(query);

    // Group filter
    const matchesGroup = selectedGroup === "All" || match.group === selectedGroup;

    // Status filter
    const hasScore = !!match.score;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "played" && hasScore) ||
      (statusFilter === "upcoming" && !hasScore);

    return matchesSearch && matchesGroup && matchesStatus;
  });

  // Knockout stage matches mapping for the bracket
  const getKnockoutMatch = (num: number) => {
    return processedMatches.find((m) => m.num === num);
  };

  // Build order for standard balanced tree layout
  // Left Side (Semi-final 101)
  const leftR32 = [74, 77, 73, 75, 83, 84, 81, 82];
  const leftR16 = [89, 90, 93, 94];
  const leftQF = [97, 98];

  // Right Side (Semi-final 102)
  const rightR32 = [76, 78, 79, 80, 86, 88, 85, 87];
  const rightR16 = [91, 92, 95, 96];
  const rightQF = [99, 100];

  return (
    <main className="relative min-h-screen text-white overflow-hidden pb-24 md:pb-8">
      <BackgroundScene />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          {/* Page Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-sm"
            >
              <Trophy size={14} className="text-yellow-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-yellow-500">
                FIFA World Cup 2026
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
            >
              Match Schedule & <span className="gradient-text">Results</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs sm:text-sm text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed"
            >
              All times mentioned here are in{" "}
              <span className="text-primary font-bold">Bangladesh Standard Time (Asia/Dhaka)</span>.
            </motion.p>
          </div>

          {/* Error View */}
          {error && (
            <div className="max-w-md mx-auto p-8 rounded-3xl border border-red-500/20 bg-red-950/20 backdrop-blur-md text-center space-y-6 animate-slide-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Unable to Fetch Schedule</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {loading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Main Loaded View */}
          {!error && data && (
            <div className="space-y-6">
              {/* Tabs Navigation (desktop only) */}
              <div className="hidden md:flex items-center justify-center p-1 rounded-2xl border border-white/10 bg-white/[0.02] max-w-sm mx-auto backdrop-blur-md">
                <button
                  onClick={() => setActiveTab("fixtures")}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${
                    activeTab === "fixtures"
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Fixtures & Results
                </button>
                <button
                  onClick={() => setActiveTab("bracket")}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all duration-300 cursor-pointer ${
                    activeTab === "bracket"
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Knockout Bracket
                </button>
              </div>

              {/* Loader */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <RefreshCw size={32} className="text-primary animate-spin" />
                  <span className="text-xs font-bold text-zinc-400">Updating matches schedule...</span>
                </div>
              )}

              {/* Tab Contents */}
              {!loading && (
                <AnimatePresence mode="wait">
                  {activeTab === "fixtures" ? (
                    <motion.div
                      key="fixtures"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Filtering Header Box */}
                      <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.015] backdrop-blur-md grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Search bar */}
                        <div className="relative md:col-span-2">
                          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search by team, venue, or round..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary/50 text-white font-medium placeholder-zinc-500"
                          />
                        </div>

                        {/* Group Selector */}
                        <div className="relative">
                          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-[#070414] border border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary/50 text-white font-semibold cursor-pointer appearance-none"
                          >
                            {groupOptions.map((g) => (
                              <option key={g} value={g} className="bg-[#0c0824]">
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Status filter selector */}
                        <div className="relative">
                          <ListFilter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as "all" | "played" | "upcoming")}
                            className="w-full pl-9 pr-3 py-2.5 bg-[#070414] border border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary/50 text-white font-semibold cursor-pointer appearance-none"
                          >
                            <option value="all" className="bg-[#0c0824]">Status: All Matches</option>
                            <option value="played" className="bg-[#0c0824]">Status: Played</option>
                            <option value="upcoming" className="bg-[#0c0824]">Status: Upcoming</option>
                          </select>
                        </div>
                      </div>

                      {filteredMatches.length === 0 ? (
                        <div className="text-center py-12 p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
                          <p className="text-sm font-semibold text-zinc-400">No matches found matching your filters.</p>
                        </div>
                      ) : (() => {
                        const dhakaToday = getDhakaTodayDateString();
                        const tomorrowDate = new Date(dhakaToday);
                        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                        const dhakaTomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

                        const todayMatches = filteredMatches.filter((m) => m.date === dhakaToday);
                        const tomorrowMatches = filteredMatches.filter((m) => m.date === dhakaTomorrow);
                        const otherMatches = filteredMatches.filter((m) => m.date !== dhakaToday && m.date !== dhakaTomorrow);

                        return (
                          <div className="space-y-8 animate-slide-in">
                            {/* Today's Matches Section */}
                            {todayMatches.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 w-fit">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                  <h3 className="text-[10px] sm:text-xs font-black tracking-widest text-red-400 uppercase">
                                    Today&apos;s Matches (BST)
                                  </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                  {todayMatches.map((match, idx) => (
                                    <MatchCard key={`today-${match.num || idx}`} match={match} idx={idx} isToday={true} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Tomorrow's Matches Section */}
                            {tomorrowMatches.length > 0 && (
                              <div className="space-y-4">
                                {todayMatches.length > 0 && (
                                  <div className="border-t border-white/5 pt-6"></div>
                                )}
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 w-fit">
                                  <h3 className="text-[10px] sm:text-xs font-black tracking-widest text-blue-400 uppercase">
                                    Tomorrow&apos;s Matches
                                  </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                  {tomorrowMatches.map((match, idx) => (
                                    <MatchCard key={`tomorrow-${match.num || idx}`} match={match} idx={idx} isToday={false} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* All Other Matches Section */}
                            <div className="space-y-4">
                              {(todayMatches.length > 0 || tomorrowMatches.length > 0) && (
                                <div className="flex items-center gap-2 border-t border-white/5 pt-6">
                                  <h3 className="text-[10px] sm:text-xs font-black tracking-widest text-zinc-400 uppercase">
                                    Other Fixtures & Results
                                  </h3>
                                </div>
                              )}
                              {otherMatches.length === 0 && (todayMatches.length > 0 || tomorrowMatches.length > 0) ? (
                                <div className="text-center py-8 p-6 rounded-2xl border border-white/5 bg-white/[0.005] text-xs font-semibold text-zinc-500">
                                  No other matches scheduled.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                  {otherMatches.map((match, idx) => (
                                    <MatchCard key={`other-${match.num || idx}`} match={match} idx={idx} isToday={false} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    /* TOURNAMENT BRACKET / TREE VIEW */
                    <motion.div
                      key="bracket"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Swipe Hint for mobile screens */}
                      <div className="hidden md:flex items-center justify-center gap-2 py-1 px-3.5 rounded-full border border-white/10 bg-white/[0.02] text-[10px] font-bold text-primary max-w-xs mx-auto animate-pulse">
                        <span>Swipe horizontally to view progression</span>
                        <ChevronRight size={10} />
                      </div>

                      {/* Horizontal Tree Scroll View - Desktop only */}
                      <div className="hidden md:flex relative overflow-x-auto py-6 custom-scrollbar no-scrollbar items-start select-none max-w-full gap-2">
                        {/* Round of 32 */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Round of 32
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {leftR32.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>

                        {/* Connectors 32 -> 16 */}
                        <div className="flex flex-col w-8">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <LeftConnector300 />
                            <LeftConnector300 />
                            <LeftConnector300 />
                            <LeftConnector300 />
                          </div>
                        </div>

                        {/* Round of 16 */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Round of 16
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {leftR16.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>

                        {/* Connectors 16 -> QF */}
                        <div className="flex flex-col w-8">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <LeftConnector600 />
                            <LeftConnector600 />
                          </div>
                        </div>

                        {/* Quarter-finals */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Quarter-finals
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {leftQF.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>

                        {/* Connectors QF -> SF */}
                        <div className="flex flex-col w-8">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <LeftConnector1200 />
                          </div>
                        </div>

                        {/* Semi-finals */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Semi-finals
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            <BracketMatchCard matchNum={101} match={getKnockoutMatch(101)} allMatches={processedMatches} standings={groupStandings} />
                          </div>
                        </div>

                        {/* Finals / Winner Area */}
                        <div className="flex flex-col min-w-[240px] px-2">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-yellow-500 uppercase border-b border-yellow-500/20 pb-2">
                            Finals
                          </div>
                          <div className="flex flex-col justify-center items-center h-[1200px] space-y-12">
                            {/* Champions Trophy */}
                            <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 text-center space-y-2.5 w-full">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/10">
                                <Trophy size={22} className="animate-bounce" />
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">FIFA Champions</h4>
                                <p className="text-[9px] text-zinc-400 font-semibold">Who will raise the Cup?</p>
                              </div>
                            </div>

                            {/* Final Match */}
                            <div className="w-full">
                              <div className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest text-center mb-1.5">Grand Final</div>
                              <BracketMatchCard matchNum={104} match={getKnockoutMatch(104)} allMatches={processedMatches} standings={groupStandings} />
                            </div>

                            {/* Third Place Match */}
                            <div className="w-full">
                              <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest text-center mb-1.5">Third Place Playoff</div>
                              <BracketMatchCard matchNum={103} match={getKnockoutMatch(103)} allMatches={processedMatches} standings={groupStandings} />
                            </div>
                          </div>
                        </div>

                        {/* Right Semi-finals */}
                        <div className="flex flex-col min-w-[210px] hidden lg:flex">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Semi-finals (R)
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            <BracketMatchCard matchNum={102} match={getKnockoutMatch(102)} allMatches={processedMatches} standings={groupStandings} />
                          </div>
                        </div>

                        {/* Connectors SF (R) -> QF (R) */}
                        <div className="flex flex-col w-8 hidden lg:flex">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <RightConnector1200 />
                          </div>
                        </div>

                        {/* Right Quarter-finals */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Quarter-finals (R)
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {rightQF.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>

                        {/* Connectors QF (R) -> 16 (R) */}
                        <div className="flex flex-col w-8">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <RightConnector600 />
                            <RightConnector600 />
                          </div>
                        </div>

                        {/* Right Round of 16 */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Round of 16 (R)
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {rightR16.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>

                        {/* Connectors 16 (R) -> 32 (R) */}
                        <div className="flex flex-col w-8">
                          <div className="h-8 mb-4"></div>
                          <div className="flex flex-col h-[1200px]">
                            <RightConnector300 />
                            <RightConnector300 />
                            <RightConnector300 />
                            <RightConnector300 />
                          </div>
                        </div>

                        {/* Right Round of 32 */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border-b border-primary/20 pb-2">
                            Round of 32 (R)
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            {rightR32.map((num) => (
                              <BracketMatchCard key={num} matchNum={num} match={getKnockoutMatch(num)} allMatches={processedMatches} standings={groupStandings} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
