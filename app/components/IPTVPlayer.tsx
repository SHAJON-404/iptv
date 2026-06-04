"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Tv,
  Search,
  Play,
  ShieldAlert,
  RefreshCw,
  Radio,
  Volume2,
  Pause,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Hls from "hls.js";

const GithubIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const TelegramIcon = ({ size = 13, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const FacebookIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export default function IPTVPlayer() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [playerStatus, setPlayerStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Custom Player controls states
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmuteCleanupRef = useRef<(() => void) | null>(null);

  const hlsRef = useRef<Hls | null>(null);
  const userMutedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
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
      document.removeEventListener("click", unmute);
      document.removeEventListener("touchstart", unmute);
      document.removeEventListener("keydown", unmute);
      unmuteCleanupRef.current = null;
    };

    document.addEventListener("click", unmute);
    document.addEventListener("touchstart", unmute);
    document.addEventListener("keydown", unmute);
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
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    setIsPaused(video.paused);
    setIsMuted(video.muted);
    setVolume(video.volume);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
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
    if (!container) return;
    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
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

  // Sync isPip state with video element events
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

    try {
      if (document.pictureInPictureElement) {
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
    typeof document !== "undefined" && document.pictureInPictureEnabled;

  const handlePlayerClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(".player-controls") ||
      (e.target as HTMLElement).closest(".desktop-seek-btn")
    ) {
      return;
    }

    const video = videoRef.current;
    if (video && (video.muted || video.volume === 0)) {
      video.muted = false;
      setIsMuted(false);
      if (video.volume === 0) {
        video.volume = 1.0;
        setVolume(1.0);
      }
      resetControlsTimeout();
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      handlePlayPause();
      clickTimeoutRef.current = null;
    }, 200);
  };

  const handlePlayerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest(".player-controls") ||
      (e.target as HTMLElement).closest(".desktop-seek-btn")
    ) {
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

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // 1. Fetch channel metadata from our API route
  useEffect(() => {
    async function loadChannels() {
      try {
        setLoading(true);
        const response = await fetch("/api/iptv/channels");
        if (!response.ok) {
          throw new Error(`Failed to load channels (Status ${response.status})`);
        }
        const data = await response.json();
        setChannels(data);
        if (data.length > 0) {
          const defaultChan = data.find(
            (c: Channel) =>
              c.name.toLowerCase().includes("t sports") ||
              c.name.toLowerCase().includes("t-sports")
          );
          setSelectedChannel(defaultChan || data[0]);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load channel list. Please try again.";
        console.error("Error fetching channels:", err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadChannels();
  }, []);

  // 2. Initialize Hls.js/Native player and load stream
  const initializeStream = useCallback(
    (chan: Channel, isUserClick: boolean) => {
      const video = videoRef.current;
      if (!video) return;

      setPlayerStatus("loading");
      loadedUrlRef.current = chan.url;

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
      } else {
        video.volume = volumeRef.current;
        video.muted = isMutedRef.current;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 0,
          startLevel: -1,
        });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.loadSource(chan.url);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!video.paused) {
            setPlayerStatus("playing");
            setIsPaused(false);
            return;
          }

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
                      console.error("Muted autoplay failed:", playErr);
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
        });

        hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string }) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn(
                  "Fatal HLS network error, attempting to recover..."
                );
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn(
                  "Fatal HLS media error, attempting to recover..."
                );
                hls.recoverMediaError();
                break;
              default:
                console.error("Fatal unrecoverable HLS error:", data);
                setPlayerStatus("error");
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = chan.url;

        const onLoadedMetadata = () => {
          if (!video.paused) {
            setPlayerStatus("playing");
            setIsPaused(false);
            return;
          }

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
                      console.error("Native muted autoplay failed:", playErr);
                    }
                    setPlayerStatus("playing");
                    setIsPaused(true);
                  });
              } else {
                if (err.name !== "AbortError") {
                  console.warn("Native play failed:", err);
                }
                setPlayerStatus("playing");
                setIsPaused(video.paused);
              }
            });
        };

        const onError = (e: Event) => {
          console.error("Native video player error:", e);
          setPlayerStatus("error");
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata, {
          once: true,
        });
        video.addEventListener("error", onError, { once: true });
      } else {
        setError("Your browser does not support HLS stream playback.");
        setPlayerStatus("error");
      }

      if (isUserClick) {
        video.play().catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Synchronous play gesture registered:", err);
          }
        });
      }
    },
    [setupUnmuteOnInteraction]
  );

  // 3. Play stream when a channel is selected or retryKey changes
  useEffect(() => {
    if (!selectedChannel) return;

    if (loadedUrlRef.current !== selectedChannel.url) {
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
      if (video) {
        video.src = "";
      }
      if (unmuteCleanupRef.current) {
        unmuteCleanupRef.current();
      }
      loadedUrlRef.current = null;
    };
  }, []);

  const handleReload = () => {
    loadedUrlRef.current = null;
    setRetryKey((prev) => prev + 1);
  };

  const handleChannelSelect = useCallback(
    (chan: Channel) => {
      setSelectedChannel(chan);
      initializeStream(chan, true);

      if (window.innerWidth < 1024 && playerWrapperRef.current) {
        setTimeout(() => {
          playerWrapperRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    },
    [initializeStream]
  );

  const categories = [
    "All",
    ...Array.from(new Set(channels.map((c) => c.group))),
  ];

  const filteredChannels = channels.filter((c) => {
    const matchesCategory =
      selectedCategory === "All" || c.group === selectedCategory;
    const matchesSearch = c.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pt-4 md:pt-6 min-h-screen pb-12 px-3 sm:px-4 md:px-6 text-white">
      {error ? (
        <div className="glass-card p-12 text-center space-y-6 border border-rose-500/20 max-w-2xl mx-auto rounded-3xl bg-rose-500/5">
          <ShieldAlert className="text-rose-500 mx-auto" size={48} />
          <h3 className="text-2xl font-bold">Something went wrong</h3>
          <p className="text-gray-400 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary hover:bg-primary-dark font-bold rounded-2xl transition-all shadow-lg shadow-primary/20"
          >
            Reload Page
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full items-center animate-pulse">
          {/* 1. Player Card Skeleton */}
          <div className="w-full aspect-video rounded-2xl md:rounded-3xl bg-white/[0.01] border border-white/5 flex items-center justify-center min-h-[200px]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Radio size={32} className="text-white/10" />
            </div>
          </div>

          {/* 2. Middle Cards Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Card 1: Channel Details Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-4 bg-white/[0.01] w-full">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 sm:h-5 bg-white/5 rounded w-2/3" />
                <div className="h-3.5 bg-white/5 rounded w-1/3" />
              </div>
            </div>

            {/* Card 2: Developer Info Skeleton */}
            <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-between gap-4 bg-white/[0.01] w-full">
              {/* Left block skeleton */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 bg-white/5 rounded w-16" />
                  <div className="flex gap-2.5">
                    <div className="w-4 h-4 bg-white/5 rounded" />
                    <div className="w-4 h-4 bg-white/5 rounded" />
                    <div className="w-4 h-4 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
              {/* Separator skeleton */}
              <div className="hidden xs:block h-10 w-[1px] bg-white/10 flex-shrink-0" />
              {/* Right block skeleton */}
              <div className="space-y-1.5 flex-1 pl-1">
                <div className="h-2.5 bg-white/5 rounded w-11/12" />
                <div className="h-2.5 bg-white/5 rounded w-4/5" />
              </div>
            </div>

            {/* Card 3: Total Channels Count Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-4 bg-white/[0.01] w-full">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          </div>

          {/* 3. Channels List Skeleton Card */}
          <div className="w-full glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-[550px] sm:h-[650px] gap-4">
            <div className="space-y-3 pb-3 border-b border-white/5">
              <div className="h-10 bg-white/5 rounded-xl sm:rounded-2xl w-full" />
              <div className="flex gap-2">
                <div className="h-8 bg-white/5 rounded-lg w-16" />
                <div className="h-8 bg-white/5 rounded-lg w-20" />
                <div className="h-8 bg-white/5 rounded-lg w-20" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 h-full">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-1.5 sm:space-y-2">
                      <div className="h-2.5 sm:h-3 w-1/3 bg-white/10 rounded" />
                      <div className="h-3.5 sm:h-4 w-2/3 bg-white/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full items-center">
          {/* 1. Player Card */}
          <div
            ref={playerWrapperRef}
            className="w-full"
          >
            <div
              ref={playerContainerRef}
              onMouseMove={handleMouseMove}
              onClick={handlePlayerClick}
              onDoubleClick={handlePlayerDoubleClick}
              className={`relative aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-black border border-white/5 shadow-2xl group ${
                showControls ? "cursor-default" : "cursor-none"
              }`}
            >
              <video
                ref={videoRef}
                playsInline
                muted={isMuted}
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
                    <VolumeX
                      size={14}
                      className="text-primary animate-pulse"
                    />
                    <span className="text-[10px] sm:text-xs font-bold tracking-wider">
                      TAP TO UNMUTE
                    </span>
                  </motion.div>
                </div>
              )}

              {/* Center Play Button Overlay when Paused */}
              {playerStatus === "playing" && isPaused && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/35 z-10 cursor-pointer transition-colors hover:bg-black/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-lg shadow-primary/30 border border-white/10"
                  >
                    <Play
                      size={28}
                      className="fill-white translate-x-0.5 md:w-8 md:h-8"
                    />
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
                        <span className="text-xs font-black tracking-widest">
                          -10s
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center gap-1 text-white bg-black/60 px-4 py-3 rounded-full backdrop-blur-md border border-white/10"
                      >
                        <ChevronsRight className="h-6 w-6 text-primary animate-pulse" />
                        <span className="text-xs font-black tracking-widest">
                          +10s
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Desktop Hover Seek Buttons */}
              <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-start pl-4 pointer-events-none z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(-10);
                  }}
                  className="desktop-seek-btn pointer-events-auto h-12 w-12 rounded-full bg-black/50 hover:bg-primary/80 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 cursor-pointer hidden md:flex"
                  title="Rewind 10s"
                >
                  <ChevronsLeft size={20} />
                </button>
              </div>

              <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-end pr-4 pointer-events-none z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(10);
                  }}
                  className="desktop-seek-btn pointer-events-auto h-12 w-12 rounded-full bg-black/50 hover:bg-primary/80 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 cursor-pointer hidden md:flex"
                  title="Forward 10s"
                >
                  <ChevronsRight size={20} />
                </button>
              </div>

              {/* Loader Overlay */}
              {playerStatus === "loading" && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold tracking-wider text-primary animate-pulse">
                    FETCHING IPTV LIVE STREAM...
                  </span>
                </div>
              )}

              {/* Error/Offline Overlay */}
              {playerStatus === "error" && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-10 px-6 text-center">
                  <ShieldAlert className="text-rose-500" size={40} />
                  <span className="text-base font-bold text-white">
                    Stream Currently Unavailable
                  </span>
                  <span className="text-xs text-gray-500 max-w-sm">
                    This live TV link might be offline, or blocked by the
                    original broadcaster.
                  </span>
                  <button
                    onClick={handleReload}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl border border-white/10 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Try Reconnecting</span>
                  </button>
                </div>
              )}

              {/* Idle Overlay */}
              {playerStatus === "idle" && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-10">
                  <Radio
                    size={40}
                    className="text-gray-600 animate-pulse"
                  />
                  <span className="text-sm text-gray-400 font-medium">
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
                        {isMuted || volume === 0 ? (
                          <VolumeX size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
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

                  {/* Center LIVE badge */}
                  <div className="flex items-center gap-1 bg-rose-600/90 text-white font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border border-rose-500/30 animate-pulse select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                    <span>LIVE</span>
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
                      onClick={handleFullscreen}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                    >
                      {isFullscreen ? (
                        <Minimize size={18} />
                      ) : (
                        <Maximize size={18} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Grid for Channel Details & Channel Count Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {selectedChannel ? (
              <>
                {/* Channel Details Card */}
                <motion.div
                  key={selectedChannel.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="md:col-span-1 glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full"
                >
                  {selectedChannel.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedChannel.logo}
                      alt={selectedChannel.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-xl sm:rounded-2xl bg-white/5 p-0.5 sm:p-1 border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-primary/30 to-violet-500/30 flex items-center justify-center font-bold text-sm sm:text-base text-primary border border-primary/20 flex-shrink-0">
                      {getInitials(selectedChannel.name)}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">
                      {selectedChannel.name}
                    </h2>
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded border border-primary/20 block w-fit">
                      {selectedChannel.group}
                    </span>
                  </div>
                </motion.div>

                {/* Developer Info Card */}
                <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-between gap-4 text-left bg-white/[0.01] w-full md:col-span-1">
                  {/* Left block: Avatar & Name/Socials */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="relative">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white/15 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="https://avatars.githubusercontent.com/u/171383675?v=4"
                          alt="S. SHAJON"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070414] z-10 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        S. SHAJON
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <a
                          href="https://github.com/SHAJON-404"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-white transition-colors"
                          title="GitHub"
                        >
                          <GithubIcon size={18} />
                        </a>
                        <a
                          href="https://t.me/SHAJON"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#26A5E4] transition-colors"
                          title="Telegram"
                        >
                          <TelegramIcon size={16} />
                        </a>
                        <a
                          href="https://www.facebook.com/shahmakhdumshajonofficial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#1877F2] transition-colors"
                          title="Facebook"
                        >
                          <FacebookIcon size={18} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Separator */}
                  <div className="hidden xs:block h-10 w-[1px] bg-white/10 flex-shrink-0" />

                  {/* Right block: Support details */}
                  <p className="text-[10px] sm:text-[10.5px] leading-normal text-gray-500 font-medium select-text flex-1 pl-1 min-w-[120px]">
                    For any support, contact via <a href="https://t.me/SHAJON" target="_blank" rel="noopener noreferrer" className="text-[#26A5E4] font-bold hover:underline">Telegram only</a>. Follow GitHub for updates!
                  </p>
                </div>

                {/* Channel Count Card */}
                <div className="glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full md:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Tv size={20} className="animate-pulse" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-gray-500 truncate">
                      Total Channels
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-emerald-400 truncate">
                      {channels.length} Channels
                    </h3>
                  </div>
                </div>
              </>
            ) : (
              /* Channel Count Card (Full width if no channel selected) */
              <div className="glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full md:col-span-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Tv size={20} className="animate-pulse" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-gray-500 truncate">
                    Total Channels
                  </p>
                  <h3 className="text-base sm:text-lg font-bold text-emerald-400 truncate">
                    {channels.length} Channels
                  </h3>
                </div>
              </div>
            )}
          </div>

          {/* 3. Channel List Card */}
          <div className="w-full glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-[550px] sm:h-[650px]">
            {/* Search and Filters */}
            <div className="space-y-3 sm:space-y-4 pb-3 sm:pb-4 border-b border-white/5">
              <div className="relative flex items-center bg-white/5 border border-white/5 focus-within:border-primary/50 rounded-xl sm:rounded-2xl p-1 transition-colors">
                <Search className="text-gray-500 ml-2.5 sm:ml-3" size={15} />
                <input
                  type="text"
                  placeholder="Search live TV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none py-1.5 sm:py-2 px-2.5 sm:px-3 text-sm text-white placeholder:text-gray-500"
                />
              </div>

              {/* Categories horizontally scrollable */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap border transition-all ${
                      selectedCategory === cat
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                        : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List styled as a responsive grid */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-3 sm:pt-4 pr-1 custom-scrollbar">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
                    >
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10" />
                      <div className="flex-1 space-y-1.5 sm:space-y-2">
                        <div className="h-2.5 sm:h-3 w-1/3 bg-white/10 rounded" />
                        <div className="h-3.5 sm:h-4 w-2/3 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm font-medium">
                  No channels found match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredChannels.map((chan) => {
                    const isSelected = selectedChannel?.id === chan.id;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => handleChannelSelect(chan)}
                        className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all group ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05] hover:border-white/10"
                        }`}
                      >
                        {chan.logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={chan.logo}
                            alt={chan.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg sm:rounded-xl bg-white/5 p-0.5 border border-white/10 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-white/5 to-white/10 flex items-center justify-center font-bold text-xs border border-white/10 text-gray-400 group-hover:text-white transition-colors">
                            {getInitials(chan.name)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                              isSelected ? "text-primary/75" : "text-gray-500"
                            }`}
                          >
                            {chan.group}
                          </p>
                          <p className="text-[13px] sm:text-sm font-bold truncate">
                            {chan.name}
                          </p>
                        </div>

                        {isSelected && (
                          <Play
                            size={13}
                            className="sm:w-3.5 sm:h-3.5 fill-primary text-primary animate-pulse"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. Footer with Developer Info */}
          <div className="w-full pt-4 md:pt-6 pb-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <p className="text-gray-500 text-[10px] sm:text-xs font-medium">
                  Watch premium live TV channels directly from official stream
                  sources.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[10px] sm:text-xs text-gray-400 font-medium whitespace-nowrap shadow-sm">
                  Developed by <span className="text-white font-bold ml-1">S. SHAJON</span>
                </span>
                <a
                  href="https://github.com/SHAJON-404/iptv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.18] text-[10px] sm:text-xs text-gray-300 hover:text-white font-semibold transition-all duration-300 shadow-sm whitespace-nowrap"
                >
                  <GithubIcon size={12} className="opacity-80" />
                  <span>GitHub Repository</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
