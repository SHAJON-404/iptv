"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Generate or retrieve session ID from sessionStorage
    const getOrCreateSessionId = (): string => {
      if (typeof window === "undefined") return "";
      let id = sessionStorage.getItem("iptv_viewer_session_id");
      if (!id) {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem("iptv_viewer_session_id", id);
      }
      return id;
    };

    const sessionId = getOrCreateSessionId();

    const sendHeartbeat = async () => {
      try {
        const response = await fetch("/api/iptv/viewers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });
        if (response.ok) {
          const data = await response.json();
          if (typeof data.count === "number") {
            setViewerCount(data.count);
          }
        }
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 15 seconds
    const interval = setInterval(sendHeartbeat, 15000);

    return () => clearInterval(interval);
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
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                    LIVE BROADCAST
                  </span>
                </div>
                {viewerCount !== null && (
                  <>
                    <span className="text-white/20 text-[9px] sm:text-[10px] select-none">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-blue-400">
                        {viewerCount} {viewerCount === 1 ? "Watcher" : "Watchers"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
