"use client";

import { motion } from "motion/react";
import { Send } from "lucide-react";

export default function MaintenanceView() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#070414]">
      {/* Backdrop Blur Overlay */}
      <div className="absolute inset-0 bg-[#070414]/85 backdrop-blur-md" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ease: "easeOut", duration: 0.3 }}
        className="relative w-full max-w-[92%] sm:max-w-[32rem] rounded-3xl border border-white/10 sm:border-white/5 bg-[#0c0824]/98 p-6 sm:p-10 shadow-[0_0_50px_rgba(38,165,228,0.15)] overflow-hidden"
      >
        {/* Ambient Background Lights */}
        <div className="absolute -top-24 -left-24 -z-10 h-48 w-48 rounded-full bg-[#26A5E4]/20 blur-[64px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 -z-10 h-48 w-48 rounded-full bg-[#5865F2]/20 blur-[64px]" />

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Animated Settings/Maintenance Icon */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mb-6 relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <svg
              className="w-10 h-10 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </motion.div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-linear-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-3.5 py-1.5 text-[10px] font-extrabold tracking-widest text-amber-400 uppercase shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Under Maintenance
          </span>

          <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            We&apos;ll be back soon!
          </h1>

          <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-zinc-300 font-medium max-w-[280px] sm:max-w-none">
            We are currently performing some scheduled maintenance. Join our official channels for the latest updates.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="https://discord.gg/TtWrw8W9B"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] px-4 py-3.5 sm:px-5 sm:py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white group-hover:scale-110 transition-transform">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2498-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8745-.6177-1.2498a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            <span>Join Discord</span>
          </a>

          <a
            href="https://t.me/shajonOTT"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#26A5E4] hover:bg-[#2092cc] px-4 py-3.5 sm:px-5 sm:py-4 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group"
          >
            <Send className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-white text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            <span>Join Telegram Channel</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
