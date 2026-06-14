"use client";

import React from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { User, Heart, ArrowLeft } from "lucide-react";
import { FaGithub, FaTelegram, FaFacebook, FaYoutube } from "react-icons/fa6";
import Link from "next/link";
import BackgroundScene from "./BackgroundScene";
import Header from "./Header";

export default function AboutView() {
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
              <div className="pt-2">
                <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                  Connect & Support
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <a
                    href="https://t.me/SHAJON"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#26A5E4] hover:bg-[#26A5E4]/90 text-white font-extrabold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-md shadow-[#26A5E4]/15"
                  >
                    <FaTelegram size={16} />
                    <span>Telegram Contact</span>
                  </a>
                  <a
                    href="https://github.com/SHAJON-404"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20 font-bold text-xs sm:text-sm transition-all duration-300 active:scale-95 shadow-md"
                  >
                    <FaGithub size={16} />
                    <span>GitHub Profile</span>
                  </a>
                  <a
                    href="https://www.facebook.com/shahmakhdumshajonofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:border-[#1877F2]/50 text-zinc-300 hover:text-[#1877F2] transition-all duration-300 active:scale-95"
                    title="Facebook"
                  >
                    <FaFacebook size={18} />
                  </a>
                  <a
                    href="https://youtube.com/@SHAJON-404"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:border-[#FF0000]/50 text-zinc-300 hover:text-[#FF0000] transition-all duration-300 active:scale-95"
                    title="YouTube"
                  >
                    <FaYoutube size={18} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Project Details / Contribution Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full mt-6 glass-card p-6 sm:p-8 border border-white/10 sm:border-white/5 rounded-3xl bg-white/[0.01] backdrop-blur-sm text-center max-w-2xl mx-auto space-y-4"
          >
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Heart size={20} className="animate-pulse" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Support the IPTV Project</h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              This player is open-source and free forever. If you like this project, 
              please give it a star on GitHub! It keeps me motivated to push regular updates, 
              fix bugs, and integrate new live streaming features.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/SHAJON-404/iptv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md shadow-primary/10 active:scale-95 cursor-pointer"
              >
                <FaGithub size={15} />
                <span>Star Repository on GitHub</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
