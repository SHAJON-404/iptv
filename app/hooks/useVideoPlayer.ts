"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type Hls from "hls.js";
import { Channel, getIsIOS } from "./useIPTVPlaylists";

// shaka-player is loaded dynamically because it requires `window` (browser-only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShakaPlayer = any;

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

export type PlayerEngine = "auto" | "hls.js" | "shaka" | "video.js";

export function useVideoPlayer(
  selectedChannel: Channel | null,
  retryKey: number,
  setRetryKey: React.Dispatch<React.SetStateAction<number>>,
  onChannelFail?: () => void
) {
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerEngine, setPlayerEngineState] = useState<PlayerEngine>("auto");
  const setPlayerEngine = useCallback((engine: PlayerEngine) => {
    setPlayerEngineState(engine);
    setRetryKey(prev => prev + 1);
  }, [setRetryKey]);

  const [playerStatus, setPlayerStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");

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

    setIsPaused(video.paused);
    setIsMuted(video.muted);
    setVolume(video.volume);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlayingEvent);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [selectedChannel, retryKey]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
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
            rebufferingGoal: isMaxQ ? 8 : 4,
            bufferingGoal: isMaxQ ? 60 : 30,
            bufferBehind: isMaxQ ? 30 : 20,
          },
        });
      } else {
        player.configure({
          abr: { enabled: false },
          streaming: {
            rebufferingGoal: isMaxQ ? 10 : 5,
            bufferingGoal: isMaxQ ? 90 : 45,
            bufferBehind: isMaxQ ? 40 : 25,
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
          hls.config.maxBufferLength = 60;
          hls.config.maxMaxBufferLength = 120;
        }
      } else {
        hls.currentLevel = qualityId as number;
        hls.nextLevel = qualityId as number;
        if (isMaxQ) {
          hls.config.maxBufferLength = 90;
          hls.config.maxMaxBufferLength = 180;
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
    (initialChan: Channel, isUserClick: boolean, overrideProxyMode?: boolean) => {
      // eslint-disable-next-line react-hooks/immutability
      initializeStreamRef.current = initializeStream;
      const video = videoRef.current;
      if (!video) return;

      setPlayerStatus("loading");
      setPlayerError(null);
      setIsBuffering(false);
      setHasPlayed(false);
      setAvailableQualities([{ id: "auto", name: "Auto" }]);
      setCurrentQuality("auto");
      setActiveAutoQualityId(null);
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

          // Start fallback timer
          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = setTimeout(() => {
            if (!hasPlayedRef.current) {
              if (fallbackAttemptRef.current === 0) {
                if (dynamicUseProxy && isHttpsPage && isHttpStream) {
                  // Cannot fallback to direct (useProxy = false) due to Mixed Content
                  console.log(`Stream failed to play within 15s. Cannot fallback to direct HTTP under HTTPS, retrying proxy reload...`);
                  initializeStream(initialChan, false, true);
                } else {
                  console.log(`Stream failed to play within 15s, trying fallback proxy mode (useProxy=${!dynamicUseProxy})...`);
                  initializeStream(initialChan, false, !dynamicUseProxy);
                }
              } else {
                console.log("Fallback also failed, switching channel...");
                if (onChannelFailRef.current) onChannelFailRef.current();
              }
            }
          }, 15000);

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

          const forceEngine = playerEngine;
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
                        initialSegmentLimit: 1000,
                      },
                      retryParameters: { maxAttempts: 10, baseDelay: 450, backoffFactor: 1.7, fuzzFactor: 0.35, timeout: 12000 },
                    },
                    streaming: {
                      lowLatencyMode: false,
                      inaccurateManifestTolerance: 3,
                      rebufferingGoal: isMaxQuality ? 12 : 6, // Safe minimum buffer before resuming standard playback
                      bufferingGoal: isMaxQuality ? 60 : 30, // Larger prebuffer for stability
                      bufferBehind: isMaxQuality ? 30 : 20,
                      gapDetectionThreshold: 0.4,
                      stallEnabled: true,
                      stallThreshold: 1.2,
                      stallSkip: 0.25,
                      startAtSegmentBoundary: true,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                      failureCallback: (_error: any) => {
                        try { player.retryStreaming(); } catch { /* ignore */ }
                      },
                      retryParameters: { maxAttempts: 15, baseDelay: 450, backoffFactor: 1.65, fuzzFactor: 0.35, timeout: 15000 },
                    },
                    abr: {
                      enabled: true,
                      defaultBandwidthEstimate: 5_000_000, // Start moderate for instant initial playback, then ramp up via ABR
                      switchInterval: 2,
                      restrictToElementSize: false,
                      restrictToScreenSize: false,
                      clearBufferSwitch: false,
                      bandwidthDowngradeTarget: 0.85,
                      bandwidthUpgradeTarget: 0.75, // Target to allow scaling to 4K easily
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
                  lazyLoadMaxDuration: isMaxQuality ? 5 * 60 : 3 * 60,
                  seekType: 'range',
                  stashInitialSize: isMaxQuality ? 1024 * 384 : undefined,
                  autoCleanupMinBackwardDuration: isMaxQuality ? 30 : undefined,
                  autoCleanupMaxBackwardDuration: isMaxQuality ? 60 : undefined,
                });

                mpegtsRef.current = player;
                player.attachMediaElement(video);
                player.load();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                player.on(mpegts.Events.ERROR, (errorType: string, errorDetail: string, errorInfo: any) => {
                  console.error("[MPEGTS] Error:", errorType, errorDetail, errorInfo);
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
                      // Buffer Optimization — pre-buffering
                      maxBufferLength: isMaxQuality ? 60 : 30,
                      maxMaxBufferLength: isMaxQuality ? 120 : 60,
                      maxBufferSize: isMaxQuality ? 120 * 1000 * 1000 : 40 * 1000 * 1000,
                      maxBufferHole: 0.5,
                      backBufferLength: isMaxQuality ? 30 : 0,
                      // Live Stream Latency — play behind live edge to prevent buffering
                      liveSyncDuration: isMaxQuality ? 25 : 15,
                      liveMaxLatencyDuration: isMaxQuality ? 60 : 35,
                      liveDurationInfinity: true,
                      // ABR Tuning
                      abrEwmaDefaultEstimate: 2_000_000, // Moderate initial default
                      abrEwmaDefaultEstimateMax: isMaxQuality ? 50_000_000 : 10_000_000,
                      abrBandWidthFactor: isMaxQuality ? 0.80 : 0.75,
                      abrBandWidthUpFactor: 0.65,
                      abrMaxWithRealBitrate: true,
                      // Network Retry
                      fragLoadingMaxRetry: 8,
                      manifestLoadingMaxRetry: 4,
                      levelLoadingMaxRetry: 4,
                      // Reasonable timeouts for slow connections and proxy paths
                      fragLoadingTimeOut: 20000,
                      manifestLoadingTimeOut: 20000,
                      levelLoadingTimeOut: 20000,
                      fragLoadingMaxRetryTimeout: 35000,
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

                    hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string }) => {
                      if (data.fatal) {
                        switch (data.type) {
                          case Hls.ErrorTypes.NETWORK_ERROR:
                            if (fallbackAttemptRef.current === 0) {
                              console.warn("Fatal HLS network error, retrying via fallback proxy mode...");
                              hls.destroy();
                              hlsRef.current = null;
                              if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                              initializeStreamRef.current(initialChan, false, !chan.useProxy);
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
                    // Buffer Optimization — pre-buffering
                    maxBufferLength: isMaxQuality ? 60 : 30,
                    maxMaxBufferLength: isMaxQuality ? 120 : 60,
                    maxBufferSize: isMaxQuality ? 120 * 1000 * 1000 : 40 * 1000 * 1000,
                    maxBufferHole: 0.5,
                    backBufferLength: isMaxQuality ? 30 : 0,
                    // Live Stream Latency — play behind live edge to prevent buffering
                    liveSyncDuration: isMaxQuality ? 25 : 15,
                    liveMaxLatencyDuration: isMaxQuality ? 60 : 35,
                    liveDurationInfinity: true,
                    // ABR Tuning
                    abrEwmaDefaultEstimate: 500_000, // 500kbps initial estimate to force lightweight first fragment
                    abrEwmaDefaultEstimateMax: 50_000_000, // 50 Mbps max estimate to allow 4K scaling
                    abrBandWidthFactor: isMaxQuality ? 0.85 : 0.80,
                    abrBandWidthUpFactor: 0.70,
                    abrMaxWithRealBitrate: true,
                    capLevelToPlayerSize: false, // Ensure we don't cap resolution to the CSS player size
                    // Network Retry
                    fragLoadingMaxRetry: 8,
                    manifestLoadingMaxRetry: 4,
                    levelLoadingMaxRetry: 4,
                    // Reasonable timeouts for slow connections and proxy paths
                    fragLoadingTimeOut: 20000,
                    manifestLoadingTimeOut: 20000,
                    levelLoadingTimeOut: 20000,
                    fragLoadingMaxRetryTimeout: 35000,
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

                  hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string }) => {
                    if (data.fatal) {
                      switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                          console.warn("Fatal HLS network error, attempting to recover...");
                          hls.startLoad();
                          break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
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
    [setupUnmuteOnInteraction, playerEngine]
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
  };
}
