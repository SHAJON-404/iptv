"use client";

import React from "react";
import Image from "next/image";
import { Search, X, Play, ChevronsRight } from "lucide-react";
import { Channel } from "../../hooks/useIPTVPlaylists";

interface ChannelListViewProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  visibleChannels: Channel[];
  filteredChannelsCount: number;
  loading: boolean;
  selectedChannel: Channel | null;
  handleChannelSelect: (chan: Channel) => void;
  displayCount: number;
  setDisplayCount: React.Dispatch<React.SetStateAction<number>>;
  hasMore: boolean;
}

export const ChannelListView = React.memo(function ChannelListView({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  visibleChannels,
  filteredChannelsCount,
  loading,
  selectedChannel,
  handleChannelSelect,
  displayCount,
  setDisplayCount,
  hasMore,
}: ChannelListViewProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery]);

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 border-b border-white/10 sm:border-white/5">
        <div className="relative flex items-center bg-white/5 border border-white/10 sm:border-white/5 focus-within:border-primary/50 rounded-xl sm:rounded-2xl p-1 transition-colors">
          <Search className="text-zinc-400 ml-2.5 sm:ml-3" size={15} />
          <input
            type="text"
            placeholder="Search live TV..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setDisplayCount(80);
            }}
            className="flex-1 bg-transparent border-none outline-none py-1.5 sm:py-2 px-2.5 sm:px-3 text-sm text-white placeholder:text-zinc-400"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                setSearchQuery("");
                setDisplayCount(80);
              }}
              className="p-1.5 mr-1 sm:mr-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
              title="Clear Search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Categories horizontally scrollable */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setDisplayCount(80);
              }}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap border transition-all ${
                selectedCategory === cat
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 border-white/10 sm:border-white/5 text-zinc-300 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List styled as a responsive grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-3 sm:pt-4 pr-1 custom-scrollbar">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 sm:border-white/5 animate-pulse"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10" />
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <div className="h-2.5 sm:h-3 w-1/3 bg-white/10 rounded" />
                  <div className="h-3.5 sm:h-4 w-2/3 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChannelsCount === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm font-medium">
            No channels found match your filters.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleChannels.map((chan) => {
                const isSelected = selectedChannel?.id === chan.id;
                return (
                  <button
                    key={chan.id}
                    onClick={() => handleChannelSelect(chan)}
                    className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all group ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white/[0.02] border-white/10 sm:border-white/5 text-white hover:bg-white/[0.05] hover:border-white/10"
                    }`}
                  >
                    {chan.logo ? (
                      <Image
                        src={chan.logo}
                        alt={chan.name}
                        width={40}
                        height={40}
                        unoptimized
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                        className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg sm:rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-white/5 to-white/10 flex items-center justify-center font-bold text-xs border border-white/10 text-zinc-300 group-hover:text-white transition-colors">
                        {getInitials(chan.name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                          isSelected ? "text-primary/75" : "text-zinc-400"
                        }`}
                      >
                        {chan.group}
                      </p>
                      <p className="text-[13px] sm:text-sm font-bold truncate">
                        {chan.name}
                      </p>
                    </div>

                    {isSelected && (
                      <Play
                        size={13}
                        className="sm:w-3.5 sm:h-3.5 fill-primary text-primary animate-pulse"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 80)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs sm:text-sm font-bold text-zinc-300 hover:text-white hover:bg-white/[0.08] hover:border-white/10 transition-all active:scale-95"
                >
                  <ChevronsRight size={14} className="rotate-90" />
                  <span>Load More ({filteredChannelsCount - displayCount} remaining)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});
