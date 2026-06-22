"use client";

import Link from "next/link";
import { FaTelegram, FaDiscord, FaGithub } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="w-full mt-auto bg-[#070414]/90 backdrop-blur-xl border-t border-white/[0.08] relative z-40 overflow-hidden">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

          {/* Brand & Description (Takes up 5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <Link href="/" className="inline-block">
              <div className="flex items-baseline gap-1 select-none">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  IP
                </span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight gradient-text">
                  TV Player
                </span>
              </div>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              The ultimate web-based streaming platform. Watch thousands of live TV channels from around the world without installing any applications. Supports M3U, JSON, HLS, and DASH streams.
            </p>
          </div>

          {/* Quick Links (Takes up 3 cols) */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <h4 className="text-white font-bold tracking-wider uppercase text-xs">Quick Links</h4>
            <nav className="flex flex-col gap-2.5">
              <Link href="/" className="text-sm text-zinc-400 hover:text-primary transition-colors w-fit">
                Home
              </Link>
              <Link href="/about" className="text-sm text-zinc-400 hover:text-primary transition-colors w-fit">
                About Developer
              </Link>
              <Link href="/ftp" className="text-sm text-zinc-400 hover:text-primary transition-colors w-fit">
                FTP & Servers
              </Link>
              <Link href="/faq" className="text-sm text-zinc-400 hover:text-primary transition-colors w-fit">
                FAQ & Help
              </Link>
            </nav>
          </div>

          {/* Community & Social (Takes up 4 cols) */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h4 className="text-white font-bold tracking-wider uppercase text-xs">Join the Community</h4>
            <p className="text-zinc-400 text-sm mb-1">
              Connect with us for updates, custom playlists, and support.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://t.me/shajonOTT"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#0088cc]/50 hover:bg-[#0088cc]/10 text-zinc-300 hover:text-[#0088cc] transition-all duration-300 hover:shadow-lg hover:shadow-[#0088cc]/20"
                title="Telegram Channel"
              >
                <FaTelegram size={20} />
              </a>
              <a
                href="https://discord.gg/TtWrw8W9B"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/10 text-zinc-300 hover:text-[#5865F2] transition-all duration-300 hover:shadow-lg hover:shadow-[#5865F2]/20"
                title="Discord Server"
              >
                <FaDiscord size={20} />
              </a>
              <a
                href="https://github.com/SHAJON-404"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/50 hover:bg-white/10 text-zinc-300 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-white/10"
                title="GitHub"
              >
                <FaGithub size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright Line */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500 font-medium">
            &copy; {new Date().getFullYear()} IPTV Player by <a href="https://github.com/SHAJON-404" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-bold">S. SHAJON</a>. All rights reserved.
          </p>
          <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            Not affiliated with any broadcasters
          </div>
        </div>
      </div>
    </footer>
  );
}
