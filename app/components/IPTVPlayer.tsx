"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Tv,
  Play,
  Pause,
  Link,
  Check,
  Radio,
  Trash2,
  Upload,
  Search,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCw,
  RefreshCw,
  FileText,
  AlertCircle,
  ShieldAlert,
  PictureInPicture,
  ChevronsLeft,
  ChevronsRight,
  Users
} from "lucide-react";
import { FaGithub, FaTelegram, FaFacebook, FaYoutube } from "react-icons/fa6";

interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

interface Playlist {
  id: string;
  name: string;
  type: "default" | "upload" | "url";
  url?: string;
  channels: Channel[];
}

const getPlayableUrl = (url: string) => {
  if (url && url.startsWith("http://")) {
    return `/api/iptv/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export default function IPTVPlayer() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Playlist Management States
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: "default", name: "Default TV", type: "default", channels: [] },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("default");

  // Custom playlist loading states
  const [playlistTab, setPlaylistTab] = useState<"browse" | "manage">("browse");
  const [importUrl, setImportUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const isFullscreenRef = useRef(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isRotated, setIsRotated] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmuteCleanupRef = useRef<(() => void) | null>(null);

  const hlsRef = useRef<Hls | null>(null);
  const userMutedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const volumeRef = useRef(volume);
  const loadedUrlRef = useRef<string | null>(null);

  const [viewerCount, setViewerCount] = useState<number>(1);

  useEffect(() => {
    const fetchViewerCount = async () => {
      try {
        const response = await fetch("/api/iptv/viewers");
        if (response.ok) {
          const data = await response.json();
          if (typeof data.count === "number") {
            setViewerCount(data.count);
          }
        }
      } catch (error) {
        console.error("Failed to fetch viewer count:", error);
      }
    };

    fetchViewerCount();
    const interval = setInterval(fetchViewerCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    // Sync muted state imperatively instead of via React prop to avoid video re-renders
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
      const isFs = !!document.fullscreenElement;
      isFullscreenRef.current = isFs;

      // Notify BackgroundScene to pause/resume animation
      window.dispatchEvent(new CustomEvent("iptv-fullscreen", { detail: { isFullscreen: isFs } }));

      // Update state synchronously so CSS classes match immediately
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsRotated(false);
        const orientation = window.screen?.orientation as unknown as {
          type: string;
          angle: number;
          lock?: (orientation: "portrait" | "landscape" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary" | "any" | "natural") => Promise<void>;
          unlock?: () => void;
        };
        if (
          window.screen &&
          orientation &&
          typeof orientation.unlock === "function"
        ) {
          orientation.unlock();
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isRotated) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRotated]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsRotated(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
        .then(() => {
          const orientation = window.screen?.orientation as unknown as {
            type: string;
            angle: number;
            lock?: (orientation: "portrait" | "landscape" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary" | "any" | "natural") => Promise<void>;
            unlock?: () => void;
          };
          if (
            window.screen &&
            orientation &&
            typeof orientation.lock === "function"
          ) {
            orientation
              .lock("landscape")
              .catch((err) => console.warn("Auto lock landscape failed:", err));
          }
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

  // Hydrate playlists from localStorage on client-side mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("iptv_saved_playlists");
      const savedActiveId = localStorage.getItem("iptv_active_playlist_id");

      if (saved) {
        const parsedSaved = JSON.parse(saved) as Playlist[];
        const customPlaylists = parsedSaved.filter(p => p.id !== "default");

        setTimeout(() => {
          setPlaylists(prev => [
            prev[0], // Keep default
            ...customPlaylists
          ]);
        }, 0);
      }

      if (savedActiveId) {
        setTimeout(() => {
          setActivePlaylistId(savedActiveId);
        }, 0);
      }
    } catch (e) {
      console.error("Failed to load playlists from localStorage:", e);
    }
  }, []);

  // Save custom playlists to localStorage whenever they change
  useEffect(() => {
    if (playlists.length <= 1 && playlists[0].channels.length === 0) return;
    try {
      const customPlaylists = playlists.filter(p => p.id !== "default");
      localStorage.setItem("iptv_saved_playlists", JSON.stringify(customPlaylists));
    } catch (e) {
      console.error("Failed to save playlists to localStorage:", e);
    }
  }, [playlists]);

  // Sync activePlaylistId to localStorage
  useEffect(() => {
    if (activePlaylistId) {
      localStorage.setItem("iptv_active_playlist_id", activePlaylistId);
    }
  }, [activePlaylistId]);

  // 1. Fetch channel metadata from our API route once on mount
  useEffect(() => {
    async function loadChannels() {
      try {
        setLoading(true);
        const response = await fetch("/api/iptv/channels");
        if (!response.ok) {
          throw new Error(`Failed to load channels (Status ${response.status})`);
        }
        const data = await response.json();

        setPlaylists(prev => {
          return prev.map(p => {
            if (p.id === "default") {
              return { ...p, channels: data };
            }
            return p;
          });
        });
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

  // Sync active playlist channels to standard list representation
  useEffect(() => {
    const currentPlaylist = playlists.find(p => p.id === activePlaylistId);
    if (currentPlaylist) {
      const selectedChannelId = selectedChannel?.id;
      const selectedChannelUrl = selectedChannel?.url;

      setTimeout(() => {
        setChannels(currentPlaylist.channels);
        if (currentPlaylist.channels.length > 0) {
          const alreadySelected = currentPlaylist.channels.find(
            c => c.id === selectedChannelId || c.url === selectedChannelUrl
          );
          if (!alreadySelected) {
            const defaultChan = currentPlaylist.channels.find(
              (c: Channel) =>
                c.name.toLowerCase().includes("t sports") ||
                c.name.toLowerCase().includes("t-sports")
            );
            setSelectedChannel(defaultChan || currentPlaylist.channels[0]);
          }
        } else {
          setSelectedChannel(null);
        }
      }, 0);
    }
  }, [activePlaylistId, playlists, selectedChannel?.id, selectedChannel?.url]);

  // M3U & JSON Parsing Helpers
  const parseM3U = (text: string): Channel[] => {
    const lines = text.split(/\r?\n/);
    const parsedChannels: Channel[] = [];
    let currentChannel: Partial<Channel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith("#EXTINF:")) {
        currentChannel = {};

        const logoMatch = line.match(/(?:tvg-logo|logo)="([^"]+)"/i);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        const groupMatch = line.match(/(?:group-title|tvg-group|group)="([^"]+)"/i);
        if (groupMatch) currentChannel.group = groupMatch[1];

        const commaIndex = line.lastIndexOf(",");
        if (commaIndex !== -1) {
          currentChannel.name = line.substring(commaIndex + 1).trim();
        }
      } else if (
        line.startsWith("http://") ||
        line.startsWith("https://") ||
        (line && !line.startsWith("#"))
      ) {
        if (currentChannel.name || line.includes("index.m3u8") || line.includes(".m3u8") || line.includes(".mp4")) {
          currentChannel.url = line;
          if (!currentChannel.name) {
            const parts = line.split("/");
            currentChannel.name = parts[parts.length - 1] || "Channel " + (parsedChannels.length + 1);
          }
          currentChannel.id = `custom-ch-${parsedChannels.length}-${Date.now()}`;
          if (!currentChannel.group) currentChannel.group = "Custom";
          if (!currentChannel.logo) currentChannel.logo = "";

          parsedChannels.push(currentChannel as Channel);
        }
        currentChannel = {};
      }
    }

    return parsedChannels;
  };

  interface RawChannelInput {
    id?: string;
    name?: string;
    title?: string;
    logo?: string;
    logoUrl?: string;
    image?: string;
    group?: string;
    category?: string;
    url?: string;
    streamUrl?: string;
    link?: string;
  }

  const parseJSON = (text: string): Channel[] => {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data.channels || data.items || [];
    if (!Array.isArray(list)) {
      throw new Error("Invalid playlist JSON format. Expected an array of channels.");
    }
    return list.map((ch: RawChannelInput, idx: number) => {
      const url = ch.url || ch.streamUrl || ch.link;
      if (!url) throw new Error(`Channel at index ${idx} is missing a streaming URL ('url')`);
      return {
        id: ch.id || `custom-json-${idx}-${Date.now()}`,
        name: ch.name || ch.title || `Channel ${idx + 1}`,
        logo: ch.logo || ch.logoUrl || ch.image || "",
        group: ch.group || ch.category || "Custom",
        url: url,
      };
    });
  };

  // Custom playlist handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: Channel[] = [];

        if (file.name.endsWith(".json")) {
          parsed = parseJSON(text);
        } else {
          parsed = parseM3U(text);
        }

        if (parsed.length === 0) {
          throw new Error("No channels could be parsed from this file.");
        }

        const name = file.name.replace(/\.[^/.]+$/, "");
        const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}`,
          name: name,
          type: "upload",
          channels: parsed,
        };

        setPlaylists(prev => [...prev, newPlaylist]);
        setActivePlaylistId(newPlaylist.id);
        setPlaylistTab("browse");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setImportError(
          err instanceof Error
            ? err.message
            : "Failed to parse file. Ensure it is a valid M3U or JSON playlist."
        );
      }
    };
    reader.onerror = () => {
      setImportError("Error reading file.");
    };
    reader.readAsText(file);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const proxiedUrl = `/api/iptv/proxy?url=${encodeURIComponent(importUrl.trim())}`;
      const res = await fetch(proxiedUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch from URL (Status ${res.status})`);
      }

      const text = await res.text();
      let parsed: Channel[] = [];

      const trimmedText = text.trim();
      if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
        parsed = parseJSON(text);
      } else {
        parsed = parseM3U(text);
      }

      if (parsed.length === 0) {
        throw new Error("No channels could be parsed from this URL.");
      }

      let name = playlistName.trim();
      if (!name) {
        try {
          const urlObj = new URL(importUrl);
          name = urlObj.hostname + urlObj.pathname.substring(urlObj.pathname.lastIndexOf("/"));
          name = name.replace(/\.[^/.]+$/, "");
        } catch {
          name = "Imported URL Playlist";
        }
      }

      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: name,
        type: "url",
        url: importUrl,
        channels: parsed,
      };

      setPlaylists(prev => [...prev, newPlaylist]);
      setActivePlaylistId(newPlaylist.id);
      setImportUrl("");
      setPlaylistName("");
      setPlaylistTab("browse");
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : "Failed to import from URL. Please check the link or CORS policy."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === "default") return;

    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (activePlaylistId === id) {
        setActivePlaylistId("default");
      }
      return updated;
    });
  };

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
        const playableUrl = getPlayableUrl(chan.url);
        hls.loadSource(playableUrl);

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
        const playableUrl = getPlayableUrl(chan.url);
        video.src = playableUrl;

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
          <div className="w-full aspect-video rounded-2xl md:rounded-3xl bg-white/[0.01] border border-white/5 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <Radio size={32} className="text-white/20 animate-pulse" />
            </div>
          </div>

          {/* 2. Middle Cards Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* Card 1: Channel Details Skeleton */}
            <div className="glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-4 bg-white/[0.01] w-full animate-pulse">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 sm:h-5 bg-white/10 rounded w-2/3 animate-pulse" />
                <div className="h-3.5 bg-white/10 rounded w-1/3 animate-pulse" />
              </div>
            </div>

            {/* Card 2: Developer Info Skeleton */}
            <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-between gap-4 bg-white/[0.01] w-full animate-pulse">
              {/* Left block skeleton */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/10 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded w-16 animate-pulse" />
                  <div className="flex gap-2.5">
                    <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
                    <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              {/* Separator skeleton */}
              <div className="hidden xs:block h-10 w-[1px] bg-white/10 flex-shrink-0" />
              {/* Right block skeleton */}
              <div className="space-y-1.5 flex-1 pl-1">
                <div className="h-2.5 bg-white/10 rounded w-11/12 animate-pulse" />
                <div className="h-2.5 bg-white/10 rounded w-4/5 animate-pulse" />
              </div>
            </div>

            {/* Card 3: Stats Skeleton Block */}
            <div className="grid grid-cols-2 gap-4 w-full md:col-span-1">
              <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-3 bg-white/[0.01] w-full animate-pulse">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/10 flex-shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
                </div>
              </div>
              <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center gap-3 bg-white/[0.01] w-full animate-pulse">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/10 flex-shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
                </div>
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
              style={{ willChange: "transform" }}
              className={`bg-black shadow-2xl group ${isRotated
                  ? "fixed z-[9999] top-1/2 left-1/2 w-[100vh] h-[100vw] -translate-x-1/2 -translate-y-1/2 rotate-90 origin-center"
                  : isFullscreen
                    ? "relative w-full h-full bg-black"
                    : "relative aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-black border border-white/5 w-full"
                } ${showControls ? "cursor-default" : "cursor-none"
                }`}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
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
                          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(isMuted ? 0 : volume) * 100
                            }%, rgba(255, 255, 255, 0.25) ${(isMuted ? 0 : volume) * 100
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
            {/* Channel Details Card / Skeleton */}
            {selectedChannel ? (
              <motion.div
                key={selectedChannel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`md:col-span-1 glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full ${playerStatus === "loading" ? "animate-pulse" : ""
                  }`}
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
            ) : (
              <div className="md:col-span-1 glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-4 text-left bg-white/[0.01] w-full">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex-shrink-0 flex items-center justify-center">
                  <Tv size={20} className="text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-300">Select a Channel</h2>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-gray-500">Choose from the list below</span>
                </div>
              </div>
            )}

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
                      <FaGithub size={18} />
                    </a>
                    <a
                      href="https://t.me/SHAJON"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#26A5E4] transition-colors"
                      title="Telegram"
                    >
                      <FaTelegram size={18} />
                    </a>
                    <a
                      href="https://www.facebook.com/shahmakhdumshajonofficial"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#1877F2] transition-colors"
                      title="Facebook"
                    >
                      <FaFacebook size={18} />
                    </a>
                    <a
                      href="https://youtube.com/@SHAJON-404"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#FF0000] transition-colors"
                      title="YouTube"
                    >
                      <FaYoutube size={18} />
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

            {/* Stats Block: Total Channels & Currently Watching */}
            <div className="grid grid-cols-2 gap-4 w-full md:col-span-1">
              {/* Card 3a: Total Channels */}
              <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-3 text-left bg-white/[0.01] w-full">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Tv size={18} className="animate-pulse" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-gray-500 truncate">
                    Total Channels
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-emerald-400 truncate">
                    {channels.length}
                  </h3>
                </div>
              </div>

              {/* Card 3b: Currently Watching */}
              <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl md:rounded-3xl flex flex-row items-center justify-start gap-3 text-left bg-white/[0.01] w-full">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Users size={18} className="animate-pulse" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] uppercase font-bold tracking-widest text-gray-500 truncate">
                    Watching Now
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-blue-400 truncate">
                    {viewerCount}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Channel List Card */}
          <div className="w-full glass-card p-4 sm:p-6 border border-white/5 rounded-2xl md:rounded-3xl bg-white/[0.01] flex flex-col h-[600px] sm:h-[700px]">
            {/* Playlist Header & Tab Bar */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/5 flex-wrap gap-2">
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setPlaylistTab("browse")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${playlistTab === "browse"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-gray-400 hover:text-white"
                    }`}
                >
                  <Tv size={14} />
                  <span>Browse Channels</span>
                </button>
                <button
                  onClick={() => setPlaylistTab("manage")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${playlistTab === "manage"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-gray-400 hover:text-white"
                    }`}
                >
                  <Upload size={14} />
                  <span>Playlists Manager</span>
                </button>
              </div>

              {/* Display active playlist name */}
              <div className="text-[10px] sm:text-xs text-gray-400 bg-white/5 border border-white/5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl max-w-[180px] sm:max-w-[260px] truncate select-none flex items-center gap-1.5 sm:gap-2">
                <span className="font-semibold shrink-0">Playlist:</span>
                <span className="text-white font-bold truncate">
                  {playlists.find((p) => p.id === activePlaylistId)?.name}
                </span>
              </div>
            </div>

            {playlistTab === "browse" ? (
              <>
                {/* Search and Filters */}
                <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 border-b border-white/5">
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
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap border transition-all ${selectedCategory === cat
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
                            className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all group ${isSelected
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
                                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? "text-primary/75" : "text-gray-500"
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
              </>
            ) : (
              <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-6 custom-scrollbar text-left">
                {/* Import Playlist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* URL Import Box */}
                  <form onSubmit={handleUrlImport} className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl bg-white/[0.01] flex flex-col justify-between min-h-[180px] hover:border-primary/20 transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Link size={18} />
                        </div>
                        <h4 className="font-bold text-sm sm:text-base">Load from URL</h4>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Playlist Name (e.g. My IPTV)"
                          value={playlistName}
                          onChange={(e) => setPlaylistName(e.target.value)}
                          className="w-full bg-white/5 border border-white/5 focus-within:border-primary/40 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-500 outline-none transition-colors"
                        />
                        <input
                          type="url"
                          placeholder="https://example.com/playlist.m3u"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          required
                          className="w-full bg-white/5 border border-white/5 focus-within:border-primary/40 rounded-xl py-2.5 px-3 text-xs text-white placeholder:text-gray-500 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isImporting}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Importing Stream...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Import Playlist</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* File Upload Box */}
                  <div className="glass-card p-4 sm:p-5 border border-white/5 rounded-2xl bg-white/[0.01] flex flex-col justify-between min-h-[180px] hover:border-primary/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Upload size={18} />
                        </div>
                        <h4 className="font-bold text-sm sm:text-base">Upload Playlist File</h4>
                      </div>
                      <p className="text-xs text-gray-400">
                        Upload local .m3u, .m3u8, or .json playlist files. Stored securely in your browser cache.
                      </p>
                    </div>

                    <div className="mt-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".m3u,.m3u8,.json"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                      >
                        <Upload size={14} />
                        <span>Choose M3U or JSON File</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation Errors */}
                {importError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Saved Playlists */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm sm:text-base text-gray-300">Your Playlists</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {playlists.map((pl) => {
                      const isActive = pl.id === activePlaylistId;
                      return (
                        <div
                          key={pl.id}
                          onClick={() => {
                            setActivePlaylistId(pl.id);
                            setPlaylistTab("browse");
                          }}
                          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer group/item ${isActive
                              ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5"
                              : "bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05] hover:border-white/10"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl border flex-shrink-0 ${isActive ? "bg-primary/20 border-primary/20" : "bg-white/5 border-white/10"
                              }`}>
                              {pl.type === "default" ? (
                                <Tv size={16} />
                              ) : pl.type === "url" ? (
                                <Link size={16} />
                              ) : (
                                <FileText size={16} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h5 className="font-bold text-xs sm:text-sm truncate pr-2">{pl.name}</h5>
                              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                {pl.channels.length} Channels • {pl.type === "default" ? "Built-in" : pl.type === "url" ? "URL" : "Uploaded File"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive && (
                              <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <Check size={12} className="stroke-[3]" />
                              </span>
                            )}
                            {pl.id !== "default" && (
                              <button
                                onClick={(e) => handleDeletePlaylist(pl.id, e)}
                                className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all opacity-0 group-hover/item:opacity-100 focus:opacity-100 cursor-pointer"
                                title="Delete Playlist"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
                  Developed by{" "}
                  <span className="text-white font-bold ml-1">S. SHAJON</span>
                </span>
                <a
                  href="https://github.com/SHAJON-404/iptv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.18] text-[10px] sm:text-xs text-gray-300 hover:text-white font-semibold transition-all duration-300 shadow-sm whitespace-nowrap"
                >
                  <FaGithub size={12} className="opacity-80" />
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
