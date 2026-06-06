"use client";

import { motion } from "motion/react";
import {
  Database,
  Network,
  Server,
  Zap,
  HardDrive,
  Globe,
  ArrowUpRight,
} from "lucide-react";

import BackgroundScene from "../components/BackgroundScene";
import Header from "../components/Header";

const ftpServers = [
  {
    id: "server-1",
    name: "BDIX Server 1",
    host: "103.225.94.27",
    url: "http://103.225.94.27/Infobase/",
    description:
      "High-speed BDIX local movie portal with TV shows, games, and software archive. Extremely fast on supported ISP lines.",
    badge: "Multi-Gigabit",
    icon: Database,
    speed: "100 Mbps+",
    gradient: "from-blue-600/15 via-cyan-600/10 to-blue-600/5",
    borderHover: "hover:border-blue-500/30",
    iconBg: "bg-blue-500/10 border-blue-500/15 text-blue-400",
    accentColor: "blue",
    btnGradient:
      "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30",
  },
  {
    id: "server-2",
    name: "FTPBD Server",
    host: "server1.ftpbd.net",
    url: "https://server1.ftpbd.net/#blog",
    description:
      "Popular media server with fresh releases, extensive movie library, series, games, blog reviews, and direct downloads.",
    badge: "Premium Link",
    icon: Network,
    speed: "100 Mbps+",
    gradient: "from-violet-600/15 via-purple-600/10 to-violet-600/5",
    borderHover: "hover:border-violet-500/30",
    iconBg: "bg-violet-500/10 border-violet-500/15 text-violet-400",
    accentColor: "violet",
    btnGradient:
      "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30",
  },
];

const stats = [
  { label: "Network", value: "BDIX", icon: Globe },
  { label: "Avg Speed", value: "100 Mbps+", icon: Zap },
  { label: "Servers", value: "2 Active", icon: Server },
  { label: "Content", value: "TB+ Files", icon: HardDrive },
];

export default function FtpPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden pb-16">
      <BackgroundScene />
      <div className="relative z-10">
        <Header />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          {/* ─── Page Header ─── */}
          <div className="text-center max-w-3xl mx-auto space-y-5 mb-10 sm:mb-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm"
            >
              <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Online
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                BDIX Network
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]"
            >
              High-Speed{" "}
              <span className="gradient-text">FTP Servers</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-gray-400 font-medium max-w-xl mx-auto leading-relaxed"
            >
              Access local high-speed entertainment archives with zero-buffer
              streaming, massive directories, and blazing fast downloads from
              BDIX peered servers.
            </motion.p>
          </div>

          {/* ─── Stats Bar ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mb-10 sm:mb-14"
          >
            {stats.map((stat, i) => {
              const StatIcon = stat.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-white/[0.04]">
                    <StatIcon size={16} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      {stat.label}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* ─── Server Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
            {ftpServers.map((server, idx) => {
              const IconComponent = server.icon;
              return (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + idx * 0.12,
                  }}
                  className={`relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br ${server.gradient} backdrop-blur-md transition-all duration-500 hover:-translate-y-1 ${server.borderHover} group`}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />

                  <div className="relative p-6 sm:p-8 flex flex-col justify-between h-[310px] sm:h-[340px]">
                    {/* Top Section */}
                    <div className="space-y-5">
                      <div className="flex items-start justify-between">
                        <div
                          className={`p-3 rounded-2xl border ${server.iconBg} transition-transform duration-300 group-hover:scale-110`}
                        >
                          <IconComponent size={22} strokeWidth={2} />
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 select-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                            Online
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                            {server.badge}
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                          {server.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400/90 leading-relaxed font-medium line-clamp-2">
                          {server.description}
                        </p>
                      </div>

                      {/* Host & Speed Info */}
                      <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Globe size={11} className="text-gray-600" />
                          {server.host}
                        </span>
                        <span className="h-3 w-px bg-white/[0.06]" />
                        <span className="flex items-center gap-1">
                          <Zap size={11} className="text-gray-600" />
                          {server.speed}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <a
                      href={server.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl text-white font-extrabold text-xs sm:text-sm transition-all duration-300 ${server.btnGradient} active:scale-[0.97]`}
                    >
                      <span>Go to FTP</span>
                      <ArrowUpRight
                        size={15}
                        strokeWidth={2.5}
                        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ─── Footer Note ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 sm:mt-16 text-center max-w-lg mx-auto"
          >
            <p className="text-[10px] sm:text-xs text-gray-500/80 leading-relaxed font-medium">
              BDIX FTP servers are hosted within local ISP networks. Maximum
              speed (100 Mbps+) is available when your ISP is peered with BDIX.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
