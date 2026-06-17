"use client";

import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Server, Tv, HelpCircle, User, Trophy, LogIn } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";

export default function Header() {
  const pathname = usePathname();
  const { session } = useAuth();
  const isFtpPage = pathname === "/ftp";
  const isFaqPage = pathname === "/faq";
  const isAboutPage = pathname === "/about";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b transition-all duration-500 bg-[#070414]/80 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/20"
    >
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

          {/* Right side navigation / FAQ & FTP Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <Link
              href="/fixtures"
              className={`hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer ${
                pathname === "/fixtures"
                  ? "border-primary/50 bg-primary/10 text-primary animate-pulse"
                  : "border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white"
              } font-bold text-xs sm:text-sm`}
            >
              <Trophy size={15} className="text-yellow-500 animate-pulse" />
              <span>World Cup</span>
            </Link>

            <Link
              href="/about"
              className={`hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer ${
                isAboutPage
                  ? "border-primary/50 bg-primary/10 text-primary animate-pulse"
                  : "border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white"
              } font-bold text-xs sm:text-sm`}
            >
              <User size={15} className="text-primary" />
              <span>About</span>
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

            <Link
              href={isFtpPage ? "/" : "/ftp"}
              className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
            >
              {isFtpPage ? (
                <>
                  <Tv size={15} className="text-primary" />
                  <span className="hidden sm:inline">Watch Live TV</span>
                  <span className="sm:hidden">Live TV</span>
                </>
              ) : (
                <>
                  <Server size={15} className="text-primary" />
                  <span>FTP</span>
                </>
              )}
            </Link>

            {/* Auth Button */}
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
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </Link>
            ) : (
              <Link href="/login">
                <button
                  className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-primary/30 hover:border-primary/50 bg-primary/10 hover:bg-primary/20 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
                >
                  <LogIn size={15} className="text-primary" />
                  <span className="hidden sm:inline">Login</span>
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
}
