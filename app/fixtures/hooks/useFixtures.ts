import { useState, useEffect } from "react";
import { WorldCupData } from "../types";
import { convertTimeToDhaka, calculateGroupStandings, resolveTeamName } from "../utils/helpers";
import { COUNTRY_CODES } from "../utils/constants";

const CACHE_KEY = "worldcup_fixtures_data";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useFixtures() {
  const [data, setData] = useState<WorldCupData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'fixtures' or 'bracket'
  const [activeTab, setActiveTab] = useState<"fixtures" | "bracket">("fixtures");

  // Filters for fixtures list
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "played" | "upcoming">("upcoming");

  const fetchFixtures = async (force = false) => {
    try {
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, data: cachedData } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      setError(null);
      const url = "https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch fixtures: ${res.status}`);
      }
      const jsonData = await res.json();
      
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: jsonData
      }));
      setData(jsonData);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to connect to the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use setTimeout to avoid calling setState synchronously within the effect
    const timeoutId = setTimeout(() => {
      fetchFixtures();
    }, 0);
    const intervalId = setInterval(() => {
      fetchFixtures(true); // force refresh every 30 mins
    }, CACHE_DURATION);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const handleRetry = () => fetchFixtures(true);

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

  // Convert time for all matches
  const processedMatches = data
    ? data.matches.map((match) => {
        const { date, time, formattedDateTime, timestamp } = convertTimeToDhaka(match.date, match.time);
        return {
          ...match,
          originalDate: match.date,
          originalTime: match.time,
          date,
          time,
          formattedDateTime,
          timestamp,
        };
      })
    : [];

  // Dynamically calculate group standings from matches to resolve placeholders in the bracket
  const groupStandings = calculateGroupStandings(processedMatches);

  // Filter matches based on criteria and map to resolved names
  const filteredMatches = processedMatches
    .map((match) => {
      const resolvedTeam1 = resolveTeamName(match.team1, processedMatches, groupStandings);
      const resolvedTeam2 = resolveTeamName(match.team2, processedMatches, groupStandings);
      return {
        ...match,
        team1: resolvedTeam1,
        team2: resolvedTeam2,
      };
    })
    .filter((match) => {
      // Valid if both teams exist in COUNTRY_CODES
      const isValidMatch = !!COUNTRY_CODES[match.team1] && !!COUNTRY_CODES[match.team2];
      if (!isValidMatch) return false;

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
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Knockout stage matches mapping for the bracket
  const getKnockoutMatch = (num: number) => {
    return processedMatches.find((m) => m.num === num);
  };

  // Group options in matches
  const groupOptions = [
    "All",
    "Group A", "Group B", "Group C", "Group D", "Group E", "Group F",
    "Group G", "Group H", "Group I", "Group J", "Group K", "Group L"
  ];

  return {
    data,
    loading,
    error,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedGroup,
    setSelectedGroup,
    statusFilter,
    setStatusFilter,
    handleRetry,
    processedMatches,
    groupStandings,
    filteredMatches,
    getKnockoutMatch,
    groupOptions,
  };
}
