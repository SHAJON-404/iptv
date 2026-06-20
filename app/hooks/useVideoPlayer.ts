"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type Hls from "hls.js";
import { Channel, getIsIOS } from "./useIPTVPlaylists";

// shaka-player is loaded dynamically because it requires `window` (browser-only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShakaPlayer = any;

const getPlayableUrl = (url: string, no_proxy?: boolean, referer?: string) => {
  if (!no_proxy && url && (url.startsWith("http://") || url.startsWith("https://"))) {
    let proxyUrl = `/api/iptv/proxy?url=${encodeURIComponent(url)}`;
    if (referer) {
      proxyUrl += `&referer=${encodeURIComponent(referer)}`;
    }
    return proxyUrl;
  }
  return url;
};

export interface StreamQuality {
  id: number | "auto";
  name: string;
  height?: number;
  bandwidth?: number;
}

export function useVideoPlayer(
  selectedChannel: Channel | null,
  retryKey: number,
  setRetryKey: React.Dispatch<React.SetStateAction<number>>
) {
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

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
  const mpegtsRef = useRef<any>(null);
  const userMutedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const loadedUrlRef = useRef<string | null>(null);
  const loadedChannelRef = useRef<Channel | null>(null);
  const nativeErrorCleanupRef = useRef<(() => void) | null>(null);
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  // Listen for global viewer count updates from ViewerTracker
  useEffect(() => {
    const handleViewerCount = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      setViewerCount(customEvent.detail.count);
    };
    window.addEventListener("iptv-viewer-count", handleViewerCount);
    return () => window.removeEventListener("iptv-viewer-count", handleViewerCount);
  }, []);

  // Quality Customization States
  const [availableQualities, setAvailableQualities] = useState<StreamQuality[]>([{ id: "auto", name: "Auto" }]);
  const [currentQuality, setCurrentQuality] = useState<number | "auto">("auto");

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
  
    if (shakaRef.current) {
      const player = shakaRef.current;
      if (qualityId === "auto") {
        player.configure({ abr: { enabled: true } });
      } else {
        player.configure({ abr: { enabled: false } });
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
      } else {
        hls.currentLevel = qualityId as number;
      }
    }
    
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const initializeStream = useCallback(
    (chan: Channel, isUserClick: boolean) => {
      const video = videoRef.current;
      if (!video) return;

      setPlayerStatus("loading");
      setPlayerError(null);
      setIsBuffering(false);
      setHasPlayed(false);
      setAvailableQualities([{ id: "auto", name: "Auto" }]);
      setCurrentQuality("auto");
      loadedUrlRef.current = chan.url;
      loadedChannelRef.current = chan;

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

      video.pause();
      if (nativeErrorCleanupRef.current) {
        nativeErrorCleanupRef.current();
        nativeErrorCleanupRef.current = null;
      }

      // Check if it is a DASH/TS stream and we are on iOS/iPadOS
      const isDashStream = chan.type === "dash" || chan.url.endsWith(".mpd");
      const isTsStream = !isDashStream && (chan.url.includes(".ts") || chan.type === "ts");
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
        if (loadedUrlRef.current !== chan.url) return;

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

      const isDash = chan.type === "dash" || chan.url.endsWith(".mpd");
      const isTs = !isDash && (chan.url.includes(".ts") || chan.type === "ts");

      if (isDash) {
        (async () => {
          try {
            const shakaModule = await import("shaka-player");
            const shaka = shakaModule.default || shakaModule;

            if (loadedUrlRef.current !== chan.url) return;

            shaka.polyfill.installAll();

            if (!shaka.Player.isBrowserSupported()) {
              setPlayerError("Your browser does not support DASH playback.");
              setPlayerStatus("error");
              return;
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
                      if (!chan.no_proxy && uri && (uri.startsWith("http://") || uri.startsWith("https://")) && !uri.includes("/api/iptv/proxy")) {
                        let proxyUri = `/api/iptv/proxy?url=${encodeURIComponent(uri)}`;
                        if (chan.referer) {
                          proxyUri += `&referer=${encodeURIComponent(chan.referer)}`;
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
                defaultPresentationDelay: 10,
                ignoreDrmInfo: true,
                dash: {
                  ignoreMinBufferTime: true,
                  ignoreSuggestedPresentationDelay: true,
                  autoCorrectDrift: true,
                  ignoreEmptyAdaptationSet: true,
                  ignoreMaxSegmentDuration: true,
                  initialSegmentLimit: 1000,
                },
                retryParameters: { maxAttempts: 10, baseDelay: 450, backoffFactor: 1.7, fuzzFactor: 0.35, timeout: 18000 },
              },
              streaming: {
                lowLatencyMode: false,
                inaccurateManifestTolerance: 3,
                rebufferingGoal: 0.75,
                bufferingGoal: 18,
                bufferBehind: 18,
                gapDetectionThreshold: 0.4,
                stallEnabled: true,
                stallThreshold: 1.2,
                stallSkip: 0.25,
                startAtSegmentBoundary: true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                failureCallback: (_error: any) => {
                  try { player.retryStreaming(); } catch { /* ignore */ }
                },
                retryParameters: { maxAttempts: 15, baseDelay: 450, backoffFactor: 1.65, fuzzFactor: 0.35, timeout: 22000 },
              },
              abr: {
                enabled: true,
                defaultBandwidthEstimate: 12000000,
                switchInterval: 2,
                restrictToElementSize: false,
                restrictToScreenSize: false,
                clearBufferSwitch: false,
                bandwidthDowngradeTarget: 0.95,
                bandwidthUpgradeTarget: 0.68,
                useNetworkInformation: true,
              },
            });

            if (chan.kid && chan.key) {
              player.configure({
                drm: {
                  clearKeys: {
                    [String(chan.kid).toLowerCase()]: String(chan.key).toLowerCase(),
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

            await player.load(chan.url);

            if (loadedUrlRef.current !== chan.url) {
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
                    name: `${t.height}p`,
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
            if (loadedUrlRef.current !== chan.url) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errObj = err as any;
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
        })();
      } else if (isTs) {
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

            const playableUrl = getPlayableUrl(chan.url, chan.no_proxy, chan.referer);
            // Convert to absolute URL because mpegts.js Web Worker fails to parse relative URLs
            const absoluteUrl = new URL(playableUrl, window.location.origin).href;

            const player = mpegts.createPlayer({
              type: 'mpegts',
              isLive: true,
              url: absoluteUrl,
            }, {
              enableWorker: true,
              lazyLoadMaxDuration: 3 * 60,
              seekType: 'range',
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
      } else if (chan.no_proxy) {
        // For no_proxy channels, skip hls.js entirely and use native <video src> playback.
        // hls.js uses fetch/XMLHttpRequest which is subject to CORS — if the CDN doesn't send
        // Access-Control-Allow-Origin headers, the browser blocks the response.
        // Native <video src> uses the browser's media stack which doesn't enforce CORS.
        const directUrl = chan.url;

        if (video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL")) {
          video.src = directUrl;
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
            console.error("Native no_proxy video player error:", e);
            setPlayerError("This stream requires native HLS support. Try Safari or a mobile browser.");
            setPlayerStatus("error");
          };

          video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
          video.addEventListener("error", onError, { once: true });
          nativeErrorCleanupRef.current = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
          };
        } else {
          // Desktop Chrome/Edge may not support native HLS — try hls.js as last resort
          // but warn that it may fail due to CORS
          (async () => {
            try {
              const HlsModule = await import("hls.js");
              const Hls = HlsModule.default || HlsModule;

              if (Hls.isSupported()) {
                const hls = new Hls({
                  enableWorker: true,
                  lowLatencyMode: true,
                  backBufferLength: 0,
                  startLevel: -1,
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
                      name: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps`,
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

                hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string }) => {
                  if (data.fatal) {
                    switch (data.type) {
                      case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn("Fatal HLS network error (no_proxy), likely CORS blocked.");
                        setPlayerError("Stream blocked by CORS. This channel requires a browser with native HLS support (Safari/iOS).");
                        setPlayerStatus("error");
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
              console.error("Failed to load hls.js for no_proxy channel", err);
              setPlayerError("Failed to load player module.");
              setPlayerStatus("error");
            }
          })();
        }
      } else {
        (async () => {
          try {
            const HlsModule = await import("hls.js");
            const Hls = HlsModule.default || HlsModule;

            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 0,
                startLevel: -1,
              });
              hlsRef.current = hls;

              hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                const playableUrl = getPlayableUrl(chan.url, chan.no_proxy, chan.referer);
                hls.loadSource(playableUrl);
              });

              hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                try {
                  const levels = data.levels;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const extractedQualities = levels.map((l: any, i: number) => ({
                    id: i,
                    name: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps`,
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

              hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string }) => {
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      console.warn("Fatal HLS network error, attempting to recover...");
                      hls.startLoad();
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
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              const isIOS = getIsIOS();
              const directUrl = chan.url;
              const proxiedUrl = getPlayableUrl(chan.url, chan.no_proxy, chan.referer);

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
              const proxiedUrl = getPlayableUrl(chan.url, chan.no_proxy, chan.referer);

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
      }, 50);
    },
    [setupUnmuteOnInteraction]
  );

  // Auto-play / load stream when selectedChannel or retryKey changes
  useEffect(() => {
    if (!selectedChannel) return;
    const hasChannelChanged =
      loadedChannelRef.current?.id !== selectedChannel.id ||
      loadedChannelRef.current?.url !== selectedChannel.url ||
      loadedChannelRef.current?.no_proxy !== selectedChannel.no_proxy;

    if (hasChannelChanged) {
      initializeStream(selectedChannel, false);
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
    initializeStream,
  };
}
