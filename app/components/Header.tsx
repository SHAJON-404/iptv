"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, User, Trophy, LogIn, Menu, X, AlertCircle, Tv } from "lucide-react";
import { FaTelegram, FaDiscord } from "react-icons/fa6";
import { useAuth } from "@/app/hooks/useAuth";

export default function Header() {
  const pathname = usePathname();
  const { session } = useAuth();
  const isFaqPage = pathname === "/faq";
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <header className="sticky top-0 z-50 w-full border-b transition-all duration-500 bg-[#070414]/85 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-22">
          {/* Logo & Brand */}
          <Link href="/">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-2.5 sm:gap-4.5 cursor-pointer group"
            >
              <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 sm:border-white/15 group-hover:border-primary/40 shadow-xl shadow-primary/20 bg-white/5 flex-shrink-0 transition-colors">
                <Image
                  src="/logo.png"
                  alt="IPTV Player Logo"
                  fill
                  sizes="(max-width: 640px) 40px, 56px"
                  className="object-cover group-hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center">
                {/* Mobile UI Brand */}
                <span className="text-lg font-black tracking-tight text-white sm:hidden leading-none select-none">
                  IP<span className="gradient-text">TV</span>
                </span>

                {/* Desktop UI Brand */}
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                    IP
                  </span>
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight gradient-text">
                    TV Player
                  </span>
                </div>

                {/* Desktop Live Broadcast Badge */}
                <div className="hidden sm:flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                      LIVE BROADCAST
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Navigation Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="hidden md:flex items-center gap-2 sm:gap-3"
            >
              <Link
                href="/fixtures"
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer ${
                  pathname === "/fixtures"
                    ? "border-primary/50 bg-primary/10 text-primary animate-pulse"
                    : "border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white"
                } font-bold text-xs sm:text-sm`}
              >
                <Trophy size={15} className="text-yellow-500 animate-pulse" />
                <span>World Cup</span>
              </Link>

              <Link
                href="/faq"
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer ${
                  isFaqPage
                    ? "border-primary/50 bg-primary/10 text-primary animate-pulse"
                    : "border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white"
                } font-bold text-xs sm:text-sm`}
              >
                <HelpCircle size={15} className="text-primary" />
                <span>FAQ</span>
              </Link>

              {/* Auth Button (Desktop) */}
              {session ? (
                <Link href="/dashboard">
                  <button
                    className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
                    title={session.user?.name || "User"}
                  >
                    {session.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={session.user.image} alt="Profile" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
                    ) : (
                      <User size={15} className="text-primary" />
                    )}
                    <span>Dashboard</span>
                  </button>
                </Link>
              ) : (
                <Link href="/login">
                  <button
                    className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-primary/30 hover:border-primary/50 bg-primary/10 hover:bg-primary/20 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
                  >
                    <LogIn size={15} className="text-primary" />
                    <span>Login</span>
                  </button>
                </Link>
              )}
            </motion.div>

            {/* Mobile Hamburger Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={toggleMenu}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer select-none"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={20} className="text-rose-400" /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden bg-[#070414]/95 backdrop-blur-2xl border-t border-white/[0.08]"
          >
            <div className="px-4 py-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
              {/* Notice Cards - inside Mobile Drawer */}
              <div className="space-y-4">
                {/* Troubleshooting Tip */}
                <div className="group relative glass-card border border-amber-500/15 rounded-2xl bg-white/[0.01] overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent pointer-events-none" />
                  <div className="relative p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-400/80 tracking-widest mb-1 uppercase">Troubleshooting</p>
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                        Encountering a blank or black screen? Click <span className="text-primary font-bold">Reload Stream</span> in the player controls or <span className="text-primary font-bold">Try Reconnecting</span>. If buffering is frequent, try connecting to a <span className="text-primary font-bold">VPN</span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Community & Playlist Guide */}
                <div className="group relative glass-card border border-primary/15 rounded-2xl bg-white/[0.01] overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
                  <div className="relative p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary/80 tracking-widest mb-1 uppercase">প্লেলিস্ট গাইড</p>
                      <p className="text-xs text-zinc-300 leading-relaxed mb-3 font-medium">
                        এই ওয়েবসাইটে কোনো ডিফল্ট প্লেলিস্ট প্রদান করা হয় না। প্লেলিস্ট পেতে আমাদের কমিউনিটিতে যোগ দিন।
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://t.me/shajonOTT"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2AABEE]/10 border border-[#2AABEE]/20 text-[#2AABEE] text-[10px] font-bold"
                        >
                          <FaTelegram size={12} />
                          Telegram
                        </a>
                        <a
                          href="https://discord.gg/TtWrw8W9B"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] text-[10px] font-bold"
                        >
                          <FaDiscord size={12} />
                          Discord
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <Link
                  href="/fixtures"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    pathname === "/fixtures"
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-white/5 bg-white/[0.02] text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    World Cup
                  </span>
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.5 rounded uppercase">Live</span>
                </Link>

                <Link
                  href="/faq"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                    isFaqPage
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-white/5 bg-white/[0.02] text-white"
                  }`}
                >
                  <HelpCircle size={16} className="text-primary" />
                  FAQ
                </Link>

                {session ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] text-white text-sm font-bold"
                  >
                    {session.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={session.user.image} alt="Profile" className="w-5 h-5 rounded-full" />
                    ) : (
                      <User size={16} className="text-primary" />
                    )}
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/20 bg-primary/10 text-white text-sm font-bold text-center justify-center"
                  >
                    <LogIn size={16} className="text-primary" />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
