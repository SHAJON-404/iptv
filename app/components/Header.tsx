"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Server, Tv } from "lucide-react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isFtpPage = pathname === "/ftp";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${scrolled
          ? "bg-[#070414]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl shadow-black/40"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20 sm:h-26">
          {/* Logo & Brand */}
          <Link href="/">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-center gap-3 sm:gap-4.5 cursor-pointer group"
            >
              <div className="relative w-12 h-12 sm:w-15 sm:h-15 rounded-2xl overflow-hidden border border-white/15 group-hover:border-primary/40 shadow-xl shadow-primary/20 bg-white/5 flex-shrink-0 transition-colors">
                <Image
                  src="/logo.png"
                  alt="IPTV Player Logo"
                  fill
                  sizes="(max-width: 640px) 48px, 60px"
                  className="object-cover group-hover:scale-105 transition-transform"
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
                <div className="flex items-center gap-2 mt-1.5">
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

          {/* Right side navigation / FTP Server Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center"
          >
            <Link
              href={isFtpPage ? "/" : "/ftp"}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-white/10 hover:border-primary/50 bg-white/5 hover:bg-primary/10 text-white font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
            >
              {isFtpPage ? (
                <>
                  <Tv size={15} className="text-primary" />
                  <span>Watch Live TV</span>
                </>
              ) : (
                <>
                  <Server size={15} className="text-primary" />
                  <span>FTP Servers</span>
                </>
              )}
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
