"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  HelpCircle,
  ChevronDown,
  Tv,
  ListPlus,
  ShieldAlert,
  MessageCircle,
  Globe,
  BookOpen,
  Scale,
  Mail,
  Users,
} from "lucide-react";

import BackgroundScene from "../components/BackgroundScene";
import Header from "../components/Header";

const faqs = [
  {
    id: "faq-dmca",
    question: "DMCA & Copyright Disclaimer",
    answer:
      "This website is strictly an IPTV player. We do not host, provide, distribute, or sell any IPTV links, playlists, or media content. The player solely reads and plays data from the user's own provided M3U or JSON playlist files.",
    icon: Scale,
  },
  {
    id: "faq-community",
    question: "Are the playlists from Discord/Telegram affiliated with this project?",
    answer:
      "No. This IPTV Player is an independent open-source project. Any playlists shared in our community channels (Discord/Telegram) are provided by users and have absolutely no relation to this project. If you have issues regarding the player's functionality, please create an issue on our GitHub repository and we will solve it.",
    icon: Users,
  },
  {
    id: "faq-1",
    question: "What is IPTV and how does this player work?",
    answer:
      "IPTV (Internet Protocol Television) delivers television content over the internet instead of traditional terrestrial, satellite, or cable formats. This player is a web-based client that plays live streams (such as HLS .m3u8 files) directly in your browser. You can import your own custom playlists to start watching.",
    icon: Tv,
  },
  {
    id: "faq-2",
    question: "How do I load or import custom playlists?",
    answer:
      "To import a custom playlist, click on the 'Playlists Manager' tab inside the channel list section. You can either paste a public M3U URL (e.g., from GitHub) or upload a local playlist file (.m3u, .m3u8, or .json). Once imported, it will be stored securely in your browser cache and appear in the 'Your Playlists' sidebar.",
    icon: ListPlus,
  },
  {
    id: "faq-3",
    question: "Why do some channels fail to load or show 'Stream Unavailable'?",
    answer:
      "Live streams can go offline for various reasons: the stream source is temporarily overloaded, the broadcaster changed the URL, or the stream has geographical restrictions (geo-blocking). If a stream fails to load, try clicking the 'Try Reconnecting' button, or switch to a different channel.",
    icon: ShieldAlert,
  },
  {
    id: "faq-4",
    question: "Do I need to install any app or extensions?",
    answer:
      "No! This IPTV player runs completely in modern web browsers (Chrome, Safari, Edge, Firefox) on mobile devices, tablets, and computers. It has built-in custom HLS (.m3u8) and DASH (.mpd) stream players, so no additional extensions or app installations are required.",
    icon: Globe,
  },
  {
    id: "faq-5",
    question: "Is this service free and legal?",
    answer:
      "Yes, this web player is 100% free to use. We do not host any stream files or media databases. We encourage users to only load playlist links that they have the legal right to stream.",
    icon: BookOpen,
  },
  {
    id: "faq-6",
    question: "How can I contact support or report bugs?",
    answer:
      "For any queries, suggestions, or technical support, please reach out to us via Telegram or Email. You can also follow our official GitHub repository (SHAJON-404/iptv) for code updates, bug reports, and new features.",
    icon: MessageCircle,
  },
];

export default function FAQPage() {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  return (
    <main className="relative min-h-screen text-white overflow-hidden pb-16">
      <BackgroundScene />
      <div className="relative z-10">
        <Header />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          {/* ─── Page Header ─── */}
          <div className="text-center max-w-3xl mx-auto space-y-5 mb-10 sm:mb-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 sm:border-white/5 backdrop-blur-sm"
            >
              <HelpCircle size={14} className="text-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary">
                Help & Knowledgebase
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]"
            >
              Frequently Asked <span className="gradient-text">Questions</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-gray-400 font-medium max-w-xl mx-auto leading-relaxed"
            >
              Got questions about custom playlists, stream issues, or compatibility?
              Find quick answers and guides below.
            </motion.p>
          </div>

          {/* ─── FAQ List (Accordion style with glassmorphism) ─── */}
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const IconComponent = faq.icon;
              const isOpen = activeFaq === faq.id;

              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 sm:border-white/5 bg-white/[0.015] hover:bg-white/[0.04] hover:border-primary/30 backdrop-blur-md transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-none select-none"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="p-2.5 rounded-xl border border-primary/20 bg-primary/10 text-primary flex-shrink-0"
                      >
                        <IconComponent size={18} strokeWidth={2} />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-white leading-tight">
                        {faq.question}
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-zinc-400 flex-shrink-0"
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-white/5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* ─── Support Callout ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 p-6 rounded-2xl border border-white/10 sm:border-white/5 bg-white/[0.01] backdrop-blur-sm text-center max-w-xl mx-auto space-y-4"
          >
            <h3 className="text-base sm:text-lg font-bold">Still have questions?</h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              If you couldn&apos;t find your answer here, feel free to reach out for direct support.
              We are active on Telegram and Email.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://t.me/SHAJON"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <MessageCircle size={15} />
                <span>Contact via Telegram</span>
              </a>
              <a
                href="mailto:shahmakhdumshajon@gmail.com"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/5"
              >
                <Mail size={15} />
                <span>Email Support</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
