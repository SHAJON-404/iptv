"use client";

/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect, useRef, useCallback } from "react";
import type Hls from "hls.js";
import { Channel, getIsIOS } from "./useIPTVPlaylists";
import { useStreamGuardian } from "./useStreamGuardian";

// shaka-player is loaded dynamically because it requires `window` (browser-only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShakaPlayer = any;

// Electron Desktop API exposed via preload.js
interface ElectronDesktopAPI {
  platform: string;
  isDesktop: boolean;
  preventSleep: (enable: boolean) => Promise<boolean>;
  getSystemMemory: () => Promise<{ totalMemoryMB: number; freeMemoryMB: number }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronDesktopAPI;
  }
}

export interface TrendingChannel {
  name: string;
  logo: string;
  url: string;
  group: string;
  viewers: number;
}

const getPlayableUrl = (url: string, useProxy?: boolean, referer?: string, customHeaders?: Record<string, string>) => {
  if (useProxy && url && (url.startsWith("http://") || url.startsWith("https://"))) {
    let proxyUrl = `/api/iptv/proxy?url=${encodeURIComponent(url)}`;
    if (referer) {
      proxyUrl += `&referer=${encodeURIComponent(referer)}`;
    }
    // Forward custom headers (user-agent, origin, x-playback-session-id) as base64-encoded JSON
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      const b64 = btoa(JSON.stringify(customHeaders));
      proxyUrl += `&headers=${encodeURIComponent(b64)}`;
    }
    return proxyUrl;
  }
  return url;
};

// Memory cache for CORS check results to avoid repeating network requests on quality changes/reloads
const corsSupportCache = new Map<string, boolean>();

const checkCorsSupport = async (url: string): Promise<boolean> => {
  if (corsSupportCache.has(url)) {
    return corsSupportCache.get(url)!;
  }

  // If the target URL is HTTP but the page is HTTPS, fetch will fail due to Mixed Content
  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  if (isHttpsPage && url.startsWith("http://")) {
    corsSupportCache.set(url, false);
    return false;
  }

  try {
    // Attempt a HEAD request first (lightweight) with a 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeoutId);
    const supportsCors = res.ok;
    corsSupportCache.set(url, supportsCors);
    return supportsCors;
  } catch {
    try {
      // Fallback: Some CDNs block HEAD requests. Attempt GET with a small range and 3-second timeout.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const supportsCors = res.ok;
      corsSupportCache.set(url, supportsCors);
      return supportsCors;
    } catch {
      corsSupportCache.set(url, false);
      return false;
    }
  }
};


export interface StreamQuality {
  id: number | "auto";
  name: string;
  height?: number;
  bandwidth?: number;
}

export interface DetectedResolution {
  width: number;
  height: number;
}

export type PlayerEngine = "auto" | "hls.js" | "shaka" | "video.js";

