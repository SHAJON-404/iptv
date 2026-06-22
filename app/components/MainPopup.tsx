"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send } from "lucide-react";

interface MainPopupProps {
  showPopup: boolean;
}

export default function MainPopup({ showPopup }: MainPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!showPopup) return;

    // Check if user has already dismissed the popup in this session
    // In development mode, bypass the dismissal check so it shows up for testing
    const isDismissed = sessionStorage.getItem("dismissed_community_popup");
    if (isDismissed !== "true" || process.env.NODE_ENV === "development") {
      setTimeout(() => {
        setIsOpen(true);
      }, 0);
    }
  }, [showPopup]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("dismissed_community_popup", "true");
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
            style={{ willChange: "opacity" }}
            className="absolute inset-0 bg-[#070414]/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ ease: "easeOut", duration: 0.25 }}
            style={{ willChange: "transform, opacity" }}
            className="relative w-full max-w-[92%] sm:max-w-[32rem] max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl border border-white/10 sm:border-white/5 bg-[#0c0824]/98 p-5 sm:p-8 shadow-[0_0_50px_rgba(38,165,228,0.15)]"
          >
            {/* Ambient Background Lights */}
            <div className="absolute -top-24 -left-24 -z-10 h-48 w-48 rounded-full bg-[#26A5E4]/15 blur-[64px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 -z-10 h-48 w-48 rounded-full bg-[#5865F2]/15 blur-[64px]" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full border border-white/10 sm:border-white/5 bg-white/5 p-1.5 sm:p-2 text-white/70 transition-all hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Header / Logos */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-4 mb-4 sm:mb-5">
                {/* Telegram Badge */}
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#26A5E4]/10 border border-[#26A5E4]/30 shadow-[0_8px_30px_rgba(38,165,228,0.2)]">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-9 sm:h-9 text-[#26A5E4] fill-current">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.03-.75 4.04-1.76 6.74-2.92 8.1-3.48 3.84-1.6 4.64-1.88 5.16-1.89.11 0 .37.03.54.17.14.12.18.28.2.45.02.13.01.27-.01.4z" />
                  </svg>
                </div>

                {/* Discord Badge */}
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-[#5865F2]/10 border border-[#5865F2]/30 shadow-[0_8px_30px_rgba(88,101,242,0.2)]">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-9 sm:h-9 text-[#5865F2] fill-current">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2498-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8745-.6177-1.2498a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </div>
              </div>

              {/* Sub-badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-linear-to-r from-sky-500/15 via-indigo-500/10 to-sky-500/15 px-3.5 py-1.5 text-[9px] sm:text-[10px] font-extrabold tracking-widest text-sky-400 uppercase shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                Official Communities
              </span>

              {/* Title */}
              <h3 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                Join <span className="bg-linear-to-r from-sky-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">shajonOTT</span>
              </h3>
            </div>

            {/* Description Cards */}
            <div className="mt-4 sm:mt-5 flex flex-col gap-3">
              {/* Telegram Info */}
              <div className="rounded-2xl border border-white/10 sm:border-white/5 bg-white/[0.015] p-4 relative overflow-hidden group hover:bg-white/[0.03] transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#26A5E4]" />
                <p className="text-center sm:text-left text-xs sm:text-[13px] leading-relaxed text-zinc-300 font-medium">
                  আইনি নোটিশের কারণে ওয়েবসাইট থেকে সকল ডিফল্ট প্লেলিস্ট সরিয়ে ফেলা হয়েছে। প্লেলিস্টের জন্য আমাদের <span className="text-[#26A5E4] font-bold">টেলিগ্রাম চ্যানেল</span> অথবা <span className="text-[#5865F2] font-bold">ডিসকর্ড সার্ভারে</span> জয়েন করুন।
                </p>
              </div>

              {/* Discord Info */}
              <div className="rounded-2xl border border-white/10 sm:border-white/5 bg-white/[0.015] p-4 relative overflow-hidden group hover:bg-white/[0.03] transition-colors">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5865F2]" />
                <p className="text-center sm:text-left text-xs sm:text-[13px] leading-relaxed text-zinc-300 font-medium">
                  হাই-ভোল্টেজ ম্যাচগুলো (যেমন: <span className="text-[#5865F2] font-bold">আর্জেন্টিনা, ব্রাজিল</span>) ওয়েবসাইটে দেখানোর পাশাপাশি ডিসকর্ডেও <span className="text-amber-400 font-bold">4K রেজোলিউশনে</span> দেখানো হবে। তাই 4K তে দেখতে ডিসকর্ডে জয়েন করুন!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 sm:mt-6 flex flex-col gap-2.5">
              <a
                href="https://discord.gg/TtWrw8W9B"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center group"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5 fill-white group-hover:scale-110 transition-transform">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2498-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8745-.6177-1.2498a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                </svg>
                <span>Join Discord Server</span>
              </a>

              <a
                href="https://t.me/shajonOTT"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#26A5E4] hover:bg-[#2092cc] px-4 py-3 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-center group"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                <span>Join Telegram Channel</span>
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
