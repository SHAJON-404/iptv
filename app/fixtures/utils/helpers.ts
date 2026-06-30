import { Match, TeamStats } from "../types";

export function convertTimeToDhaka(dateStr: string, timeStr: string): { date: string; time: string; formattedDateTime: string; timestamp: number } {
  if (!dateStr || !timeStr) {
    return { date: dateStr, time: timeStr, formattedDateTime: "", timestamp: 0 };
  }

  const match = timeStr.match(/(\d{2}):(\d{2})\s+UTC(?:([+-]\d+))?/);
  if (!match) {
    return { date: dateStr, time: timeStr, formattedDateTime: `${dateStr} ${timeStr}`, timestamp: 0 };
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

  return { date: newDate, time: newTime, formattedDateTime, timestamp: dt.getTime() };
}

export const isWinner = (match: Match, teamIndex: 1 | 2) => {
  if (!match.score) return false;
  
  // 1. Check penalties first if they exist
  if (match.score.p) {
    if (teamIndex === 1) return match.score.p[0] > match.score.p[1];
    return match.score.p[1] > match.score.p[0];
  }
  
  // 2. Check extra time if it exists
  if (match.score.et) {
    if (teamIndex === 1) return match.score.et[0] > match.score.et[1];
    return match.score.et[1] > match.score.et[0];
  }
  
  // 3. Otherwise check full time
  const scores = match.score.ft;
  if (teamIndex === 1) return scores[0] > scores[1];
  return scores[1] > scores[0];
};

export const calculateGroupStandings = (matches: Match[]): Record<string, TeamStats[]> => {
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

export const isGroupComplete = (groupName: string, standings: Record<string, TeamStats[]>): boolean => {
  const groupStandings = standings[groupName];
  if (!groupStandings) return false;
  const totalTeamPlayed = groupStandings.reduce((sum, team) => sum + team.played, 0);
  return totalTeamPlayed === 12;
};

export const getTeamByStanding = (placeholder: string, standings: Record<string, TeamStats[]>): string => {
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

export const getBestThirdPlaceTeam = (placeholder: string, standings: Record<string, TeamStats[]>): string => {
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

export const resolveTeamName = (
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
        if (isWinner(prevMatch, 1)) {
          return resolveTeamName(prevMatch.team1, matches, standings);
        } else if (isWinner(prevMatch, 2)) {
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
        if (isWinner(prevMatch, 2)) {
          return resolveTeamName(prevMatch.team1, matches, standings);
        } else if (isWinner(prevMatch, 1)) {
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

export const getDhakaTodayDateString = () => {
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
