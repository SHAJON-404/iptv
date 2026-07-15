"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCw,
  RefreshCw,
  ShieldAlert,
  PictureInPicture,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  Check,
  Zap,
  Sliders,
  Monitor,
  Wifi,
  Sparkles
} from "lucide-react";
import { FaTelegram } from "react-icons/fa6";
import { StreamQuality, PlayerEngine, DetectedResolution } from "../../hooks/useVideoPlayer";

const formatBandwidth = (bps?: number) => {
  if (!bps) return "";
  const mbps = (bps / 1000000).toFixed(2);
  let mbpsStr = mbps;
  if (mbps.endsWith(".00")) {
    mbpsStr = mbps.slice(0, -3);
  } else if (mbps.endsWith("0")) {
    mbpsStr = mbps.slice(0, -1);
  }
  return `${mbpsStr} Mbps`;
};

interface ResolutionInfo {
  label: string;
  fullName: string;
  badge: string;
  badgeColorClass: string;
}

const getResolutionInfo = (width: number, height: number): ResolutionInfo => {
  const h = height;
  if (h >= 2160) {
    return {
      label: `${h}p`,
      fullName: `${width}x${height} (4K Ultra HD)`,
      badge: "4K",
      badgeColorClass: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    };
  }
  if (h >= 1440) {
    return {
      label: `${h}p`,
      fullName: `${width}x${height} (2K Quad HD)`,
      badge: "2K",
      badgeColorClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  }
  if (h >= 1080) {
    return {
      label: `${h}p`,
      fullName: `${width}x${height} (1080p Full HD)`,
      badge: "FHD",
      badgeColorClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
  }
  if (h >= 720) {
    return {
      label: `${h}p`,
      fullName: `${width}x${height} (720p HD)`,
      badge: "HD",
      badgeColorClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
  }
  if (h >= 480) {
    return {
      label: `${h}p`,
      fullName: `${width}x${height} (480p SD)`,
      badge: "SD",
      badgeColorClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    };
  }
  return {
    label: `${h}p`,
    fullName: `${width}x${height}`,
    badge: "SD",
    badgeColorClass: "bg-zinc-600/20 text-zinc-500 border-zinc-600/25",
  };
};

interface VideoPlayerViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  playerStatus: "idle" | "loading" | "playing" | "error";
  playerError: string | null;
  isBuffering: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  isPip: boolean;
  showControls: boolean;
  activeSeekIndicator: { side: "left" | "right"; visible: boolean };
  isPipSupported: boolean;
  availableQualities: StreamQuality[];
  currentQuality: number | "auto";
  activeAutoQualityId: number | null;
  detectedResolution: DetectedResolution | null;
  handleQualityChange: (qualityId: number | "auto") => void;
  handlePlayPause: () => void;
  handleMuteUnmute: () => void;
  handleVolumeChangeSlider: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFullscreen: () => void;
  handlePip: () => void;
  handlePlayerClick: (e: React.MouseEvent) => void;
  handlePlayerDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleReload: () => void;
  handleMouseMove: () => void;
  maxQualityMode: boolean;
  handleToggleMaxQuality: () => void;
  playerEngine: PlayerEngine;
  setPlayerEngine: (engine: PlayerEngine) => void;
}

function getFriendlyErrorMessage(rawError: string): { title: string; desc: string } {
  const lower = rawError.toLowerCase();

  if (lower.includes("not supported in ios/ipad os") || lower.includes("ios/ipad os")) {
    return {
      title: "Not Supported on iOS/iPadOS",
      desc: "DASH (.mpd) streams are not supported on iOS/iPadOS due to platform limitations. Please choose an HLS (.m3u8) channel instead.",
    };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return {
      title: "Channel Offline or Not Found (404)",
      desc: "The streaming source is offline or dead. Please contact the developer to update this channel's link.",
    };
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("not authorized")) {
    return {
      title: "Access Forbidden (403)",
      desc: "This stream is geo-blocked, restricted, or requires authorization. Contact the developer to check for alternative sources.",
    };
  }
  if (lower.includes("6020") || lower.includes("drm") || lower.includes("eme")) {
    return {
      title: "DRM / Decryption Key Error",
      desc: "This is an encrypted channel that requires DRM decryption keys. If accessing over a local IP, browsers block EME. Try HTTPS or localhost, or contact the developer.",
    };
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return {
      title: "Connection Timed Out",
      desc: "The streaming server is taking too long to respond. It might be overloaded. Try reconnecting or report this to the developer.",
    };
  }
  if (lower.includes("cors") || lower.includes("cross-origin")) {
    return {
      title: "CORS Access Blocked",
      desc: "The broadcaster has blocked cross-origin web player access. Please report this issue to the developer.",
    };
  }
  if (lower.includes("format") || lower.includes("unsupported") || lower.includes("manifest")) {
    return {
      title: "Unsupported Stream Format",
      desc: "The browser or player engine could not parse this stream format. Please try another channel or contact the developer.",
    };
  }

  return {
    title: "Stream Currently Unavailable",
    desc: "This live TV link might be offline, or blocked by the original broadcaster. Contact the developer if this issue persists.",
  };
}

export const VideoPlayerView = React.memo(function VideoPlayerView({
  videoRef,
  playerContainerRef,
  playerStatus,
  playerError,
  isBuffering,
  isPaused,
  isMuted,
  volume,
  isFullscreen,
  isPip,
  showControls,
  activeSeekIndicator,
  isPipSupported,
  availableQualities,
  currentQuality,
  activeAutoQualityId,
  detectedResolution,
  handleQualityChange,
  handlePlayPause,
  handleMuteUnmute,
  handleVolumeChangeSlider,
  handleFullscreen,
  handlePip,
  handlePlayerClick,
  handlePlayerDoubleClick,
  handleReload,
  handleMouseMove,
  maxQualityMode,
  handleToggleMaxQuality,
  playerEngine,
  setPlayerEngine,
}: VideoPlayerViewProps) {
  const [showSettings, setShowSettings] = React.useState(false);

  // Close settings when clicking outside
  const settingsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".mobile-settings-sheet")) {
        return;
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);

  React.useEffect(() => {
    if (!showControls) {
      setShowSettings(false);
    }
  }, [showControls]);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onClick={handlePlayerClick}
      onDoubleClick={handlePlayerDoubleClick}
      className={`bg-black shadow-2xl group transition-[width,height] duration-200 ${isFullscreen
        ? "relative w-full h-full bg-black"
        : "relative aspect-video max-h-[75vh] mx-auto rounded-2xl md:rounded-3xl overflow-hidden bg-black border border-white/10 sm:border-white/5 w-full"
        } ${showControls ? "cursor-default" : "cursor-none"}`}
      style={!isFullscreen ? { maxWidth: "calc(75vh * 16 / 9)" } : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        className="w-full h-full object-contain bg-black cursor-pointer"
      />

      {/* Tap to Unmute Overlay */}
      {playerStatus === "playing" && isMuted && (
        <div
          className="absolute top-4 right-4 z-30 pointer-events-auto cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleMuteUnmute();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/10 shadow-lg backdrop-blur-md"
          >
            <VolumeX size={14} className="text-primary animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider">
              TAP TO UNMUTE
            </span>
          </motion.div>
        </div>
      )}


      {/* YouTube-like Double Click Seek Visual Ripple Overlay */}
      <AnimatePresence>
        {activeSeekIndicator.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-30 bg-white/5 ${activeSeekIndicator.side === "left"
              ? "left-0 rounded-r-full"
              : "right-0 rounded-l-full"
              }`}
          >
            {activeSeekIndicator.side === "left" ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1 text-white bg-black/60 px-4 py-3 rounded-full backdrop-blur-md border border-white/10"
              >
                <ChevronsLeft className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-xs font-black tracking-widest">-10s</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-1 text-white bg-black/60 px-4 py-3 rounded-full backdrop-blur-md border border-white/10"
              >
                <ChevronsRight className="h-6 w-6 text-primary animate-pulse" />
                <span className="text-xs font-black tracking-widest">+10s</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loader Overlay */}
      {(playerStatus === "loading" || (isBuffering && !isPaused)) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wider text-primary animate-pulse">
            {playerStatus === "loading"
              ? "FETCHING IPTV LIVE STREAM..."
              : "BUFFERING LIVE STREAM..."}
          </span>
        </div>
      )}

      {/* Error/Offline Overlay */}
      {playerStatus === "error" && (() => {
        const { title, desc } = getFriendlyErrorMessage(playerError || "");
        return (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3.5 z-10 px-6 text-center font-sans">
            <ShieldAlert className="text-rose-500 animate-pulse" size={40} />
            <span className="text-base font-bold text-white tracking-tight">
              {title}
            </span>
            {playerError && (
              <span className="text-[10px] sm:text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/10 px-3 py-1.5 rounded-xl max-w-md break-words select-all">
                {playerError}
              </span>
            )}
            <span className="text-xs text-zinc-400 max-w-md leading-relaxed font-medium">
              {desc}
            </span>
            <div className="flex gap-2.5 mt-2 flex-wrap justify-center">
              <button
                onClick={handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer text-white"
              >
                <RefreshCw size={12} />
                <span>Try Reconnecting</span>
              </button>
              <a
                href="https://t.me/shajonOTT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer text-white no-underline"
              >
                <FaTelegram size={12} />
                <span>Contact Developer</span>
              </a>
            </div>
          </div>
        );
      })()}

      {/* Idle Overlay */}
      {playerStatus === "idle" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10">
          <Radio size={40} className="text-zinc-500 animate-pulse" />
          <span className="text-sm text-zinc-300 font-medium">
            Select a channel to play
          </span>
        </div>
      )}

      {/* Custom Controls Overlay */}
      {playerStatus === "playing" && (
        <div
          className={`player-controls absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between transition-all duration-300 z-20 ${showControls
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          {/* Left controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              {isPaused ? (
                <Play size={18} className="fill-white" />
              ) : (
                <Pause size={18} className="fill-white" />
              )}
            </button>
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={handleMuteUnmute}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChangeSlider}
                className="w-16 sm:w-20 h-1.5 rounded-lg appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(isMuted ? 0 : volume) * 100
                    }%, rgba(255, 255, 255, 0.25) ${(isMuted ? 0 : volume) * 100
                    }%, rgba(255, 255, 255, 0.25) 100%)`,
                }}
              />
            </div>
          </div>


          {/* Right controls */}
          <div className="flex items-center gap-2">
            {isPipSupported && (
              <button
                onClick={handlePip}
                className={`p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors ${isPip ? "text-primary bg-white/10" : ""
                  }`}
                title="Picture in Picture"
              >
                <PictureInPicture size={18} />
              </button>
            )}
            <button
              onClick={handleReload}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              title="Reload Stream"
            >
              <RotateCw size={18} />
            </button>

            {/* Settings / Quality Menu */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`px-1.5 py-1 rounded-lg hover:bg-white/10 text-white transition-colors flex items-center gap-1 ${showSettings ? "bg-white/10" : ""
                  }`}
                title="Settings"
              >
                <Sliders size={13} className="text-zinc-400 shrink-0" />
                <span className="text-[13px] sm:text-[14px] font-medium tracking-wide drop-shadow-md flex items-baseline gap-0.5">
                  {availableQualities.length > 1 ? (
                    currentQuality === 'auto' ? (
                      activeAutoQualityId !== null ? (() => {
                        const q = availableQualities.find(q => q.id === activeAutoQualityId);
                        if (!q) return 'Auto';
                        return (
                          <>
                            <span>Auto • {q.name}</span>
                            {q.height && q.height >= 2160 && (
                              <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">4K</sup>
                            )}
                            {q.height && q.height >= 1080 && q.height < 2160 && (
                              <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">HD</sup>
                            )}
                          </>
                        );
                      })() : (
                        detectedResolution ? (() => {
                          const resInfo = getResolutionInfo(detectedResolution.width, detectedResolution.height);
                          return (
                            <>
                              <span>Auto • {resInfo.label}</span>
                              <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">{resInfo.badge}</sup>
                            </>
                          );
                        })() : 'Auto'
                      )
                    ) : (() => {
                      const q = availableQualities.find(q => q.id === currentQuality);
                      if (!q) return 'Auto';
                      return (
                        <>
                          <span>{q.name}</span>
                          {q.height && q.height >= 2160 && (
                            <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">4K</sup>
                          )}
                          {q.height && q.height >= 1080 && q.height < 2160 && (
                            <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">HD</sup>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    detectedResolution ? (() => {
                      const resInfo = getResolutionInfo(detectedResolution.width, detectedResolution.height);
                      return (
                        <>
                          <span>{detectedResolution.width}x{detectedResolution.height}</span>
                          <sup className="text-[9px] font-black text-rose-500 select-none ml-0.5">{resInfo.badge}</sup>
                        </>
                      );
                    })() : 'Settings'
                  )}
                </span>
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="hidden md:block absolute bottom-full right-0 mb-3 w-48 sm:w-52 max-h-[340px] overflow-y-auto custom-scrollbar bg-[#0f0f0f]/90 backdrop-blur-2xl border border-white/10 rounded-2xl py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 origin-bottom-right"
                  >
                    <div className="px-3 py-2 text-sm font-bold text-zinc-200 flex items-center justify-center gap-1.5 mb-1 border-b border-white/10 select-none">
                      <Sliders size={14} className="text-primary" />
                      <span>Stream Settings</span>
                    </div>

                    {detectedResolution && (() => {
                      const resInfo = getResolutionInfo(detectedResolution.width, detectedResolution.height);
                      return (
                        <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent flex flex-col gap-1 select-none text-left relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={10} className="text-primary/70" />
                            <span className="text-[10px] font-black text-zinc-400 tracking-widest">Active Stream</span>
                          </div>
                          <div className="flex items-end justify-between mt-1 z-10 relative">
                            <span className="text-base font-black text-white tracking-tighter drop-shadow-sm">
                              {detectedResolution.width}<span className="text-zinc-500 mx-0.5 font-light">×</span>{detectedResolution.height}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${resInfo.badgeColorClass} bg-white/5 leading-none shadow-sm backdrop-blur-md`}>
                              {resInfo.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-semibold tracking-wide z-10 relative">{resInfo.fullName}</span>
                        </div>
                      );
                    })()}

                    <div className="flex flex-col">
                      {availableQualities.length > 1 && availableQualities.filter(q => q.id !== 'auto').map((q) => {
                        const isActive = currentQuality === q.id;
                        return (
                          <button
                            key={q.id}
                            onClick={() => {
                              handleQualityChange(q.id);
                              setShowSettings(false);
                            }}
                            className={`w-full flex items-center justify-start px-3 py-2 text-sm transition-colors ${isActive
                              ? "bg-white/[0.06] text-white font-bold border-l-2 border-primary"
                              : "text-zinc-300 hover:bg-white/[0.04] hover:text-white border-l-2 border-transparent"
                              }`}
                          >
                            <div className="flex items-center justify-center w-6 mr-1.5 shrink-0">
                              {isActive ? (
                                <Check size={14} className="text-primary" />
                              ) : (
                                <Monitor size={14} className="text-zinc-500" />
                              )}
                            </div>

                            <span className="flex items-baseline justify-start flex-1 pr-2">
                              <span className="flex items-baseline min-w-[62px] shrink-0">
                                <span>{q.name}</span>
                                {q.height && q.height >= 2160 && (
                                  <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">4K</sup>
                                )}
                                {q.height && q.height >= 1440 && q.height < 2160 && (
                                  <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">2K</sup>
                                )}
                                {q.height && q.height >= 1080 && q.height < 1440 && (
                                  <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">HD</sup>
                                )}
                              </span>
                              {q.bandwidth && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-zinc-400 font-medium select-none ml-auto whitespace-nowrap shrink-0">
                                  <Wifi size={10} className="text-zinc-500" />
                                  <span>{formatBandwidth(q.bandwidth)}</span>
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}

                      {/* Auto Option */}
                      {availableQualities.length > 1 && availableQualities.find(q => q.id === 'auto') && (() => {
                        const isActive = currentQuality === 'auto';
                        return (
                          <div className="mt-1 pt-1 border-t border-white/10">
                            <button
                              onClick={() => {
                                handleQualityChange('auto');
                                setShowSettings(false);
                              }}
                              className={`w-full flex items-center justify-start px-3 py-2.5 text-sm transition-colors ${isActive
                                ? "bg-white/[0.06] text-white font-bold border-l-2 border-primary"
                                : "text-zinc-200 hover:bg-white/10 hover:text-white border-l-2 border-transparent"
                                }`}
                            >
                              <div className="flex items-center justify-center w-6 mr-1.5 shrink-0">
                                {isActive ? (
                                  <Check size={16} className="text-primary" />
                                ) : (
                                  <Sparkles size={14} className="text-zinc-500" />
                                )}
                              </div>
                              <span className="flex items-center text-[13px]">
                                Auto
                                {isActive && activeAutoQualityId !== null && (() => {
                                  const q = availableQualities.find(q => q.id === activeAutoQualityId);
                                  if (!q) return null;
                                  return <span className="ml-1 text-white/50">• {q.name}</span>;
                                })()}
                              </span>
                            </button>
                          </div>
                        );
                      })()}

                      {/* Max Quality Mode Toggle */}
                      <div className="mt-1 pt-1.5 border-t border-white/10 px-3 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMaxQuality();
                          }}
                          className="w-full flex items-center justify-between text-xs transition-colors text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Zap size={12} className={maxQualityMode ? "text-amber-400" : "text-zinc-500"} />
                            <span className="font-semibold text-xs">Max Quality</span>
                          </span>
                          <div className={`w-7 h-4 rounded-full transition-colors relative ${maxQualityMode ? 'bg-primary' : 'bg-zinc-600'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${maxQualityMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                      </div>

                      {/* Player Engine Selector */}
                      <div className="mt-1 pt-1.5 border-t border-white/10 px-3 py-2 flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-zinc-400 tracking-wider">Engine</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['auto', 'hls.js', 'shaka', 'video.js'] as const).map(engine => (
                            <button
                              key={engine}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayerEngine(engine);
                              }}
                              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${playerEngine === engine
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-transparent'
                                }`}
                            >
                              {engine === 'auto' ? 'Auto' : engine === 'hls.js' ? 'HLS.js' : engine === 'shaka' ? 'Shaka' : 'Video.js'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Quality Settings Drawer */}
      {(availableQualities.length > 1 || detectedResolution) && (() => {
        const drawerContent = (
          <AnimatePresence>
            {showSettings && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`md:hidden ${isFullscreen ? "absolute" : "fixed"} inset-0 bg-black/60 backdrop-blur-xs z-[9998] mobile-settings-sheet pointer-events-auto`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(false);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                />

                {/* Bottom Sheet Drawer */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 26, stiffness: 220 }}
                  className={`md:hidden ${isFullscreen ? "absolute" : "fixed"} bottom-0 left-0 right-0 max-h-[75%] bg-[#0f0f0f]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[24px] p-4 pb-6 flex flex-col z-[9999] shadow-[0_-12px_40px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.15)] mobile-settings-sheet pointer-events-auto`}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  {/* Drag Notch Indicator */}
                  <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 shrink-0 cursor-pointer" onClick={() => setShowSettings(false)} />

                  {/* Title Header */}
                  <div className="flex items-center gap-2 pb-3 mb-2 border-b border-white/10 shrink-0 select-none">
                    <Sliders size={16} className="text-primary" />
                    <span className="text-sm font-bold tracking-wider text-white">Stream Settings</span>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-xs text-white/90 font-medium px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-colors ml-auto"
                    >
                      Done
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                    {detectedResolution && (() => {
                      const resInfo = getResolutionInfo(detectedResolution.width, detectedResolution.height);
                      return (
                        <div className="px-4 py-4 mb-3 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 flex flex-col gap-1 select-none text-left relative overflow-hidden shadow-lg shadow-black/20">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                          <div className="flex items-center gap-1.5 mb-0.5 relative z-10">
                            <Sparkles size={12} className="text-primary/70" />
                            <span className="text-[11px] font-black text-zinc-400 tracking-widest">Active Stream</span>
                          </div>
                          <div className="flex items-end justify-between relative z-10">
                            <span className="text-xl font-black text-white tracking-tighter drop-shadow-sm">
                              {detectedResolution.width}<span className="text-zinc-500 mx-0.5 font-light">×</span>{detectedResolution.height}
                            </span>
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-md border ${resInfo.badgeColorClass} bg-white/5 leading-none shadow-sm backdrop-blur-md`}>
                              {resInfo.badge}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium tracking-wide mt-0.5 relative z-10">{resInfo.fullName}</span>
                        </div>
                      );
                    })()}

                    {availableQualities.length > 1 && availableQualities.filter(q => q.id !== 'auto').map((q) => {
                      const isActive = currentQuality === q.id;
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            handleQualityChange(q.id);
                            setShowSettings(false);
                          }}
                          className={`w-full flex items-center justify-start px-3 py-3 text-sm rounded-2xl transition-all duration-200 cursor-pointer ${isActive
                            ? "bg-white/[0.06] text-white font-bold border-l-2 border-primary"
                            : "text-zinc-300 active:bg-white/[0.04] border-l-2 border-transparent"
                            }`}
                        >
                          <div className="flex items-center justify-center w-5 mr-3 shrink-0">
                            {isActive ? (
                              <Check size={16} className="text-primary" />
                            ) : (
                              <Monitor size={16} className="text-zinc-500" />
                            )}
                          </div>
                          <span className="flex items-baseline justify-start flex-1 pr-2">
                            <span className="flex items-baseline min-w-[62px] shrink-0">
                              <span className="text-[14px]">{q.name}</span>
                              {q.height && q.height >= 2160 && (
                                <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">4K</sup>
                              )}
                              {q.height && q.height >= 1440 && q.height < 2160 && (
                                <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">2K</sup>
                              )}
                              {q.height && q.height >= 1080 && q.height < 1440 && (
                                <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">HD</sup>
                              )}
                            </span>
                            {q.bandwidth && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-[10px] text-zinc-400 font-medium select-none ml-auto whitespace-nowrap shrink-0">
                                <Wifi size={10} className="text-zinc-500" />
                                <span>{formatBandwidth(q.bandwidth)}</span>
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}

                    {/* Auto Option */}
                    {availableQualities.length > 1 && availableQualities.find(q => q.id === 'auto') && (() => {
                      const isActive = currentQuality === 'auto';
                      return (
                        <div className="mt-1.5 pt-1.5 border-t border-white/10">
                          <button
                            onClick={() => {
                              handleQualityChange('auto');
                              setShowSettings(false);
                            }}
                            className={`w-full flex items-center justify-start px-3 py-3 text-sm rounded-2xl transition-all duration-200 cursor-pointer ${isActive
                              ? "bg-white/[0.06] text-white font-bold border-l-2 border-primary"
                              : "text-zinc-300 active:bg-white/[0.04] border-l-2 border-transparent"
                              }`}
                          >
                            <div className="flex items-center justify-center w-5 mr-3 shrink-0">
                              {isActive ? (
                                <Check size={16} className="text-primary" />
                              ) : (
                                <Sparkles size={16} className="text-zinc-500" />
                              )}
                            </div>
                            <span className="text-[14px] flex items-center">
                              Auto
                              {isActive && activeAutoQualityId !== null && (() => {
                                const q = availableQualities.find(q => q.id === activeAutoQualityId);
                                if (!q) return null;
                                return <span className="ml-1.5 text-white/50 text-[12px]">• {q.name}</span>;
                              })()}
                            </span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Max Quality Toggle */}
                    <div className="mt-1.5 pt-1.5 border-t border-white/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMaxQuality();
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 text-xs rounded-2xl transition-all duration-200 text-zinc-300 active:bg-white/5 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Zap size={14} className={maxQualityMode ? "text-amber-400 fill-amber-400/25" : "text-zinc-500"} />
                          <span className="font-semibold text-[14px]">Max Quality</span>
                        </span>
                        <div className={`w-8 h-4.5 rounded-full transition-all duration-200 relative ${maxQualityMode ? 'bg-primary' : 'bg-zinc-700'}`}>
                          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all duration-200 ${maxQualityMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Player Engine Selector (Mobile) */}
                    <div className="mt-1.5 pt-3 border-t border-white/10 px-3">
                      <span className="text-[11px] font-bold text-zinc-400 tracking-wider mb-2 block">Engine</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['auto', 'hls.js', 'shaka', 'video.js'] as const).map(engine => (
                          <button
                            key={engine}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlayerEngine(engine);
                              setShowSettings(false);
                            }}
                            className={`px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${playerEngine === engine
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-white/5 text-zinc-300 active:bg-white/10 border border-transparent'
                              }`}
                          >
                            {engine === 'auto' ? 'Auto' : engine === 'hls.js' ? 'HLS.js' : engine === 'shaka' ? 'Shaka' : 'Video.js'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        );

        if (isFullscreen) {
          return drawerContent;
        }

        if (typeof window !== "undefined" && document.body) {
          return createPortal(drawerContent, document.body);
        }

        return null;
      })()}
    </div>
  );
});
