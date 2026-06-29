"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Tv } from "lucide-react";
import { FaGithub, FaTelegram, FaFacebook, FaYoutube } from "react-icons/fa6";
import { Channel } from "../../hooks/useIPTVPlaylists";

interface ChannelStatsProps {
  selectedChannel: Channel | null;
  playerStatus: "idle" | "loading" | "playing" | "error";
  totalChannels: number;
}

export const ChannelStats = React.memo(function ChannelStats({
  selectedChannel,
  playerStatus,
  totalChannels,
}: ChannelStatsProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      {/* ─── DESKTOP UI LAYOUT (Visible on md screens and larger) ─── */}
      <div className="hidden md:grid grid-cols-3 gap-4 w-full">
        {/* Card 1: Channel Details */}
        {selectedChannel ? (
          <motion.div
            key={selectedChannel.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full ${playerStatus === "loading" ? "animate-pulse" : ""
              }`}
          >
            {selectedChannel.logo ? (
              <Image
                src={selectedChannel.logo}
                alt={selectedChannel.name}
                width={56}
                height={56}
                unoptimized
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-xl sm:rounded-2xl bg-white/5 p-0.5 sm:p-1 border border-white/10 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center font-bold text-sm sm:text-base text-primary border border-primary/20 flex-shrink-0">
                {getInitials(selectedChannel.name)}
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">
                {selectedChannel.name}
              </h2>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded border border-primary/20 block w-fit">
                {selectedChannel.group}
              </span>
            </div>
          </motion.div>
        ) : (
          <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center">
              <Tv size={20} className="text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-300">Select a Channel</h2>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Choose from the list below
              </span>
            </div>
          </div>
        )}

        {/* Card 2: Developer Info */}
        <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-between gap-4 text-left bg-white/[0.01] w-full">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white/15 shadow-md">
                <Image
                  src="https://avatars.githubusercontent.com/u/171383675?v=4"
                  alt="S. SHAJON"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070414] z-10 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                S. SHAJON
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <a
                  href="https://github.com/SHAJON-404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-white transition-colors"
                  title="GitHub"
                >
                  <FaGithub size={18} />
                </a>
                <a
                  href="https://t.me/shajonOTT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-[#26A5E4] transition-colors"
                  title="Telegram"
                >
                  <FaTelegram size={18} />
                </a>
                <a
                  href="https://www.facebook.com/shahmakhdumshajonofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-[#1877F2] transition-colors"
                  title="Facebook"
                >
                  <FaFacebook size={18} />
                </a>
                <a
                  href="https://youtube.com/@SHAJON-404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-[#FF0000] transition-colors"
                  title="YouTube"
                >
                  <FaYoutube size={18} />
                </a>
              </div>
            </div>
          </div>

          <div className="hidden xs:block h-10 w-[1px] bg-white/10 flex-shrink-0" />

          <p className="text-[10px] sm:text-[10.5px] leading-normal text-zinc-400 font-medium select-text flex-1 pl-1 min-w-[120px]">
            For any support, contact via{" "}
            <a
              href="https://t.me/shajonOTT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#26A5E4] font-bold hover:underline"
            >
              Telegram only
            </a>
            . Follow GitHub for updates!
          </p>
        </div>

        {/* Card 3: Channel Count */}
        <div className="glass-card p-4 sm:p-6 border border-white/10 sm:border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Tv size={20} className="animate-pulse" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-zinc-400 truncate">
              Total Channels
            </p>
            <h3 className="text-base sm:text-lg font-bold text-emerald-400 truncate">
              {totalChannels} Channels
            </h3>
          </div>
        </div>
      </div>

      {/* ─── MOBILE UI LAYOUT (Visible on mobile/tablet screens only) ─── */}
      <div className="grid grid-cols-1 gap-4 w-full md:hidden">
        <div className={`glass-card p-3 border border-white/10 rounded-2xl bg-white/[0.01] w-full flex items-center ${playerStatus === "loading" ? "animate-pulse" : ""
          }`}>
          {/* Left Side: Channel details (65% width) */}
          <div className="w-[65%] flex items-center gap-3 min-w-0 border-r border-white/10 pr-3">
            {selectedChannel ? (
              <motion.div
                key={selectedChannel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2.5 min-w-0 w-full"
              >
                {selectedChannel.logo ? (
                  <Image
                    src={selectedChannel.logo}
                    alt={selectedChannel.name}
                    width={40}
                    height={40}
                    unoptimized
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                    className="w-10 h-10 object-contain rounded-xl bg-white/5 p-0.5 border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center font-bold text-xs text-primary border border-primary/20 flex-shrink-0">
                    {getInitials(selectedChannel.name)}
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-sm font-black truncate leading-tight">
                    {selectedChannel.name}
                  </h2>
                  <span className="text-[8px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/20 block w-fit">
                    {selectedChannel.group}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 w-full">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center">
                  <Tv size={18} className="text-primary" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h2 className="text-sm font-black text-white leading-tight">Select Channel</h2>
                  <span className="text-[9px] font-semibold text-zinc-400">
                    Choose below
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Total Count (35% width) */}
          <div className="w-[35%] flex items-center gap-2 min-w-0 pl-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <Tv size={15} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                Channels
              </p>
              <h3 className="text-sm font-black text-emerald-400 truncate">
                {totalChannels}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
