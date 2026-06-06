"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { ExternalLink, Database, Network, ArrowRight } from "lucide-react";

const BackgroundScene = dynamic(
  () => import("../components/BackgroundScene"),
  { ssr: false }
);

const Header = dynamic(() => import("../components/Header"), { ssr: false });

const ftpServers = [
  {
    id: "server-1",
    name: "Infobase FTP",
    url: "http://103.225.94.27/Infobase/",
    description: "High-speed BDIX local movie portal, TV shows, games, and software archive. Access is extremely fast on supported ISP lines.",
    badge: "BDIX Multi-Gigabit",
    icon: Database,
    color: "from-blue-500/20 to-indigo-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10",
    iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    btnColor: "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20"
  },
  {
    id: "server-2",
    name: "FTPBD Server",
    url: "https://server1.ftpbd.net/#blog",
    description: "Popular media server with fresh releases, blog reviews, extensive movie library, series, games, and direct downloads.",
    badge: "BDIX Premium Link",
    icon: Network,
    color: "from-purple-500/20 to-violet-500/20 hover:border-purple-500/40 hover:shadow-purple-500/10",
    iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    btnColor: "bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/20"
  }
];

export default function FtpPage() {
  return (
    <main className="relative min-h-screen text-white overflow-hidden pb-16">
      <BackgroundScene />
      <div className="relative z-10">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          {/* Page Title & Intro */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary shadow-lg shadow-primary/5"
            >
              <Network size={12} className="animate-pulse" />
              <span>BDIX Local Network</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl font-black tracking-tight leading-none"
            >
              High-Speed <span className="gradient-text">FTP Servers</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-gray-400 font-medium"
            >
              Access local high-speed entertainment archives. Enjoy zero-buffer movie streaming, massive software directories, and high-speed game downloads directly from local BDIX servers.
            </motion.p>
          </div>

          {/* Servers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {ftpServers.map((server, idx) => {
              const IconComponent = server.icon;
              return (
                <motion.div
                  key={server.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                  className={`glass-card p-6 sm:p-8 border border-white/5 rounded-3xl bg-gradient-to-br ${server.color} flex flex-col justify-between h-[280px] sm:h-[320px] transition-all duration-500 hover:-translate-y-1 group`}
                >
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl border ${server.iconColor}`}>
                        <IconComponent size={24} />
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold text-emerald-400 tracking-wider uppercase select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Online</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                        {server.badge}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        {server.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-medium line-clamp-3">
                        {server.description}
                      </p>
                    </div>
                  </div>

                  <a
                    href={server.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md ${server.btnColor} active:scale-95`}
                  >
                    <span>Connect Server</span>
                    <ExternalLink size={14} className="stroke-[2.5]" />
                  </a>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 sm:mt-16 text-center max-w-md mx-auto"
          >
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal font-medium">
              Note: BDIX FTP servers are hosted within local ISP networks. You will get maximum speed (up to 100Mbps+) if your ISP is peered with BDIX, or if you are using a local ISP link.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
