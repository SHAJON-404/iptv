"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send } from "lucide-react";

interface TelegramPopupProps {
  showPopup: boolean;
}

export default function TelegramPopup({ showPopup }: TelegramPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!showPopup) return;

    // Check if user has already dismissed the Telegram popup in this session
    // In development mode, bypass the dismissal check so it shows up for testing
    const isDismissed = sessionStorage.getItem("dismissed_telegram_popup");
    if (isDismissed !== "true" || process.env.NODE_ENV === "development") {
      setTimeout(() => {
        setIsOpen(true);
      }, 0);
    }
  }, [showPopup]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("dismissed_telegram_popup", "true");
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
            className="relative w-full max-w-[92%] sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/10 sm:border-white/5 bg-[#0c0824]/95 p-5 sm:p-8 shadow-[0_0_50px_rgba(38,165,228,0.15)] backdrop-blur-3xl"
          >
            {/* Ambient Background Lights */}
            <div className="absolute -top-24 -left-24 -z-10 h-48 w-48 rounded-full bg-[#26A5E4]/15 blur-[64px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 -z-10 h-48 w-48 rounded-full bg-cyan-500/15 blur-[64px]" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full border border-white/10 sm:border-white/5 bg-white/5 p-1.5 sm:p-2 text-white/70 transition-all hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Header / Telegram Logo */}
            <div className="flex flex-col items-center text-center">
              {/* Premium Badge for Telegram Logo */}
              <div className="relative mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#26A5E4]/10 border border-[#26A5E4]/30 shadow-[0_8px_30px_rgba(38,165,228,0.2)]">
                <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 text-[#26A5E4] fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.03-.75 4.04-1.76 6.74-2.92 8.1-3.48 3.84-1.6 4.64-1.88 5.16-1.89.11 0 .37.03.54.17.14.12.18.28.2.45.02.13.01.27-.01.4z" />
                </svg>
              </div>

              {/* Sub-badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-linear-to-r from-sky-500/15 via-blue-500/10 to-sky-500/15 px-3.5 py-1.5 text-[9px] sm:text-[10px] font-extrabold tracking-widest text-[#26A5E4] uppercase shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-[#26A5E4] animate-pulse" />
                Official Telegram Channel
              </span>

              {/* Title */}
              <h3 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                Join <span className="bg-linear-to-r from-sky-400 to-[#26A5E4] bg-clip-text text-transparent">shajonOTT</span>
              </h3>
            </div>

            {/* Description Card */}
            <div className="mt-4 sm:mt-5 rounded-2xl border border-white/10 sm:border-white/5 bg-white/[0.015] p-4 sm:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#26A5E4]" />
              <p className="text-center sm:text-left text-xs sm:text-sm leading-relaxed text-zinc-300">
                Join our official Telegram community for real-time notifications, 
                stream status updates, channel list modifications, feature announcements, and direct requests.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 sm:mt-6 flex flex-col gap-2.5">
              <a
                href="https://t.me/shajonOTT"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#26A5E4] hover:bg-[#2092cc] px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white text-white" />
                <span>Join Channel Now</span>
              </a>
              
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-white transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center"
              >
                Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
