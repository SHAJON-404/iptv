"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { User, Heart, ArrowLeft, Coins, Copy, Check, Star } from "lucide-react";
import { FaGithub, FaTelegram, FaFacebook, FaYoutube } from "react-icons/fa6";
import Link from "next/link";
import BackgroundScene from "./BackgroundScene";
import Header from "./Header";

export default function AboutView() {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <main className="relative min-h-screen text-white overflow-hidden pb-20 sm:pb-24">
      <BackgroundScene />
      <div className="relative z-10">
        <Header />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 sm:mt-16 flex flex-col items-center">
          {/* Back Button */}
          <div className="w-full flex justify-start mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-zinc-300 hover:text-white font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back to Player</span>
            </Link>
          </div>

          {/* Profile Card Wrapper */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full glass-card p-6 sm:p-10 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] flex flex-col md:flex-row items-center md:items-start gap-8 sm:gap-10 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient Background Glow inside card */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-violet-500/10 blur-[80px] pointer-events-none" />

            {/* Profile Avatar with double pulsing borders */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-violet-500 blur-md opacity-40 scale-105" />
              <div className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                <Image
                  src="https://avatars.githubusercontent.com/u/171383675?v=4"
                  alt="S. SHAJON"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500 border-4 border-[#070414] z-10 animate-pulse shadow-md" />
            </div>

            {/* Profile Content */}
            <div className="flex-1 text-center md:text-left space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  <User size={12} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Core Developer
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                  S. SHAJON
                </h1>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary/80">
                  Self-Learned Developer & Reverse Engineer
                </p>
              </div>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-medium max-w-xl">
                Hi! I am a self-learned developer and reverse engineer. I created this open-source IPTV player project, which supports both DASH and HLS streams. Feel free to contact me directly if you face any issues.
              </p>

              {/* Social Channels Panel */}
              <div className="pt-2 w-full">
                <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 text-center md:text-left">
                  Connect & Support
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl mx-auto md:mx-0">
                  <a
                    href="https://t.me/shajonOTT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#26A5E4]/10 text-zinc-300 hover:text-[#26A5E4] border border-white/10 hover:border-[#26A5E4]/50 font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(38,165,228,0.15)] cursor-pointer"
                  >
                    <FaTelegram size={16} />
                    <span>Telegram</span>
                  </a>
                  <a
                    href="https://github.com/SHAJON-404"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/30 font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer"
                  >
                    <FaGithub size={16} />
                    <span>GitHub</span>
                  </a>
                  <a
                    href="https://www.facebook.com/shahmakhdumshajonofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#1877F2]/10 text-zinc-300 hover:text-[#1877F2] border border-white/10 hover:border-[#1877F2]/50 font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(24,119,242,0.15)] cursor-pointer"
                    title="Facebook"
                  >
                    <FaFacebook size={16} />
                    <span>Facebook</span>
                  </a>
                  <a
                    href="https://youtube.com/@SHAJON-404"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#FF0000]/10 text-zinc-300 hover:text-[#FF0000] border border-white/10 hover:border-[#FF0000]/50 font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-sm hover:shadow-[0_0_15px_rgba(255,0,0,0.15)] cursor-pointer"
                    title="YouTube"
                  >
                    <FaYoutube size={16} />
                    <span>YouTube</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Cards Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* GitHub Support Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card p-6 sm:p-8 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] backdrop-blur-sm flex flex-col justify-between items-center text-center space-y-5 relative overflow-hidden"
            >
              {/* Subtle violet background glow */}
              <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-primary/5 blur-[50px] pointer-events-none" />

              <div className="space-y-4 flex flex-col items-center w-full relative z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/25 text-primary shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                  <Heart size={20} className="animate-pulse" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-300">Loving This Project?</h3>
                <p className="text-xs sm:text-sm text-zinc-350 font-medium leading-relaxed max-w-sm">
                  This player is open-source and free forever. If you like this project, please give it a star on GitHub! It keeps development active.
                </p>

                {/* Benefits checklist to fill empty vertical space and balance layout */}
                <div className="w-full text-left space-y-2.5 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-300 group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Star size={12} className="text-primary fill-primary/50" />
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium leading-normal">Keep the project active and free forever</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-300 group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Star size={12} className="text-primary fill-primary/50" />
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium leading-normal">Show appreciation for the hard work</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all duration-300 group">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <Star size={12} className="text-primary fill-primary/50" />
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-300 font-medium leading-normal">Help reach more developers globally</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 w-full relative z-10">
                <a
                  href="https://github.com/SHAJON-404/iptv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md shadow-primary/10 active:scale-95 cursor-pointer"
                >
                  <FaGithub size={15} />
                  <span>Star Repository on GitHub</span>
                </a>
              </div>
            </motion.div>

            {/* Donation Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-card p-6 sm:p-8 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] backdrop-blur-sm flex flex-col justify-between items-center text-center space-y-5 relative overflow-hidden"
            >
              {/* Subtle amber background glow */}
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-500/5 blur-[50px] pointer-events-none" />

              <div className="space-y-4 flex flex-col items-center w-full relative z-10">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <Coins size={20} className="animate-bounce" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-300">Support the Developer</h3>
                <p className="text-xs sm:text-sm text-zinc-355 font-medium leading-relaxed max-w-sm">
                  If you want to support the developer&apos;s work, you can donate via cryptocurrency:
                </p>

                {/* Donation details list */}
                <div className="w-full text-left space-y-3 pt-2">
                  {/* Binance UID */}
                  <button
                    onClick={() => handleCopy("839622149", "binance-uid")}
                    className="w-full flex items-center justify-between p-3.5 bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-400 rounded-xl transition-all duration-300 group text-left cursor-pointer hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-[0.99] select-none"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Binance UID</span>
                      </div>
                      <span className="text-white font-mono text-sm sm:text-base font-bold tracking-wide break-all">839622149</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase transition-opacity duration-300 ${copiedText === "binance-uid" ? "text-emerald-400 opacity-100" : "text-amber-400/60 opacity-0 group-hover:opacity-100"}`}>
                        {copiedText === "binance-uid" ? "Copied!" : "Copy"}
                      </span>
                      <div className={`p-2 rounded-lg transition-all duration-300 ${copiedText === "binance-uid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-105"}`}>
                        {copiedText === "binance-uid" ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} className="stroke-[2.5]" />}
                      </div>
                    </div>
                  </button>

                  {/* BEP20 */}
                  <button
                    onClick={() => handleCopy("0x22d4f314acbf6055b0a37df8df68f9cd40ba889a", "bep20")}
                    className="w-full flex items-center justify-between p-3.5 bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-400 rounded-xl transition-all duration-300 group text-left cursor-pointer hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-[0.99] select-none"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">BEP20 (BNB/USDT)</span>
                      </div>
                      <span className="text-white font-mono text-xs sm:text-sm font-bold tracking-wide break-all">0x22d4f314acbf6055b0a37df8df68f9cd40ba889a</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase transition-opacity duration-300 ${copiedText === "bep20" ? "text-emerald-400 opacity-100" : "text-amber-400/60 opacity-0 group-hover:opacity-100"}`}>
                        {copiedText === "bep20" ? "Copied!" : "Copy"}
                      </span>
                      <div className={`p-2 rounded-lg transition-all duration-300 ${copiedText === "bep20" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-105"}`}>
                        {copiedText === "bep20" ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} className="stroke-[2.5]" />}
                      </div>
                    </div>
                  </button>

                  {/* TRC20 */}
                  <button
                    onClick={() => handleCopy("TAsPdCxkX9CeErJ4vw7xBHfZDT6vpdfmwH", "trc20")}
                    className="w-full flex items-center justify-between p-3.5 bg-amber-500/[0.03] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-400 rounded-xl transition-all duration-300 group text-left cursor-pointer hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-[0.99] select-none"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">TRC20 (TRX/USDT)</span>
                      </div>
                      <span className="text-white font-mono text-xs sm:text-sm font-bold tracking-wide break-all">TAsPdCxkX9CeErJ4vw7xBHfZDT6vpdfmwH</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-bold tracking-wider uppercase transition-opacity duration-300 ${copiedText === "trc20" ? "text-emerald-400 opacity-100" : "text-amber-400/60 opacity-0 group-hover:opacity-100"}`}>
                        {copiedText === "trc20" ? "Copied!" : "Copy"}
                      </span>
                      <div className={`p-2 rounded-lg transition-all duration-300 ${copiedText === "trc20" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-105"}`}>
                        {copiedText === "trc20" ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} className="stroke-[2.5]" />}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
