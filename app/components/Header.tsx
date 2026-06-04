"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import Image from "next/image";

const GithubIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const TelegramIcon = ({ size = 13, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-[#070414]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl shadow-black/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 sm:h-26">
          {/* Logo & Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-3 sm:gap-4.5"
          >
            <div className="relative w-12 h-12 sm:w-15 sm:h-15 rounded-2xl overflow-hidden border border-white/15 shadow-xl shadow-primary/20 bg-white/5 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="IPTV Player Logo"
                fill
                sizes="(max-width: 640px) 48px, 60px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  IP
                </span>
                <span className="text-2xl sm:text-4xl font-black tracking-tight gradient-text">
                  TV Player
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                  LIVE BROADCAST
                </span>
              </div>
            </div>
          </motion.div>

          {/* Permanent Developer glass-card (Visible on both Mobile and Desktop) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden sm:flex items-center gap-3 sm:gap-4 pl-3.5 pr-2.5 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-md shadow-xl shadow-black/20 transition-all duration-300"
          >
            {/* Developer Avatar */}
            <div className="relative flex-shrink-0">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-white/15 shadow-md">
                <Image
                  src="https://avatars.githubusercontent.com/u/171383675?v=4"
                  alt="S. SHAJON Avatar"
                  fill
                  sizes="(max-width: 640px) 36px, 44px"
                  className="object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070414] z-10 animate-pulse" />
            </div>

            {/* Developer Name labels */}
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] font-extrabold tracking-widest uppercase text-gray-500 leading-none">
                DEVELOPER
              </span>
              <span className="text-sm sm:text-base font-black text-white leading-tight mt-1 font-sans">
                S. SHAJON
              </span>
            </div>

            {/* Separator Line */}
            <div className="h-8 sm:h-10 w-[1px] bg-white/10" />

            {/* Social Action Icon Links */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <a
                href="https://github.com/SHAJON-404"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                title="GitHub Profile"
              >
                <GithubIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              </a>
              <a
                href="https://t.me/SHAJON"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-[#26A5E4] hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                title="Telegram Channel"
              >
                <TelegramIcon size={15} className="sm:w-[17px] sm:h-[17px]" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