export function useVideoPlayer(
  selectedChannel: Channel | null,
  retryKey: number,
  setRetryKey: React.Dispatch<React.SetStateAction<number>>,
  onChannelFail?: () => void
) {
  const [playerError, setPlayerErrorState] = useState<string | null>(null);
  const latestErrorRef = useRef<string | null>(null);
  const setPlayerError = useCallback((msg: string | null) => {
    latestErrorRef.current = msg;
    setPlayerErrorState(msg);
  }, []);

  const [isBuffering, setIsBuffering] = useState(false);
  const [playerEngine, setPlayerEngineState] = useState<PlayerEngine>("auto");
  const setPlayerEngine = useCallback((engine: PlayerEngine) => {
    setPlayerEngineState(engine);
    setRetryKey(prev => prev + 1);
  }, [setRetryKey]);

  const [playerStatus, setPlayerStatusState] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");

  const errorRetryCountRef = useRef(0);
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Whether the user intentionally paused (for StreamGuardian auto-pause prevention) */
  const userPausedRef = useRef(false);
  /** Whether auto-recovery is currently in progress */
  const [isAutoRecovering, setIsAutoRecovering] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);

  /** Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, 16s (capped) */
  const getRecoveryDelay = (attempt: number): number => {
    return Math.min(1000 * Math.pow(2, attempt), 16000);
  };

  const setPlayerStatus = useCallback((status: "idle" | "loading" | "playing" | "error") => {
    setPlayerStatusState(status);

    if (status === "playing") {
      errorRetryCountRef.current = 0;
      setIsAutoRecovering(false);
      setRecoveryAttempt(0);
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    }

    if (status === "error") {
      const err = latestErrorRef.current || "";
      const isIOSUnsupported = err.toLowerCase().includes("not supported in ios");

      if (isIOSUnsupported) {
        console.log("[Player Error] Permanent platform error. Skipping recovery retry.");
        return;
      }

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }

      // ── 6-Stage Tiered Recovery with Exponential Backoff ──────────────
      const MAX_RECOVERY_ATTEMPTS = 6;

      if (errorRetryCountRef.current >= MAX_RECOVERY_ATTEMPTS) {
        console.warn(`[Player Error] Max recovery attempts (${MAX_RECOVERY_ATTEMPTS}) reached. Switching channel...`);
        errorRetryCountRef.current = 0;
        setIsAutoRecovering(false);
        setRecoveryAttempt(0);
        if (recoveryTimeoutRef.current) {
          clearTimeout(recoveryTimeoutRef.current);
          recoveryTimeoutRef.current = null;
        }
        if (onChannelFailRef.current) {
          onChannelFailRef.current();
        }
      } else {
        const attempt = errorRetryCountRef.current;
        errorRetryCountRef.current += 1;
        const delay = getRecoveryDelay(attempt);
        setIsAutoRecovering(true);
        setRecoveryAttempt(attempt + 1);

        console.log(
          `[Player Recovery] Stage ${attempt + 1}/${MAX_RECOVERY_ATTEMPTS} ` +
          `in ${delay / 1000}s (exponential backoff)...`
        );

        recoveryTimeoutRef.current = setTimeout(() => {
          const channel = loadedChannelRef.current;
          if (!channel) return;

          switch (attempt) {
            case 0:
              // Stage 1: Soft recovery — restart loading / retry streaming
              console.log("[Player Recovery] Stage 1: Soft recovery (startLoad/retryStreaming)");
              try {
                if (hlsRef.current) {
                  hlsRef.current.startLoad(-1);
                  return;
                }
                if (shakaRef.current) {
                  shakaRef.current.retryStreaming();
                  return;
                }
              } catch { /* fall through to re-init */ }
              initializeStreamRef.current(channel, false, channel.useProxy);
              break;

            case 1:
              // Stage 2: Media error recovery
              console.log("[Player Recovery] Stage 2: Media error recovery");
              try {
                if (hlsRef.current) {
                  hlsRef.current.recoverMediaError();
                  return;
                }
              } catch { /* fall through */ }
              initializeStreamRef.current(channel, false, channel.useProxy);
              break;

            case 2:
              // Stage 3: Full re-initialization (same proxy mode)
              console.log("[Player Recovery] Stage 3: Full re-initialization (same proxy)");
              initializeStreamRef.current(channel, false, channel.useProxy);
              break;

            case 3:
              // Stage 4: Toggle proxy mode
              console.log("[Player Recovery] Stage 4: Toggle proxy mode");
              initializeStreamRef.current(channel, false, !channel.useProxy);
              break;

            case 4:
              // Stage 5: Switch engine (try Shaka if on HLS, try HLS if on Shaka)
              console.log("[Player Recovery] Stage 5: Switch player engine");
              if (hlsRef.current) {
                initializeStreamRef.current(channel, false, channel.useProxy, "shaka");
              } else if (shakaRef.current) {
                initializeStreamRef.current(channel, false, channel.useProxy, "hls.js");
              } else {
                initializeStreamRef.current(channel, false, channel.useProxy, "shaka");
              }
              break;

            case 5:
              // Stage 6: Final full reload attempt
              console.log("[Player Recovery] Stage 6: Final reload attempt");
              initializeStreamRef.current(channel, false, channel.useProxy);
              break;

            default:
              initializeStreamRef.current(channel, false, channel.useProxy);
              break;
          }
        }, delay);
      }
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Custom Player controls states
  const [isPaused, setIsPaused] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isFullscreenRef = useRef(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmuteCleanupRef = useRef<(() => void) | null>(null);

  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<ShakaPlayer | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videojsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mpegtsRef = useRef<any>(null);
  const userMutedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const loadedUrlRef = useRef<string | null>(null);
  const loadedChannelRef = useRef<Channel | null>(null);
  const nativeErrorCleanupRef = useRef<(() => void) | null>(null);
  const lastRetryKeyRef = useRef(retryKey);
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [topChannels, setTopChannels] = useState<TrendingChannel[]>([]);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackAttemptRef = useRef(0);
  const onChannelFailRef = useRef(onChannelFail);
  useEffect(() => { onChannelFailRef.current = onChannelFail; }, [onChannelFail]);

  const playerStatusRef = useRef(playerStatus);
  useEffect(() => { playerStatusRef.current = playerStatus; }, [playerStatus]);
  const isBufferingRef = useRef(isBuffering);
  useEffect(() => { isBufferingRef.current = isBuffering; }, [isBuffering]);
  const hasPlayedRef = useRef(hasPlayed);
  useEffect(() => { hasPlayedRef.current = hasPlayed; }, [hasPlayed]);

  // Listen for global viewer count updates from ViewerTracker
  useEffect(() => {
    const handleViewerCount = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number; topChannels?: TrendingChannel[] }>;
      setViewerCount(customEvent.detail.count);
      if (customEvent.detail.topChannels) {
        setTopChannels(customEvent.detail.topChannels);
      }
    };
    window.addEventListener("iptv-viewer-count", handleViewerCount);
    return () => window.removeEventListener("iptv-viewer-count", handleViewerCount);
  }, []);

  // Quality Customization States
  const [availableQualities, setAvailableQualities] = useState<StreamQuality[]>([{ id: "auto", name: "Auto" }]);
  const [currentQuality, setCurrentQuality] = useState<number | "auto">("auto");
  const [activeAutoQualityId, setActiveAutoQualityId] = useState<number | null>(null);
  const [detectedResolution, setDetectedResolution] = useState<DetectedResolution | null>(null);

  // Max Quality Mode — by default ON, prioritizes quality over latency
  const [maxQualityMode, setMaxQualityMode] = useState(true);
  const maxQualityModeRef = useRef(true);

  // Note: Viewer tracking has been moved to the global ViewerTracker component.

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    maxQualityModeRef.current = maxQualityMode;
  }, [maxQualityMode]);

  // YouTube-like Double Tap Seek State
  const [activeSeekIndicator, setActiveSeekIndicator] = useState<{
    side: "left" | "right";
    visible: boolean;
  }>({ side: "left", visible: false });
  const seekIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  const setupUnmuteOnInteraction = useCallback(() => {
    if (unmuteCleanupRef.current) {
      unmuteCleanupRef.current();
    }

    const container = playerContainerRef.current;
    const target = container || document;

    const unmute = () => {
      const v = videoRef.current;
      if (v && v.muted) {
        v.muted = false;
        setIsMuted(false);
        if (v.volume === 0) {
          v.volume = 1.0;
          setVolume(1.0);
        }
      }
      cleanup();
    };

    const cleanup = () => {
      target.removeEventListener("click", unmute as EventListener);
      target.removeEventListener("touchstart", unmute as EventListener);
      target.removeEventListener("keydown", unmute as EventListener);
      unmuteCleanupRef.current = null;
    };

    target.addEventListener("click", unmute as EventListener);
    target.addEventListener("touchstart", unmute as EventListener);
    target.addEventListener("keydown", unmute as EventListener);
    unmuteCleanupRef.current = cleanup;
  }, []);

  // Auto-hide controls after 3s if video is playing
  useEffect(() => {
    const timeout = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        setShowControls(false);
      }
    }, 3000);
    controlsTimeoutRef.current = timeout;
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (unmuteCleanupRef.current) {
        unmuteCleanupRef.current();
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      isFullscreenRef.current = isFs;
      window.dispatchEvent(new CustomEvent("iptv-fullscreen", { detail: { isFullscreen: isFs } }));
      setIsFullscreen(isFs);
      if (!isFs) {
        setTimeout(() => {
          try {
            const orientation = window.screen?.orientation as ScreenOrientation & {
              lock?: (orientation: string) => Promise<void>;
              unlock?: () => void;
            };
            if (orientation && typeof orientation.unlock === "function") {
              orientation.unlock();
            }
          } catch { /* ignore */ }
        }, 150);
      }
    };

    const video = videoRef.current;
    const handleiOSFullscreenBegin = () => {
      isFullscreenRef.current = true;
      window.dispatchEvent(new CustomEvent("iptv-fullscreen", { detail: { isFullscreen: true } }));
      setIsFullscreen(true);
    };
    const handleiOSFullscreenEnd = () => {
      isFullscreenRef.current = false;
      window.dispatchEvent(new CustomEvent("iptv-fullscreen", { detail: { isFullscreen: false } }));
      setIsFullscreen(false);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    if (video) {
      video.addEventListener("webkitbeginfullscreen", handleiOSFullscreenBegin);
      video.addEventListener("webkitendfullscreen", handleiOSFullscreenEnd);
    }
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", handleiOSFullscreenBegin);
        video.removeEventListener("webkitendfullscreen", handleiOSFullscreenEnd);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPaused(false);
      setHasPlayed(true);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
    const handlePause = () => setIsPaused(true);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlayingEvent = () => setIsBuffering(false);
    const handleSeeking = () => setIsBuffering(true);
    const handleSeeked = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlayingEvent);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("canplay", handleCanPlay);

    const handleResolutionChange = () => {
      if (video.videoWidth && video.videoHeight) {
        setDetectedResolution({
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
    };

    video.addEventListener("resize", handleResolutionChange);
    video.addEventListener("loadedmetadata", handleResolutionChange);
    video.addEventListener("playing", handleResolutionChange);

    setIsPaused(video.paused);
    setIsMuted(video.muted);
    setVolume(video.volume);

    if (video.videoWidth && video.videoHeight) {
      setDetectedResolution({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlayingEvent);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("resize", handleResolutionChange);
      video.removeEventListener("loadedmetadata", handleResolutionChange);
      video.removeEventListener("playing", handleResolutionChange);
    };
  }, [selectedChannel, retryKey]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false; // User wants to play
      if (video.muted && !userMutedRef.current) {
        video.muted = false;
        setIsMuted(false);
        if (video.volume === 0) {
          video.volume = 1.0;
          setVolume(1.0);
        }
      }
      video.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Play failed:", err);
        }
      });
    } else {
      userPausedRef.current = true; // User intentionally paused
      video.pause();
    }
    resetControlsTimeout();
  };

  const handleMuteUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      userMutedRef.current = false;
      if (video.volume === 0) {
        video.volume = 1.0;
        setVolume(1.0);
      }
    } else {
      video.muted = true;
      userMutedRef.current = true;
    }
    resetControlsTimeout();
  };

  const handleVolumeChangeSlider = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = parseFloat(e.target.value);
    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0) {
      video.muted = false;
      userMutedRef.current = false;
    } else {
      video.muted = true;
      userMutedRef.current = true;
    }
    resetControlsTimeout();
  };

  const handleFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const videoEl = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    };

    const isIOS = getIsIOS();
    if (isIOS && videoEl) {
      if (videoEl.webkitDisplayingFullscreen && videoEl.webkitExitFullscreen) {
        videoEl.webkitExitFullscreen();
      } else if (videoEl.webkitEnterFullscreen) {
        videoEl.webkitEnterFullscreen();
      }
      resetControlsTimeout();
      return;
    }

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => {
          setTimeout(() => {
            try {
              const orientation = window.screen?.orientation as ScreenOrientation & {
                lock?: (orientation: string) => Promise<void>;
                unlock?: () => void;
              };
              if (orientation && typeof orientation.lock === "function") {
                orientation
                  .lock("landscape")
                  .catch(() => { /* orientation lock not supported */ });
              }
            } catch { /* ignore */ }
          }, 300);
        })
        .catch((err) => console.warn("Fullscreen request failed:", err));
    } else {
      document
        .exitFullscreen()
        .catch((err) => console.warn("Exit fullscreen failed:", err));
    }
    resetControlsTimeout();
  };

  const handleSeek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const seekable = video.seekable;
      let newTime = video.currentTime + seconds;

      if (seekable && seekable.length > 0) {
        const start = seekable.start(0);
        const end = seekable.end(seekable.length - 1);
        if (newTime < start) newTime = start;
        if (newTime > end) newTime = end;
      } else if (video.duration) {
        if (newTime < 0) newTime = 0;
        if (newTime > video.duration) newTime = video.duration;
      }

      video.currentTime = newTime;
    } catch (err) {
      console.warn("Seeking failed:", err);
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPip = () => setIsPip(true);
    const handleLeavePip = () => setIsPip(false);

    video.addEventListener("enterpictureinpicture", handleEnterPip);
    video.addEventListener("leavepictureinpicture", handleLeavePip);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPip);
      video.removeEventListener("leavepictureinpicture", handleLeavePip);
    };
  }, [selectedChannel, retryKey]);

  const handlePip = async () => {
    const video = videoRef.current;
    if (!video) return;

    const videoEl = video as HTMLVideoElement & {
      webkitSupportsPresentationMode?: (mode: string) => boolean;
      webkitSetPresentationMode?: (mode: string) => void;
      webkitPresentationMode?: string;
    };

    try {
      if (videoEl.webkitSupportsPresentationMode?.("picture-in-picture")) {
        const currentMode = videoEl.webkitPresentationMode;
        videoEl.webkitSetPresentationMode?.(
          currentMode === "picture-in-picture" ? "inline" : "picture-in-picture"
        );
      } else if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("Failed to toggle Picture-in-Picture:", err);
    }
    resetControlsTimeout();
  };

  const isPipSupported =
    typeof document !== "undefined" &&
    (document.pictureInPictureEnabled ||
      typeof (HTMLVideoElement.prototype as HTMLVideoElement & { webkitSupportsPresentationMode?: unknown }).webkitSupportsPresentationMode === "function");

  const handlePlayerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".player-controls")) {
      return;
    }

    if (playerStatus !== "playing") {
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      // Always show controls and reset the 3s auto-hide timer.
      // If controls are already visible, this just resets the countdown.
      resetControlsTimeout();
      clickTimeoutRef.current = null;
    }, 250);
  };

  const handlePlayerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".player-controls")) {
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    const container = playerContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const isLeft = clickX < width / 2;

    handleSeek(isLeft ? -10 : 10);

    if (seekIndicatorTimeoutRef.current) {
      clearTimeout(seekIndicatorTimeoutRef.current);
    }
    setActiveSeekIndicator({
      side: isLeft ? "left" : "right",
      visible: true,
    });

    seekIndicatorTimeoutRef.current = setTimeout(() => {
      setActiveSeekIndicator((prev) => ({ ...prev, visible: false }));
    }, 650);
  };

  const handleQualityChange = useCallback((qualityId: number | "auto") => {
    setCurrentQuality(qualityId);
    const isMaxQ = maxQualityModeRef.current;

    if (shakaRef.current) {
      const player = shakaRef.current;
      if (qualityId === "auto") {
        player.configure({
          abr: { enabled: true },
          streaming: {
            rebufferingGoal: isMaxQ ? 20 : 10,
            bufferingGoal: isMaxQ ? 180 : 90,
            bufferBehind: isMaxQ ? 120 : 60,
          },
        });
      } else {
        player.configure({
          abr: { enabled: false },
          streaming: {
            rebufferingGoal: isMaxQ ? 20 : 10,
            bufferingGoal: isMaxQ ? 180 : 90,
            bufferBehind: isMaxQ ? 120 : 60,
          },
        });
        const tracks = player.getVariantTracks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const selectedTrack = tracks.find((t: any) => t.id === qualityId);
        if (selectedTrack) {
          player.selectVariantTrack(selectedTrack, true);
        }
      }
    } else if (hlsRef.current) {
      const hls = hlsRef.current;
      if (qualityId === "auto") {
        hls.currentLevel = -1;
        if (isMaxQ) {
          hls.config.maxBufferLength = 180;
          hls.config.maxMaxBufferLength = 600;
        }
      } else {
        hls.currentLevel = qualityId as number;
        hls.nextLevel = qualityId as number;
        if (isMaxQ) {
          hls.config.maxBufferLength = 180;
          hls.config.maxMaxBufferLength = 600;
        }
      }
    }

    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initializeStreamRef = useRef<any>(null);
  const initializeStream = useCallback(
    (initialChan: Channel, isUserClick: boolean, overrideProxyMode?: boolean, overrideEngine?: PlayerEngine) => {
      initializeStreamRef.current = initializeStream;
      const video = videoRef.current;
      if (!video) return;

      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }

      if (isUserClick || (loadedChannelRef.current && loadedChannelRef.current.id !== initialChan.id)) {
        errorRetryCountRef.current = 0;
      }

      setPlayerStatus("loading");
      setPlayerError(null);
      setIsBuffering(false);
      setHasPlayed(false);
      setAvailableQualities([{ id: "auto", name: "Auto" }]);
      setCurrentQuality("auto");
      setActiveAutoQualityId(null);
      setDetectedResolution(null);
      loadedUrlRef.current = initialChan.url;
      loadedChannelRef.current = initialChan;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (shakaRef.current) {
        shakaRef.current.destroy().catch(() => { });
        shakaRef.current = null;
      }

      if (videojsRef.current) {
        try {
          // Do not call dispose() because it destroys the video element
          videojsRef.current.pause();
          videojsRef.current.removeAttribute('src');
          videojsRef.current.load();
        } catch { /* ignore */ }
      }

      if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
      }

      video.pause();
      if (nativeErrorCleanupRef.current) {
        nativeErrorCleanupRef.current();
        nativeErrorCleanupRef.current = null;
      }

      // Check if it is a DASH/TS stream and we are on iOS/iPadOS
      const cleanUrlStr = (initialChan.url || "").split(/[?#]/)[0].toLowerCase();
      const isDashStream = initialChan.type === "dash" || cleanUrlStr.endsWith(".mpd");
      const isHlsStream = initialChan.type === "hls" || cleanUrlStr.endsWith(".m3u8") || cleanUrlStr.endsWith(".m3u");
      const isTsStream = !isDashStream && !isHlsStream && (cleanUrlStr.endsWith(".ts") || initialChan.type === "ts");
      if ((isDashStream || isTsStream) && getIsIOS()) {
        setPlayerStatus("error");
        setPlayerError("DASH/TS streams are not supported in iOS/iPad OS");
        return;
      }

      if (isUserClick) {
        if (!userMutedRef.current) {
          video.muted = false;
          setIsMuted(false);
          if (video.volume === 0) {
            video.volume = 1.0;
            setVolume(1.0);
          }
        } else {
          video.muted = true;
          setIsMuted(true);
        }

        const unlockPromise = video.play();
        if (unlockPromise !== undefined) {
          unlockPromise.catch(() => { /* ignore */ });
        }
      } else {
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;
      }

      video.removeAttribute("src");
      if (!getIsIOS()) {
        video.load();
      }

      setTimeout(() => {
        if (loadedUrlRef.current !== initialChan.url) return;

        (async () => {
          let dynamicUseProxy = initialChan.useProxy ?? false;
          let corsStatusText = "Initial setting";

          if (initialChan.referer) {
            // Referer streams must be proxied to pass custom headers
            dynamicUseProxy = true;
            corsStatusText = "Referer set (forcing proxy)";
          } else if (getIsIOS() && (initialChan.url.includes(".m3u8") || initialChan.type === "hls")) {
            // Safari/iOS can play HLS directly bypassing JS CORS rules
            dynamicUseProxy = false;
            corsStatusText = "iOS native HLS (bypassing proxy)";
          } else if (initialChan.url) {
            const supportsCors = await checkCorsSupport(initialChan.url);
            if (supportsCors) {
              dynamicUseProxy = false;
              corsStatusText = "URL supports CORS (bypassing proxy)";
            } else {
              dynamicUseProxy = true;
              corsStatusText = "CORS check failed (routing via proxy)";
            }
          }

          if (overrideProxyMode !== undefined) {
            dynamicUseProxy = overrideProxyMode;
            fallbackAttemptRef.current = 1;
            corsStatusText = `Override active: useProxy=${overrideProxyMode}`;
          } else {
            fallbackAttemptRef.current = 0;
          }

          // Force proxy for HTTP URLs if we are on HTTPS to prevent Mixed Content blocking
          const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
          const isHttpStream = (initialChan.url || "").startsWith("http://");
          if (isHttpsPage && isHttpStream) {
            dynamicUseProxy = true;
            corsStatusText = "Insecure HTTP stream on HTTPS page (forcing proxy to avoid Mixed Content)";
          }

          console.log(`[CORS Check] ${corsStatusText}. Result url: ${dynamicUseProxy ? "via proxy" : "direct"}`);

          const chan = {
            ...initialChan,
            useProxy: dynamicUseProxy,
          };

          if (loadedUrlRef.current !== chan.url) return;

          // Start fallback timer — 15s total (8s first attempt, 7s fallback)
          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

          // Intermediate health check at 5s: if video has data but no playing event, force play
          const intermediateCheckTimer = setTimeout(() => {
            const v = videoRef.current;
            if (v && !hasPlayedRef.current && v.readyState >= 3) {
              console.log("[Fallback] 5s intermediate check: readyState>=3 but not playing. Forcing play...");
              v.play().catch(() => { /* ignore */ });
            }
          }, 5000);

          const currentAttemptTimeout = fallbackAttemptRef.current === 0 ? 8000 : 7000;

          fallbackTimerRef.current = setTimeout(() => {
            clearTimeout(intermediateCheckTimer);
            if (!hasPlayedRef.current) {
              if (fallbackAttemptRef.current === 0) {
                if (dynamicUseProxy && isHttpsPage && isHttpStream) {
                  // Cannot fallback to direct (useProxy = false) due to Mixed Content
                  console.log(`Stream failed to play within 8s. Cannot fallback to direct HTTP under HTTPS, retrying proxy reload...`);
                  initializeStream(initialChan, false, true);
                } else {
                  console.log(`Stream failed to play within 8s, trying fallback proxy mode (useProxy=${!dynamicUseProxy})...`);
                  initializeStream(initialChan, false, !dynamicUseProxy);
                }
              } else {
                console.log("Fallback also failed, switching channel...");
                if (onChannelFailRef.current) onChannelFailRef.current();
              }
            }
          }, currentAttemptTimeout);

          const isMaxQuality = maxQualityModeRef.current;

          const attemptPlay = () => {
            video
              .play()
              .then(() => {
                setPlayerStatus("playing");
                setIsPaused(false);
              })
              .catch((err) => {
                if (err.name === "NotAllowedError") {
                  video.muted = true;
                  setIsMuted(true);
                  video
                    .play()
                    .then(() => {
                      setPlayerStatus("playing");
                      setIsPaused(false);
                      setupUnmuteOnInteraction();
                    })
                    .catch((playErr) => {
                      if (playErr.name !== "AbortError") {
                        console.error("Muted autoplay also failed:", playErr);
                      }
                      setPlayerStatus("playing");
                      setIsPaused(true);
                    });
                } else {
                  if (err.name !== "AbortError") {
                    console.warn("Play failed:", err);
                  }
                  setPlayerStatus("playing");
                  setIsPaused(video.paused);
                }
              });
          };

          const cleanChanUrlStr = (chan.url || "").split(/[?#]/)[0].toLowerCase();
          const isDash = chan.type === "dash" || cleanChanUrlStr.endsWith(".mpd");
          const isHls = chan.type === "hls" || cleanChanUrlStr.endsWith(".m3u8") || cleanChanUrlStr.endsWith(".m3u");
          const isTs = !isDash && !isHls && (cleanChanUrlStr.endsWith(".ts") || chan.type === "ts");

          const forceEngine = overrideEngine || playerEngine;
          const useShaka = forceEngine === "shaka" || (forceEngine === "auto" && isDash);
          const useVideoJs = forceEngine === "video.js";
          const useTs = forceEngine === "auto" && isTs;

          if (useVideoJs) {
            (async () => {
              try {
                const videojsModule = await import("video.js");
                const videojs = videojsModule.default || videojsModule;
                await import("video.js/dist/video-js.css");

                if (loadedUrlRef.current !== initialChan.url) return;

                const playableUrl = getPlayableUrl(chan.url, chan.useProxy, chan.referer, chan.customHeaders);
                
                // Initialize video.js on the videoRef
                const player = videojs(video, {
                  controls: false,
                  autoplay: true,
                  preload: "auto",
                  html5: {
                    hls: { overrideNative: !getIsIOS() },
                    vhs: {
                      overrideNative: !getIsIOS(),
                      enableLowInitialPlaylist: true,
                      fastQualityChange: true,
                    }
                  }
                });
                
                videojsRef.current = player;
                player.src({ src: playableUrl, type: isDash ? 'application/dash+xml' : 'application/x-mpegURL' });
                
                player.on('error', () => {
                  const err = player.error();
                  console.error("[VIDEO.JS] Error:", err);
                  setPlayerError(`Video.js stream error: ${err?.message || 'Unknown error'}`);
                  setPlayerStatus("error");
                });

                player.on('loadedmetadata', () => {
                   // Extract qualities from VHS
                   try {
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     const vhs = (player.tech() as any)?.vhs;
                     if (vhs && vhs.playlists && vhs.playlists.master) {
                       const playlists = vhs.playlists.master.playlists;
                       if (playlists) {
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         const extractedQualities = playlists.map((l: any, i: number) => {
                           const height = l.attributes?.RESOLUTION?.height;
                           const bandwidth = l.attributes?.BANDWIDTH;
                           return {
                             id: i,
                             name: height ? `${height}p` : `${Math.round(bandwidth / 1000)} kbps`,
                             height: height,
                             bandwidth: bandwidth
                           };
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         }).filter((q: any) => q.height > 0)
                           // eslint-disable-next-line @typescript-eslint/no-explicit-any
                           .sort((a: any, b: any) => {
                             if (b.height !== a.height) return b.height - a.height;
                             return b.bandwidth - a.bandwidth;
                           });
                         if (extractedQualities.length > 0) {
                           setAvailableQualities([{ id: "auto", name: "Auto" }, ...extractedQualities]);
                         }
                       }
                     }
                   } catch (e) {
                     console.warn("Failed to extract Video.js qualities", e);
                   }
                });

                player.on('playing', () => {
                  setPlayerStatus("playing");
                  setIsPaused(false);
                });

                attemptPlay();
              } catch (err) {
                console.error("Failed to load video.js", err);
                setPlayerError("Failed to load Video.js module.");
                setPlayerStatus("error");
              }
            })();
          } else if (useShaka) {
            (async () => {


              const loadShakaPlayer = async (shakaChan: typeof chan) => {
                try {
                  const shakaModule = await import("shaka-player");
                  const shaka = shakaModule.default || shakaModule;

                  if (loadedUrlRef.current !== initialChan.url) return;

                  shaka.polyfill.installAll();

                  if (!shaka.Player.isBrowserSupported()) {
                    setPlayerError("Your browser does not support DASH playback.");
                    setPlayerStatus("error");
                    return;
                  }

                  // Destroy any previously active Shaka instances before retrying
                  if (shakaRef.current) {
                    await shakaRef.current.destroy().catch(() => { });
                    shakaRef.current = null;
                  }

                  const player = new shaka.Player();
                  shakaRef.current = player;
                  await player.attach(video);

                  try {
                    const net = player.getNetworkingEngine();
                    if (net) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      net.registerRequestFilter((_type: number, request: any) => {
                        request.allowCrossSiteCredentials = false;
                        if (request.uris && request.uris.length > 0) {
                          request.uris = request.uris.map((uri: string) => {
                            if (shakaChan.useProxy && uri && (uri.startsWith("http://") || uri.startsWith("https://")) && !uri.includes("/api/iptv/proxy")) {
                              let proxyUri = `/api/iptv/proxy?url=${encodeURIComponent(uri)}`;
                              if (shakaChan.referer) {
                                proxyUri += `&referer=${encodeURIComponent(shakaChan.referer)}`;
                              }
                              if (shakaChan.customHeaders && Object.keys(shakaChan.customHeaders).length > 0) {
                                const b64 = btoa(JSON.stringify(shakaChan.customHeaders));
                                proxyUri += `&headers=${encodeURIComponent(b64)}`;
                              }
                              return proxyUri;
                            }
                            return uri;
                          });
                        }
                      });
                    }
                  } catch (err) {
                    console.warn("Failed to register Shaka network filters:", err);
                  }

                  player.configure({
                    manifest: {
                      defaultPresentationDelay: isMaxQuality ? 30 : 18,
                      ignoreDrmInfo: !shakaChan.key,
                      dash: {
                        ignoreMinBufferTime: true,
                        ignoreSuggestedPresentationDelay: false, // Respect manifest-defined latency for CDN sync
                        autoCorrectDrift: true,
                        ignoreEmptyAdaptationSet: true,
                        ignoreMaxSegmentDuration: true,
                        initialSegmentLimit: 2000,
                      },
                      retryParameters: { maxAttempts: 15, baseDelay: 400, backoffFactor: 1.7, fuzzFactor: 0.35, timeout: 20000 },
                    },
                    streaming: {
                      lowLatencyMode: false,
                      inaccurateManifestTolerance: 3,
                      rebufferingGoal: isMaxQuality ? 20 : 10, // Deeper minimum buffer for desktop stability
                      bufferingGoal: isMaxQuality ? 180 : 90, // Aggressive pre-buffering for desktop
                      bufferBehind: isMaxQuality ? 120 : 60, // Generous rewind buffer
                      gapDetectionThreshold: 0.3,
                      stallEnabled: true,
                      stallThreshold: 1.0,
                      stallSkip: 0.2,
                      startAtSegmentBoundary: true,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                      failureCallback: (_error: any) => {
                        try { player.retryStreaming(); } catch { /* ignore */ }
                      },
                      retryParameters: { maxAttempts: 25, baseDelay: 400, backoffFactor: 1.65, fuzzFactor: 0.35, timeout: 30000 },
                    },
                    abr: {
                      enabled: true,
                      defaultBandwidthEstimate: 10_000_000, // 10 Mbps — desktop likely has good bandwidth
                      switchInterval: 1.5,
                      restrictToElementSize: false,
                      restrictToScreenSize: false,
                      clearBufferSwitch: false,
                      bandwidthDowngradeTarget: 0.85,
                      bandwidthUpgradeTarget: 0.70, // More aggressive quality upgrade for desktop
                      useNetworkInformation: true,
                    },
                  });

                  if (shakaChan.kid && shakaChan.key) {
                    player.configure({
                      drm: {
                        clearKeys: {
                          [String(shakaChan.kid).toLowerCase()]: String(shakaChan.key).toLowerCase(),
                        },
                        retryParameters: { maxAttempts: 5, baseDelay: 500, backoffFactor: 1.6, fuzzFactor: 0.3, timeout: 12000 },
                      },
                    });
                  }

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  player.addEventListener("error", (event: any) => {
                    if (overrideEngine === "shaka") {
                      console.warn("Shaka fallback failed, attempting fallback to video.js...");
                      player.destroy().catch(() => {});
                      initializeStreamRef.current(initialChan, false, chan.useProxy, "video.js");
                      return;
                    }
                    const detail = event?.detail;
                    console.error("[SHAKA] DASH error detail:", JSON.stringify(detail));
                    const code = detail?.code ?? "";
                    let errorMsg = "DASH stream error" + (code ? " • Code: " + code : "");
                    if (code === 6020) {
                      errorMsg += " • Missing browser DRM/EME support. If accessing over a local network IP (e.g. http://192.168.x.x), EME is blocked by Chrome/browsers. Please use http://localhost:3000 or configure HTTPS.";
                    }
                    setPlayerStatus("error");
                    setPlayerError(errorMsg);
                  });

                  await player.load(shakaChan.url);

                  if (loadedUrlRef.current !== initialChan.url) {
                    await player.destroy().catch(() => { });
                    return;
                  }

                  // Extract qualities
                  try {
                    const tracks = player.getVariantTracks();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const videoTracks = tracks.filter((t: any) => t.type === "variant" && t.videoId !== null);
                    const qualitiesMap = new Map();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    videoTracks.forEach((t: any) => {
                      if (t.height) {
                        const key = `${t.height}_${t.bandwidth}`;
                        qualitiesMap.set(key, {
                          id: t.id,
                          name: `${t.height}p${t.frameRate ? Math.round(t.frameRate) : ""}`,
                          height: t.height,
                          bandwidth: t.bandwidth
                        });
                      } else if (t.bandwidth) {
                        qualitiesMap.set(t.bandwidth, {
                          id: t.id,
                          name: `${Math.round(t.bandwidth / 1000)} kbps`,
                          height: 0,
                          bandwidth: t.bandwidth
                        });
                      }
                    });
                    const extractedQualities = Array.from(qualitiesMap.values())
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .filter((q: any) => q.height > 0)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .sort((a: any, b: any) => {
                        if (b.height !== a.height) return b.height - a.height;
                        return b.bandwidth - a.bandwidth;
                      });
                    if (extractedQualities.length > 0) {
                      setAvailableQualities([{ id: "auto", name: "Auto" }, ...extractedQualities]);
                    }
                  } catch (e) {
                    console.warn("Failed to extract Shaka qualities", e);
                  }

                  player.addEventListener("adaptation", () => {
                    const tracks = player.getVariantTracks();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const activeTrack = tracks.find((t: any) => t.active);
                    if (activeTrack) {
                      setActiveAutoQualityId(activeTrack.id);
                    }
                  });
                  
                  player.addEventListener("variantchanged", () => {
                    const tracks = player.getVariantTracks();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const activeTrack = tracks.find((t: any) => t.active);
                    if (activeTrack) {
                      setActiveAutoQualityId(activeTrack.id);
                    }
                  });

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  player.addEventListener("buffering", (event: any) => {
                    if (event.buffering) {
                      setIsBuffering(true);
                    } else {
                      setIsBuffering(false);
                      setPlayerStatus("playing");
                      setIsPaused(false);
                    }
                  });

                  attemptPlay();
                } catch (err: unknown) {
                  if (loadedUrlRef.current !== initialChan.url) return;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const errObj = err as any;

                  // Fallback to opposite proxy if load failed
                  if (fallbackAttemptRef.current === 0) {
                    console.warn(`[SHAKA] Load failed, retrying via opposite proxy...`, errObj);
                    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    initializeStreamRef.current(initialChan, false, !chan.useProxy);
                    return;
                  }

                  let errMsg = "DASH / TS load failed";
                  if (errObj) {
                    if (errObj.code) errMsg += ` (Code: ${errObj.code})`;
                    if (errObj.category) errMsg += ` (Category: ${errObj.category})`;
                    if (errObj.severity) errMsg += ` (Severity: ${errObj.severity})`;
                    if (errObj.message) errMsg += ` - ${errObj.message}`;
                    if (errObj.code === 6020) {
                      errMsg += " • Missing browser DRM/EME support. If accessing over a local network IP (e.g. http://192.168.x.x), EME is blocked by Chrome/browsers. Please use http://localhost:3000 or configure HTTPS.";
                    }
                  }
                  console.error("[SHAKA] Load error detail:", JSON.stringify(errObj), errMsg);
                  setPlayerError(errMsg);
                  setPlayerStatus("error");
                }
              };

              loadShakaPlayer(chan);
            })();
          } else if (useTs) {
            (async () => {
              try {
                const mpegtsModule = await import("mpegts.js");
                const mpegts = mpegtsModule.default || mpegtsModule;

                if (!mpegts.getFeatureList().mseLivePlayback) {
                  setPlayerError("Your browser does not support MPEG-TS playback.");
                  setPlayerStatus("error");
                  return;
                }

                if (loadedUrlRef.current !== chan.url) return;

                const playableUrl = getPlayableUrl(chan.url, chan.useProxy, chan.referer, chan.customHeaders);
                // Convert to absolute URL because mpegts.js Web Worker fails to parse relative URLs
                const absoluteUrl = new URL(playableUrl, window.location.origin).href;

                const player = mpegts.createPlayer({
                  type: 'mpegts',
                  isLive: true,
                  url: absoluteUrl,
                }, {
                  enableWorker: true,
                  lazyLoadMaxDuration: isMaxQuality ? 10 * 60 : 5 * 60,
                  seekType: 'range',
                  stashInitialSize: isMaxQuality ? 1024 * 1024 : 1024 * 384, // 1MB / 384KB stash
                  autoCleanupMinBackwardDuration: isMaxQuality ? 60 : 30,
                  autoCleanupMaxBackwardDuration: isMaxQuality ? 120 : 60,
                  fixAudioTimestampGap: true, // Fix audio gaps automatically
                  accurateSeek: true, // Better seek accuracy
                });

                mpegtsRef.current = player;
                player.attachMediaElement(video);
                player.load();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string, errorInfo: any) => {
                  console.error("[MPEGTS] Error:", errorType, errorDetail, errorInfo);
                  if (!overrideEngine) {
                    console.log("MPEGTS failed, attempting fallback to hls.js...");
                    if (mpegtsRef.current) {
                      mpegtsRef.current.destroy();
                      mpegtsRef.current = null;
                    }
                    initializeStreamRef.current(initialChan, false, chan.useProxy, "hls.js");
                    return;
                  }
                  setPlayerError(`TS stream error: ${errorDetail}`);
                  setPlayerStatus("error");
                });

                attemptPlay();

              } catch (err) {
                console.error("Failed to load mpegts.js", err);
                setPlayerError("Failed to load TS player module.");
                setPlayerStatus("error");
              }
            })();
          } else if (!chan.useProxy) {
            const directUrl = chan.url;
            
            let errorCleanedUp = false;


            const loadHlsJsFallback = () => {
              (async () => {
                try {
                  const HlsModule = await import("hls.js");
                  const Hls = HlsModule.default || HlsModule;

                  if (hlsRef.current) {
                    hlsRef.current.destroy();
                    hlsRef.current = null;
                  }

                  if (Hls.isSupported()) {
                    const hls = new Hls({
                      enableWorker: true,
                      lowLatencyMode: !isMaxQuality,
                      startLevel: -1,
                      // Desktop Buffer Optimization — deep pre-buffering
                      maxBufferLength: isMaxQuality ? 180 : 90,
                      maxMaxBufferLength: isMaxQuality ? 600 : 300,
                      maxBufferSize: isMaxQuality ? 400 * 1000 * 1000 : 150 * 1000 * 1000,
                      maxBufferHole: 0.3,
                      backBufferLength: isMaxQuality ? 90 : 30,
                      // Live Stream Latency — stay close to live edge
                      liveSyncDuration: isMaxQuality ? 20 : 12,
                      liveMaxLatencyDuration: isMaxQuality ? 45 : 30,
                      liveDurationInfinity: true,
                      liveSyncOnStallIncrease: 2, // Auto-advance sync point on stalls
                      // Desktop ABR Tuning — aggressive quality upgrades
                      abrEwmaDefaultEstimate: 5_000_000, // 5 Mbps — desktop likely has good bandwidth
                      abrEwmaDefaultEstimateMax: isMaxQuality ? 100_000_000 : 50_000_000,
                      abrBandWidthFactor: isMaxQuality ? 0.90 : 0.85,
                      abrBandWidthUpFactor: 0.80,
                      abrMaxWithRealBitrate: true,
                      // Desktop Network Retry — more resilient
                      fragLoadingMaxRetry: 15,
                      manifestLoadingMaxRetry: 8,
                      levelLoadingMaxRetry: 8,
                      // Extended timeouts for desktop reliability
                      fragLoadingTimeOut: 30000,
                      manifestLoadingTimeOut: 25000,
                      levelLoadingTimeOut: 25000,
                      fragLoadingMaxRetryTimeout: 64000,
                      // Desktop Prefetching — maximize throughput
                      startFragPrefetch: true,
                      progressive: true,
                      testBandwidth: true,
                      highBufferWatchdogPeriod: 3,
                    });
                    hlsRef.current = hls;

                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                      hls.loadSource(directUrl);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                      try {
                        const levels = data.levels;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const extractedQualities = levels.map((l: any, i: number) => ({
                          id: i,
                          name: l.height ? `${l.height}p${l.frameRate ? Math.round(l.frameRate) : ""}` : `${Math.round(l.bitrate / 1000)} kbps`,
                          height: l.height,
                          bandwidth: l.bitrate
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        })).filter((q: any) => q.height > 0)
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          .sort((a: any, b: any) => {
                            if (b.height !== a.height) return b.height - a.height;
                            return b.bandwidth - a.bandwidth;
                          });
                        if (extractedQualities.length > 0) {
                          setAvailableQualities([{ id: "auto", name: "Auto" }, ...extractedQualities]);
                        }
                      } catch (e) {
                        console.warn("Failed to extract HLS qualities", e);
                      }

                      if (!video.paused) {
                        setPlayerStatus("playing");
                        setIsPaused(false);
                        return;
                      }
                      attemptPlay();
                    });

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    hls.on(Hls.Events.LEVEL_SWITCHED, (_event: string, data: any) => {
                      setActiveAutoQualityId(data.level);
                    });

                    hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string; details?: string }) => {
                      // Handle non-fatal errors proactively
                      if (!data.fatal) {
                        const details = (data as { details?: string }).details || "";
                        if (details.includes("fragLoad") || details.includes("fragParsing")) {
                          console.warn(`[HLS] Non-fatal fragment error: ${details}. Auto-recovering...`);
                          hls.startLoad(-1);
                        } else if (details.includes("bufferStalled")) {
                          console.warn("[HLS] Buffer stalled (non-fatal). Nudging playback...");
                          const v = videoRef.current;
                          if (v && v.currentTime > 0) {
                            try { v.currentTime += 0.1; } catch { /* ignore */ }
                          }
                        }
                        return;
                      }

                      if (data.fatal) {
                        if (overrideEngine === "hls.js") {
                          console.warn("HLS.js fallback failed, attempting fallback to shaka...");
                          hls.destroy();
                          initializeStreamRef.current(initialChan, false, chan.useProxy, "shaka");
                          return;
                        }
                        switch (data.type) {
                          case Hls.ErrorTypes.NETWORK_ERROR:
                            if (fallbackAttemptRef.current === 0) {
                              // First try startLoad recovery before switching proxy
                              console.warn("Fatal HLS network error, attempting startLoad recovery...");
                              hls.startLoad(-1);
                              // If still failing after 5s, switch proxy mode
                              setTimeout(() => {
                                if (!hasPlayedRef.current && hlsRef.current === hls) {
                                  console.warn("startLoad recovery failed, retrying via fallback proxy mode...");
                                  hls.destroy();
                                  hlsRef.current = null;
                                  if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                                  initializeStreamRef.current(initialChan, false, !chan.useProxy);
                                }
                              }, 5000);
                            } else {
                              console.error("Fatal HLS network error (direct and proxy fallback failed).");
                              setPlayerError("Stream blocked by CORS or network failure.");
                              setPlayerStatus("error");
                            }
                            break;
                          case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn("Fatal HLS media error, attempting to recover...");
                            hls.recoverMediaError();
                            break;
                          default:
                            console.error("Fatal unrecoverable HLS error:", data);
                            setPlayerError(`Fatal HLS stream error (${data.type})`);
                            setPlayerStatus("error");
                            break;
                        }
                      }
                    });

                    hls.attachMedia(video);
                  } else {
                    setPlayerError("Your browser does not support stream playback for this channel.");
                    setPlayerStatus("error");
                  }
                } catch (err) {
                  console.error("Failed to load hls.js for useProxy channel", err);
                  setPlayerError("Failed to load player module.");
                  setPlayerStatus("error");
                }
              })();
            };

            if (video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL")) {
              video.src = directUrl;
              try {
                video.load();
              } catch { /* ignore */ }

              const onLoadedMetadata = () => {
                if (errorCleanedUp) return;
                video.removeEventListener("error", onError);
                errorCleanedUp = true;
                nativeErrorCleanupRef.current = null;
                if (!video.paused) {
                  setPlayerStatus("playing");
                  setIsPaused(false);
                  return;
                }
                attemptPlay();
              };

              const onError = (e: Event) => {
                if (errorCleanedUp) return;
                video.removeEventListener("loadedmetadata", onLoadedMetadata);
                errorCleanedUp = true;
                nativeErrorCleanupRef.current = null;
                console.warn("Native HLS player error, falling back to hls.js:", e);

                // Native failed, try hls.js with directUrl first
                loadHlsJsFallback();
              };

              video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
              video.addEventListener("error", onError, { once: true });
              nativeErrorCleanupRef.current = () => {
                video.removeEventListener("loadedmetadata", onLoadedMetadata);
                video.removeEventListener("error", onError);
              };
            } else {
              // No native HLS, go straight to hls.js
              loadHlsJsFallback();
            }
          } else {
            (async () => {
              try {
                const HlsModule = await import("hls.js");
                const Hls = HlsModule.default || HlsModule;

                if (Hls.isSupported()) {
                  const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: !isMaxQuality,
                    startLevel: isMaxQuality ? -1 : 0, // Start at lowest quality (0) for instant playback
                    // Desktop Buffer Optimization — deep pre-buffering
                    maxBufferLength: isMaxQuality ? 180 : 90,
                    maxMaxBufferLength: isMaxQuality ? 600 : 300,
                    maxBufferSize: isMaxQuality ? 400 * 1000 * 1000 : 150 * 1000 * 1000,
                    maxBufferHole: 0.3,
                    backBufferLength: isMaxQuality ? 90 : 30,
                    // Live Stream Latency — stay close to live edge
                    liveSyncDuration: isMaxQuality ? 20 : 12,
                    liveMaxLatencyDuration: isMaxQuality ? 45 : 30,
                    liveDurationInfinity: true,
                    liveSyncOnStallIncrease: 2, // Auto-advance sync point on stalls
                    // Desktop ABR Tuning — aggressive quality upgrades
                    abrEwmaDefaultEstimate: 5_000_000, // 5 Mbps — desktop likely has good bandwidth
                    abrEwmaDefaultEstimateMax: isMaxQuality ? 100_000_000 : 50_000_000,
                    abrBandWidthFactor: isMaxQuality ? 0.90 : 0.85,
                    abrBandWidthUpFactor: 0.80,
                    abrMaxWithRealBitrate: true,
                    capLevelToPlayerSize: false, // Ensure we don't cap resolution to the CSS player size
                    // Desktop Network Retry — more resilient
                    fragLoadingMaxRetry: 15,
                    manifestLoadingMaxRetry: 8,
                    levelLoadingMaxRetry: 8,
                    // Extended timeouts for desktop reliability
                    fragLoadingTimeOut: 30000,
                    manifestLoadingTimeOut: 25000,
                    levelLoadingTimeOut: 25000,
                    fragLoadingMaxRetryTimeout: 64000,
                    // Desktop Prefetching — maximize throughput
                    startFragPrefetch: true,
                    progressive: true,
                    testBandwidth: true,
                    highBufferWatchdogPeriod: 3,
                  });
                  hlsRef.current = hls;

                  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    const playableUrl = getPlayableUrl(chan.url, chan.useProxy, chan.referer, chan.customHeaders);
                    hls.loadSource(playableUrl);
                  });

                  hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                    try {
                      const levels = data.levels;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const extractedQualities = levels.map((l: any, i: number) => ({
                        id: i,
                        name: l.height ? `${l.height}p${l.frameRate ? Math.round(l.frameRate) : ""}` : `${Math.round(l.bitrate / 1000)} kbps`,
                        height: l.height,
                        bandwidth: l.bitrate
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      })).filter((q: any) => q.height > 0)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .sort((a: any, b: any) => {
                          if (b.height !== a.height) return b.height - a.height;
                          return b.bandwidth - a.bandwidth;
                        });
                      if (extractedQualities.length > 0) {
                        setAvailableQualities([{ id: "auto", name: "Auto" }, ...extractedQualities]);
                      }
                    } catch (e) {
                      console.warn("Failed to extract HLS qualities", e);
                    }

                    if (!video.paused) {
                      setPlayerStatus("playing");
                      setIsPaused(false);
                      return;
                    }
                    attemptPlay();
                  });

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  hls.on(Hls.Events.LEVEL_SWITCHED, (_event: string, data: any) => {
                    setActiveAutoQualityId(data.level);
                  });

                  let recoverDecodingErrorDate = 0;
                  let recoverSwapAudioCodecDate = 0;

                  hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string; details?: string }) => {
                    // Handle non-fatal errors proactively
                    if (!data.fatal) {
                      const details = (data as { details?: string }).details || "";
                      if (details.includes("fragLoad") || details.includes("fragParsing")) {
                        console.warn(`[HLS] Non-fatal fragment error: ${details}. Auto-recovering...`);
                        hls.startLoad(-1);
                      } else if (details.includes("bufferStalled")) {
                        console.warn("[HLS] Buffer stalled (non-fatal). Nudging playback...");
                        const v = videoRef.current;
                        if (v && v.currentTime > 0) {
                          try { v.currentTime += 0.1; } catch { /* ignore */ }
                        }
                      }
                      return;
                    }

                    if (data.fatal) {
                      if (overrideEngine === "hls.js") {
                        console.warn("HLS.js fallback failed, attempting fallback to shaka...");
                        hls.destroy();
                        initializeStreamRef.current(initialChan, false, chan.useProxy, "shaka");
                        return;
                      }
                      switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                          console.warn("Fatal HLS network error, attempting startLoad recovery...");
                          hls.startLoad(-1);
                          break;
                        case Hls.ErrorTypes.MEDIA_ERROR: {
                          const now = performance.now();
                          if (!recoverDecodingErrorDate || now - recoverDecodingErrorDate > 3000) {
                            recoverDecodingErrorDate = now;
                            console.warn("Fatal HLS media error, attempting to recover...");
                            hls.recoverMediaError();
                          } else if (!recoverSwapAudioCodecDate || now - recoverSwapAudioCodecDate > 3000) {
                            recoverSwapAudioCodecDate = now;
                            console.warn("Fatal HLS media error, swapping audio codec...");
                            hls.swapAudioCodec();
                            hls.recoverMediaError();
                          } else {
                            console.error("Fatal unrecoverable HLS error (repeated media errors).");
                            setPlayerError("Fatal HLS stream error (repeated media errors)");
                            setPlayerStatus("error");
                            hls.destroy();
                          }
                          break;
                        }
                        default:
                          console.error("Fatal unrecoverable HLS error:", data);
                          setPlayerError(`Fatal HLS stream error (${data.type})`);
                          setPlayerStatus("error");
                          hls.destroy();
                          break;
                      }
                    }
                  });

                  hls.attachMedia(video);
                } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                  const isIOS = getIsIOS();
                  const directUrl = chan.url;
                  const proxiedUrl = getPlayableUrl(chan.url, chan.useProxy, chan.referer, chan.customHeaders);
                  
                  video.src = isIOS ? directUrl : proxiedUrl;
                  try {
                    video.load();
                  } catch { /* ignore */ }

                  let errorCleanedUp = false;

                  const onLoadedMetadata = () => {
                    if (errorCleanedUp) return;
                    video.removeEventListener("error", onError);
                    errorCleanedUp = true;
                    nativeErrorCleanupRef.current = null;
                    if (!video.paused) {
                      setPlayerStatus("playing");
                      setIsPaused(false);
                      return;
                    }
                    attemptPlay();
                  };

                  const onError = (e: Event) => {
                    if (errorCleanedUp) return;
                    video.removeEventListener("loadedmetadata", onLoadedMetadata);
                    errorCleanedUp = true;
                    nativeErrorCleanupRef.current = null;

                    if (isIOS && video.src !== proxiedUrl && video.src.indexOf("/api/iptv/proxy") === -1) {
                      console.warn("[iOS] Direct stream failed, retrying via proxy...");
                      video.src = proxiedUrl;
                      try {
                        video.load();
                      } catch { /* ignore */ }
                      errorCleanedUp = false;

                      const onProxyMetadata = () => {
                        if (errorCleanedUp) return;
                        video.removeEventListener("error", onProxyError);
                        errorCleanedUp = true;
                        nativeErrorCleanupRef.current = null;
                        if (!video.paused) {
                          setPlayerStatus("playing");
                          setIsPaused(false);
                          return;
                        }
                        attemptPlay();
                      };

                      const onProxyError = (ev: Event) => {
                        if (errorCleanedUp) return;
                        video.removeEventListener("loadedmetadata", onProxyMetadata);
                        errorCleanedUp = true;
                        nativeErrorCleanupRef.current = null;
                        console.error("Native video player error (proxy fallback):", ev);
                        setPlayerError("Native video player playback error");
                        setPlayerStatus("error");
                      };

                      video.addEventListener("loadedmetadata", onProxyMetadata, { once: true });
                      video.addEventListener("error", onProxyError, { once: true });
                      nativeErrorCleanupRef.current = () => {
                        video.removeEventListener("loadedmetadata", onProxyMetadata);
                        video.removeEventListener("error", onProxyError);
                      };
                      return;
                    }

                    console.error("Native video player error:", e);
                    setPlayerError("Native video player playback error");
                    setPlayerStatus("error");
                  };

                  video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
                  video.addEventListener("error", onError, { once: true });
                  nativeErrorCleanupRef.current = () => {
                    video.removeEventListener("loadedmetadata", onLoadedMetadata);
                    video.removeEventListener("error", onError);
                  };
                } else {
                  setPlayerError("Your browser does not support stream playback.");
                  setPlayerStatus("error");
                }
              } catch (err) {
                console.error("Failed to load hls.js", err);

                // Fallback to native Apple HLS playback if hls.js fails to load
                if (video.canPlayType("application/vnd.apple.mpegurl")) {
                  const isIOS = getIsIOS();
                  const directUrl = chan.url;
                  const proxiedUrl = getPlayableUrl(chan.url, chan.useProxy, chan.referer, chan.customHeaders);
                  
                  video.src = isIOS ? directUrl : proxiedUrl;
                  try {
                    video.load();
                  } catch { /* ignore */ }

                  let errorCleanedUp = false;

                  const onLoadedMetadata = () => {
                    if (errorCleanedUp) return;
                    video.removeEventListener("error", onError);
                    errorCleanedUp = true;
                    nativeErrorCleanupRef.current = null;
                    if (!video.paused) {
                      setPlayerStatus("playing");
                      setIsPaused(false);
                      return;
                    }
                    attemptPlay();
                  };

                  const onError = () => {
                    if (errorCleanedUp) return;
                    video.removeEventListener("loadedmetadata", onLoadedMetadata);
                    errorCleanedUp = true;
                    nativeErrorCleanupRef.current = null;
                    setPlayerError("Native video player playback error");
                    setPlayerStatus("error");
                  };

                  video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
                  video.addEventListener("error", onError, { once: true });
                  nativeErrorCleanupRef.current = () => {
                    video.removeEventListener("loadedmetadata", onLoadedMetadata);
                    video.removeEventListener("error", onError);
                  };
                } else {
                  setPlayerError("Failed to load HLS player module.");
                  setPlayerStatus("error");
                }
              }
            })();
          }
        })();
      }, 50);
    },
    [setupUnmuteOnInteraction, playerEngine, setPlayerError, setPlayerStatus]
  );

  // Auto-play / load stream when selectedChannel or retryKey changes
  useEffect(() => {
    if (!selectedChannel) return;
    const hasChannelChanged =
      loadedChannelRef.current?.id !== selectedChannel.id ||
      loadedChannelRef.current?.url !== selectedChannel.url ||
      loadedChannelRef.current?.useProxy !== selectedChannel.useProxy;
    const hasRetryKeyChanged = lastRetryKeyRef.current !== retryKey;

    if (hasChannelChanged || hasRetryKeyChanged) {
      lastRetryKeyRef.current = retryKey;
      initializeStream(selectedChannel, hasRetryKeyChanged);
    }
  }, [selectedChannel, retryKey, initializeStream]);

  // Clean up Hls and video elements on component unmount
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (shakaRef.current) {
        shakaRef.current.destroy().catch(() => { });
        shakaRef.current = null;
      }
      if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
      }
      if (video) {
        video.removeAttribute("src");
        try { video.load(); } catch { /* ignore */ }
      }
      if (unmuteCleanupRef.current) {
        unmuteCleanupRef.current();
      }
      if (nativeErrorCleanupRef.current) {
        nativeErrorCleanupRef.current();
        nativeErrorCleanupRef.current = null;
      }
      loadedUrlRef.current = null;
    };
  }, []);

  const handleToggleMaxQuality = useCallback(() => {
    setMaxQualityMode(prev => {
      const next = !prev;
      maxQualityModeRef.current = next;
      return next;
    });
    // Re-initialize stream with new settings
    loadedUrlRef.current = null;
    setRetryKey(prev => prev + 1);
  }, [setRetryKey]);

  const handleReload = () => {
    loadedUrlRef.current = null;
    setRetryKey((prev) => prev + 1);
  };

  // ── Stream Guardian Integration ─────────────────────────────────────────
  const guardianForceRecovery = useCallback(() => {
    if (loadedChannelRef.current) {
      initializeStreamRef.current(
        loadedChannelRef.current,
        false,
        loadedChannelRef.current.useProxy
      );
    }
  }, []);

  const { streamHealth, guardianActions } = useStreamGuardian({
    videoRef,
    hlsRef,
    shakaRef,
    mpegtsRef,
    isActive: playerStatus === "playing" || playerStatus === "loading",
    isMaxQuality: maxQualityMode,
    onForceRecovery: guardianForceRecovery,
    isUserPaused: isPaused,
  });

  // ── Desktop: Electron Sleep Prevention ──────────────────────────────────
  // Prevent system sleep during active playback, re-enable sleep when idle
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.electronAPI : undefined;
    if (!api?.preventSleep) return;

    if (playerStatus === "playing" && !isPaused) {
      api.preventSleep(true).catch(() => { /* ignore */ });
    } else {
      api.preventSleep(false).catch(() => { /* ignore */ });
    }

    return () => {
      api.preventSleep(false).catch(() => { /* ignore */ });
    };
  }, [playerStatus, isPaused]);

  return {
    videoRef,
    playerWrapperRef,
    playerContainerRef,
    playerStatus,
    playerError,
    isBuffering,
    isPaused,
    hasPlayed,
    isMuted,
    volume,
    isFullscreen,
    isPip,
    showControls,
    activeSeekIndicator,
    viewerCount,
    topChannels,
    isPipSupported,
    availableQualities,
    currentQuality,
    activeAutoQualityId,
    detectedResolution,
    maxQualityMode,
    handleQualityChange,
    handleToggleMaxQuality,
    handlePlayPause,
    handleMuteUnmute,
    handleVolumeChangeSlider,
    handleFullscreen,
    handlePip,
    handlePlayerClick,
    handlePlayerDoubleClick,
    handleReload,
    handleMouseMove,
    initializeStream,
    playerEngine,
    setPlayerEngine,
    // Desktop Streaming Health & Recovery
    streamHealth,
    guardianActions,
    isAutoRecovering,
    recoveryAttempt,
  };
}
