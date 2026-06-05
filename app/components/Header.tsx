"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import Image from "next/image";

import { FaGithub, FaTelegram, FaFacebook, FaYoutube } from "react-icons/fa6";

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
                <FaGithub className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </a>
              <a
                href="https://t.me/SHAJON"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-[#26A5E4] hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                title="Telegram Channel"
              >
                <FaTelegram className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </a>
              <a
                href="https://www.facebook.com/shahmakhdumshajonofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-[#1877F2] hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                title="Facebook Page"
              >
                <FaFacebook className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </a>
              <a
                href="https://youtube.com/@SHAJON-404"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-[#FF0000] hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200"
                title="YouTube Channel"
              >
                <FaYoutube className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
