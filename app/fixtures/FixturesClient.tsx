"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ListFilter,
  X,
} from "lucide-react";
import BackgroundScene from "../components/BackgroundScene";
import Header from "../components/Header";
import { getDhakaTodayDateString } from "./utils/helpers";
import { MatchCard } from "./components/MatchCard";
import { BracketMatchCard } from "./components/BracketMatchCard";
import {
  LeftConnector300,
  LeftConnector600,
  LeftConnector1200,
  RightConnector300,
  RightConnector600,
  RightConnector1200,
} from "./components/Connectors";

import { useFixtures } from "./hooks/useFixtures";

export default function FixturesClient() {
  const {
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
  } = useFixtures();

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

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex justify-center pt-2"
            >
              <button
                onClick={handleRetry}
                disabled={loading}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all text-xs font-bold text-primary hover:text-white cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                {loading ? "Fetching..." : "Fetch Latest Data"}
              </button>
            </motion.div>
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
                            className="w-full pl-10 pr-10 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary/50 text-white font-medium placeholder-zinc-500 transition-colors"
                          />
                          <AnimatePresence>
                            {searchQuery && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10"
                              >
                                <X size={14} />
                              </motion.button>
                            )}
                          </AnimatePresence>
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
                      <div className="hidden md:flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10 text-xs sm:text-sm font-bold text-white max-w-sm mx-auto animate-pulse">
                        <span>Swipe horizontally to view progression</span>
                        <ChevronRight size={14} />
                      </div>

                      {/* Horizontal Tree Scroll View - Desktop only */}
                      <div className="hidden md:flex relative overflow-x-auto py-6 custom-scrollbar no-scrollbar items-start select-none max-w-full gap-2">
                        {/* Round of 32 */}
                        <div className="flex flex-col min-w-[210px]">
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
                            Round of 32 (L)
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
                            Round of 16 (L)
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
                            Quarter-finals (L)
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
                            Semi-finals (L)
                          </div>
                          <div className="flex flex-col justify-around h-[1200px]">
                            <BracketMatchCard matchNum={101} match={getKnockoutMatch(101)} allMatches={processedMatches} standings={groupStandings} />
                          </div>
                        </div>

                        {/* Finals / Winner Area */}
                        <div className="flex flex-col min-w-[240px] px-2">
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-yellow-500 uppercase border border-yellow-500/30 rounded-xl bg-yellow-500/10 backdrop-blur-md shadow-lg shadow-yellow-500/10">
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
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
                          <div className="h-8 mb-4 flex items-center justify-center text-center font-black tracking-widest text-[10px] sm:text-xs text-primary uppercase border border-primary/30 rounded-xl bg-primary/10 backdrop-blur-md shadow-lg shadow-primary/10">
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
