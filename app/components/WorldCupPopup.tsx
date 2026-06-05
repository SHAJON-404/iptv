"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Play } from "lucide-react";

interface WorldCupPopupProps {
  showPopup: boolean;
}

export default function WorldCupPopup({ showPopup }: WorldCupPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!showPopup) return;

    // Check if user has already dismissed the popup
    const isDismissed = localStorage.getItem("dismissed_world_cup_popup_2026");
    if (isDismissed !== "true") {
      // Delay showing the popup slightly for a premium feel
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showPopup]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("dismissed_world_cup_popup_2026", "true");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-[#070414]/90 backdrop-blur-lg"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.55, bounce: 0.15 }}
            className="relative w-full max-w-[92%] sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/10 bg-[#0c0824]/95 p-5 sm:p-8 shadow-[0_0_50px_rgba(234,179,8,0.15)] backdrop-blur-3xl"
          >
            {/* Ambient Background Lights */}
            <div className="absolute -top-24 -left-24 -z-10 h-48 w-48 rounded-full bg-yellow-500/15 blur-[64px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 -z-10 h-48 w-48 rounded-full bg-cyan-500/15 blur-[64px]" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Header / FIFA Logo */}
            <div className="flex flex-col items-center text-center">
              {/* Premium Badge for FIFA Logo */}
              <div className="relative mb-4 sm:mb-5 flex h-20 w-16 sm:h-24 sm:w-20 items-center justify-center rounded-2xl bg-white p-2 sm:p-2.5 shadow-[0_8px_30px_rgba(255,255,255,0.12)] border border-yellow-400/50">
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/250px-2026_FIFA_World_Cup_emblem.svg.png"
                  alt="FIFA World Cup 2026 Logo"
                  className="h-full w-auto object-contain"
                />
              </div>

              {/* World Cup 2026 Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-linear-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 px-3.5 py-1.5 sm:px-4 sm:py-1.5 text-[9px] sm:text-[10px] font-extrabold tracking-widest text-yellow-400 uppercase shadow-inner">
                <span className="h-1 w-1 rounded-full bg-yellow-400 animate-pulse" />
                FIFA World Cup 2026
              </span>

              {/* Title */}
              <h3 className="mt-3 sm:mt-4 text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Official Joint <br />
                <span className="bg-linear-to-r from-yellow-400 via-amber-400 to-orange-500 bg-clip-text text-transparent font-black">
                  Broadcasting Rights
                </span>
              </h3>
              
              {/* Pulse LIVE Indicator */}
              <div className="mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
                </span>
                <p className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-400 uppercase">
                  Live in Bangladesh
                </p>
              </div>
            </div>

            {/* Announcement text */}
            <div className="mt-4 sm:mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 sm:p-4.5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-yellow-500 to-orange-500" />
              <p className="text-center sm:text-left text-xs sm:text-sm leading-relaxed text-zinc-300">
                Bangladesh Television <span className="font-extrabold text-white">BTV</span>,{" "}
                <span className="font-extrabold text-white">T Sports</span>, and{" "}
                <span className="font-extrabold text-white">Somoy TV</span> have officially acquired the joint broadcasting rights to telecast the{" "}
                <span className="font-extrabold text-yellow-400">FIFA World Cup 2026</span> live in Bangladesh.
              </p>
            </div>

            {/* Broadcaster Logo Cards */}
            <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {/* BTV */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-2 sm:p-3 text-center transition-all duration-300 hover:bg-white/[0.06] hover:border-yellow-500/20 hover:-translate-y-1 group">
                <div className="flex h-11 sm:h-14 w-full items-center justify-center rounded-xl bg-white p-1.5 sm:p-2 shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src="https://tstatic.akash-go.com/cms-ui/images/custom-content/1778082545894.png"
                    alt="BTV"
                    className="h-full object-contain filter brightness-100"
                  />
                </div>
                <span className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] font-extrabold tracking-wider text-zinc-400 group-hover:text-yellow-400 transition-colors">BTV</span>
              </div>

              {/* T Sports */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-2 sm:p-3 text-center transition-all duration-300 hover:bg-white/[0.06] hover:border-yellow-500/20 hover:-translate-y-1 group">
                <div className="flex h-11 sm:h-14 w-full items-center justify-center rounded-xl bg-white p-1.5 sm:p-2 shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src="https://s3.aynaott.com/storage/dbc585f70a60b9855b6e13a8ce4cb6f4"
                    alt="T Sports"
                    className="h-full object-contain"
                  />
                </div>
                <span className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] font-extrabold tracking-wider text-zinc-400 group-hover:text-yellow-400 transition-colors">T Sports</span>
              </div>

              {/* Somoy TV */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] p-2 sm:p-3 text-center transition-all duration-300 hover:bg-white/[0.06] hover:border-yellow-500/20 hover:-translate-y-1 group">
                <div className="flex h-11 sm:h-14 w-full items-center justify-center rounded-xl bg-white p-1.5 sm:p-2 shadow-md border border-white/10 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src="https://i.postimg.cc/Qxn4JFNV/20250529-071147.png"
                    alt="Somoy TV"
                    className="h-full object-contain"
                  />
                </div>
                <span className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] font-extrabold tracking-wider text-zinc-400 group-hover:text-yellow-400 transition-colors">Somoy TV</span>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="mt-5 sm:mt-6 flex flex-col gap-2">
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-yellow-500 via-amber-500 to-orange-500 px-5 py-3 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-black text-black shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-400 hover:to-orange-500 hover:shadow-yellow-500/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center font-bold"
              >
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-black text-black animate-pulse" />
                Watch Live Stream Now
              </button>
            </div>

            <p className="mt-3 text-center text-[9px] font-medium text-zinc-500">
              *Matches will stream live once the tournament begins.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
