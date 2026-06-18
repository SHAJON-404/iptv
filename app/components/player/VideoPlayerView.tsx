"use client";

import React from "react";
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
  Check
} from "lucide-react";
import { FaTelegram } from "react-icons/fa6";
import { StreamQuality } from "../../hooks/useVideoPlayer";

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
}: VideoPlayerViewProps) {
  const [showSettings, setShowSettings] = React.useState(false);

  // Close settings when clicking outside
  const settingsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
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
      className={`bg-black shadow-2xl group transition-[width,height] duration-200 ${
        isFullscreen
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
            className={`absolute inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-30 bg-white/5 ${
              activeSeekIndicator.side === "left"
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
                href="https://t.me/SHAJON"
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
          className={`player-controls absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between transition-all duration-300 z-20 ${
            showControls
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
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${
                    (isMuted ? 0 : volume) * 100
                  }%, rgba(255, 255, 255, 0.25) ${
                    (isMuted ? 0 : volume) * 100
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
                className={`p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors ${
                  isPip ? "text-primary bg-white/10" : ""
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
            {availableQualities.length > 1 && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`px-1.5 py-1 rounded-lg hover:bg-white/10 text-white transition-colors ${
                    showSettings ? "bg-white/10" : ""
                  }`}
                  title="Quality"
                >
                  <span className="text-[13px] sm:text-[15px] font-medium tracking-wide drop-shadow-md flex items-baseline gap-0.5">
                    {currentQuality === 'auto' ? 'Auto' : (() => {
                      const q = availableQualities.find(q => q.id === currentQuality);
                      if (!q) return 'Auto';
                      return (
                        <>
                          <span>{q.name}</span>
                          {q.height && q.height >= 2160 && (
                            <sup className="text-[9px] font-black text-rose-500 select-none">4K</sup>
                          )}
                          {q.height && q.height >= 1080 && q.height < 2160 && (
                            <sup className="text-[9px] font-black text-rose-500 select-none">HD</sup>
                          )}
                          {q.bandwidth && (
                            <span className="text-white/70 text-xs font-normal">
                              &nbsp;&nbsp;{formatBandwidth(q.bandwidth)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </span>
                </button>
                
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full right-0 mb-3 w-48 sm:w-52 max-h-[160px] sm:max-h-[240px] overflow-y-auto custom-scrollbar bg-[#0f0f0f]/80 backdrop-blur-2xl border border-white/10 rounded-2xl py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 origin-bottom-right"
                    >
                      <div className="px-3 py-2 text-sm font-bold text-white flex items-center justify-center mb-1 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowSettings(false)}>
                        Quality
                      </div>
                      {availableQualities.filter(q => q.id !== 'auto').map((q) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            handleQualityChange(q.id);
                            setShowSettings(false);
                          }}
                          className={`w-full flex items-center justify-start px-3 py-2.5 text-sm transition-colors ${
                            currentQuality === q.id
                              ? "bg-white/10 text-white font-bold"
                              : "text-zinc-200 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-center w-6 mr-1.5">
                            {currentQuality === q.id && <Check size={16} className="text-white" />}
                          </div>
                          <span className="flex items-baseline justify-start flex-1 pr-2">
                            <span className="flex items-baseline min-w-[62px] shrink-0">
                              <span>{q.name}</span>
                              {q.height && q.height >= 2160 && (
                                <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">4K</sup>
                              )}
                              {q.height && q.height >= 1080 && q.height < 2160 && (
                                <sup className="text-[9px] font-black text-rose-500 ml-0.5 select-none">HD</sup>
                              )}
                            </span>
                            {q.bandwidth && (
                              <span className="text-zinc-400 text-xs font-normal ml-2 select-none whitespace-nowrap">
                                {formatBandwidth(q.bandwidth)}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}

                      {/* Auto Option at the bottom */}
                      {availableQualities.find(q => q.id === 'auto') && (
                        <div className="mt-1 pt-1 border-t border-white/10">
                          <button
                            onClick={() => {
                              handleQualityChange('auto');
                              setShowSettings(false);
                            }}
                            className={`w-full flex items-center justify-start px-3 py-2.5 text-sm transition-colors ${
                              currentQuality === 'auto'
                                ? "bg-white/10 text-white font-bold"
                                : "text-zinc-200 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-center w-6 mr-1.5">
                              {currentQuality === 'auto' && <Check size={16} className="text-white" />}
                            </div>
                            <span className="flex items-center">Auto</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
