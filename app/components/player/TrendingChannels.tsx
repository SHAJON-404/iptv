"use client";

import React from "react";
import Image from "next/image";
import { Flame, Play, Eye } from "lucide-react";
import { Channel } from "../../hooks/useIPTVPlaylists";

interface TrendingChannel {
  name: string;
  logo: string;
  url: string;
  group: string;
  viewers: number;
}

interface TrendingChannelsProps {
  topChannels: TrendingChannel[];
  selectedChannel: Channel | null;
  handleChannelSelect: (chan: Channel) => void;
}

export const TrendingChannels = React.memo(function TrendingChannels({
  topChannels,
  selectedChannel,
  handleChannelSelect,
}: TrendingChannelsProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handlePlayTrending = (ch: TrendingChannel) => {
    // Convert TrendingChannel representation back to standard Channel structure
    const channelToPlay: Channel = {
      id: `trending-${ch.name.replace(/\s+/g, "-").toLowerCase()}`,
      name: ch.name,
      logo: ch.logo,
      group: ch.group,
      url: ch.url,
    };
    handleChannelSelect(channelToPlay);
  };

  if (!topChannels || topChannels.length === 0) {
    return (
      <div className="glass-card p-4 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center text-center lg:h-full min-h-[135px] lg:min-h-[250px] py-5 lg:py-0">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center mb-2">
          <Flame className="w-5 h-5 text-zinc-500" />
        </div>
        <p className="text-xs sm:text-sm font-bold text-zinc-400">No Trending Channels</p>
        <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 max-w-[180px] sm:max-w-[200px]">
          Trending channels will appear here once users start watching.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10 sm:border-white/5">
        <div className="relative">
          <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        </div>
        <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-white flex-1">
          Trending Now
        </h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400">
          Top 5
        </span>
      </div>

      {/* Desktop List Layout (shows as scrollable list) */}
      <div className="hidden lg:flex flex-col gap-2.5 flex-1 overflow-y-auto no-scrollbar">
        {topChannels.map((ch, idx) => {
          const isCurrent = selectedChannel?.name === ch.name;
          return (
            <button
              key={`${ch.name}-${idx}`}
              onClick={() => handlePlayTrending(ch)}
              className={`group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 text-left border cursor-pointer w-full select-none ${
                isCurrent
                  ? "bg-primary/10 border-primary text-white"
                  : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/15 text-zinc-300 hover:text-white"
              }`}
            >
              {/* Index number badge */}
              <div className="text-xs font-black text-zinc-500 w-4 text-center">
                {idx + 1}
              </div>

              {/* Logo / Avatar */}
              {ch.logo ? (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 p-0.5 border border-white/10 flex-shrink-0">
                  <Image
                    src={ch.logo}
                    alt={ch.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center font-bold text-xs text-primary border border-primary/20 flex-shrink-0">
                  {getInitials(ch.name)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm font-bold truncate leading-tight group-hover:text-white transition-colors">
                  {ch.name}
                </h4>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {ch.group}
                </p>
              </div>

              {/* Live indicator / play action */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-lg select-none">
                  <Eye size={10} />
                  {ch.viewers}
                </span>
                <div className="w-4 h-4 flex items-center justify-center">
                  <Play
                    size={12}
                    className={`transition-all duration-300 ${
                      isCurrent 
                        ? "fill-primary text-primary animate-pulse opacity-100" 
                        : "text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:scale-110"
                    }`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile/Tablet Horizontal Scroll Layout */}
      <div className="flex lg:hidden overflow-x-auto pb-1 gap-3 no-scrollbar scroll-smooth">
        {topChannels.map((ch, idx) => {
          const isCurrent = selectedChannel?.name === ch.name;
          return (
            <button
              key={`${ch.name}-mobile-${idx}`}
              onClick={() => handlePlayTrending(ch)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left border cursor-pointer select-none ${
                topChannels.length === 1 
                  ? "w-full flex-1" 
                  : "flex-shrink-0 flex-1 min-w-[210px] max-w-[250px]"
              } ${
                isCurrent
                  ? "bg-primary/10 border-primary text-white"
                  : "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/15 text-zinc-300 hover:text-white"
              }`}
            >
              {/* Index number badge */}
              <div className="text-xs font-black text-zinc-500 w-4 text-center mr-0.5">
                {idx + 1}
              </div>

              {/* Logo container */}
              {ch.logo ? (
                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white/5 p-0.5 border border-white/10 flex-shrink-0">
                  <Image
                    src={ch.logo}
                    alt={ch.name}
                    width={36}
                    height={36}
                    unoptimized
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center font-bold text-xs text-primary border border-primary/20 flex-shrink-0">
                  {getInitials(ch.name)}
                </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-sm font-bold truncate leading-tight group-hover:text-white transition-colors">
                  {ch.name}
                </h4>
              </div>

              {/* Live count & Play button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-lg select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  {ch.viewers} live
                </span>
                <Play
                  size={12}
                  className={`text-primary flex-shrink-0 ${
                    isCurrent ? "opacity-100" : "opacity-40"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
