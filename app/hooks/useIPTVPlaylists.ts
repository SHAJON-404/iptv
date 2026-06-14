"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  type?: "dash" | "hls";
  kid?: string;
  key?: string;
}

export interface Playlist {
  id: string;
  name: string;
  type: "default" | "upload" | "url";
  url?: string;
  channels: Channel[];
}

// Detect iOS/iPadOS — these devices use native HLS and need special handling
export const getIsIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS reports as Mac but has touch — use modern userAgentData API with legacy fallback
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";
  return (platform === "macOS" || platform === "MacIntel") && navigator.maxTouchPoints > 1;
};

const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

export function useIPTVPlaylists() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [displayCount, setDisplayCount] = useState(80);

  // Playlist Management States
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: "fifa", name: "FIFA", type: "default", channels: [] },
    { id: "bangla", name: "Bangla", type: "default", channels: [] },
    { id: "sports", name: "Sports", type: "default", channels: [] },
    { id: "universal", name: "Universal", type: "default", channels: [] },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("fifa");

  // Custom playlist loading states
  const [playlistTab, setPlaylistTab] = useState<"browse" | "manage">("browse");
  const [importUrl, setImportUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [uploadPlaylistName, setUploadPlaylistName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- IndexedDB Cache Helpers for default playlists ---
  const openCacheDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("iptv-cache", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("channels")) {
          db.createObjectStore("channels");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const getCachedChannels = useCallback(async (playlistId: string): Promise<{ channels: Channel[]; hash: string } | null> => {
    try {
      const db = await openCacheDB();
      return new Promise((resolve) => {
        const tx = db.transaction("channels", "readonly");
        const store = tx.objectStore("channels");
        const req = store.get(`cached-data-${playlistId}`);
        req.onsuccess = () => {
          const result = req.result;
          if (!result) return resolve(null);
          // Expire cache after CACHE_MAX_AGE_MS
          const cachedAt = result.cachedAt || 0;
          if (Date.now() - cachedAt > CACHE_MAX_AGE_MS) {
            // Cache expired — delete and return null
            try {
              const delTx = db.transaction("channels", "readwrite");
              delTx.objectStore("channels").delete(`cached-data-${playlistId}`);
            } catch { /* ignore cleanup errors */ }
            return resolve(null);
          }
          resolve({ channels: result.channels, hash: result.hash });
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, [openCacheDB]);

  const clearCachedChannels = useCallback(async (playlistId: string) => {
    try {
      const db = await openCacheDB();
      const tx = db.transaction("channels", "readwrite");
      tx.objectStore("channels").delete(`cached-data-${playlistId}`);
    } catch { /* ignore */ }
  }, [openCacheDB]);

  const setCachedChannels = useCallback(async (playlistId: string, channelsList: Channel[], hash: string) => {
    try {
      const db = await openCacheDB();
      const tx = db.transaction("channels", "readwrite");
      const store = tx.objectStore("channels");
      store.put({ channels: channelsList, hash, cachedAt: Date.now() }, `cached-data-${playlistId}`);
    } catch (e) {
      console.warn("Failed to cache channels in IndexedDB:", e);
    }
  }, [openCacheDB]);

  // Helper: fetch fresh channels from server and update state + cache
  const fetchAndUpdatePlaylist = useCallback(async (playlistId: string) => {
    const response = await fetch(`/api/iptv/channels?type=${playlistId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to load channels for ${playlistId} (Status ${response.status})`);
    }
    const data = await response.json();
    const serverHash = response.headers.get("X-Channels-Hash") || "";

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, channels: data } : p
      )
    );

    // Store in IndexedDB for next load
    if (serverHash) {
      await setCachedChannels(playlistId, data, serverHash);
    }
  }, [setCachedChannels]);

  // 1. Fetch channel metadata with IndexedDB cache + SHA-256 hash validation for all default playlists
  useEffect(() => {
    const defaultPlaylistsToLoad = playlists.filter(
      (p) => p.type === "default" && p.channels.length === 0
    );

    if (defaultPlaylistsToLoad.length === 0) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    // Show loading spinner only if the active playlist is empty and needs to load
    const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
    if (activePlaylist && activePlaylist.type === "default" && activePlaylist.channels.length === 0) {
      setTimeout(() => setLoading(true), 0);
    }

    async function loadAll() {
      try {
        await Promise.all(
          defaultPlaylistsToLoad.map(async (pl) => {
            const playlistId = pl.id;

            // Step 1: Check IndexedDB cache (auto-expires after 15 min)
            const cached = await getCachedChannels(playlistId);
            if (cached && cached.channels.length > 0) {
              setPlaylists((prev) =>
                prev.map((p) =>
                  p.id === playlistId ? { ...p, channels: cached.channels } : p
                )
              );

              // If this is the active playlist, we can hide the loading spinner now
              if (playlistId === activePlaylistId) {
                setTimeout(() => setLoading(false), 0);
              }

              // Step 2: Fetch only the hash to verify freshness
              try {
                const hashResponse = await fetch(`/api/iptv/channels/hash?type=${playlistId}`, {
                  cache: "no-store",
                });
                if (hashResponse.ok) {
                  const { hash: serverHash } = await hashResponse.json();
                  if (serverHash === cached.hash) {
                    return; // Cache is fresh
                  }
                  // Hash mismatch — clear stale cache and fetch fresh data
                  await clearCachedChannels(playlistId);
                }
              } catch {
                // Ignore failure, fall through to reload
              }
            }

            // Step 3: Fetch full data
            await fetchAndUpdatePlaylist(playlistId);
          })
        );
      } catch (err: unknown) {
        console.error("Error loading default playlists:", err);
        // Only set error state if it affects the active playlist
        const activePlaylistAfter = playlists.find((p) => p.id === activePlaylistId);
        if (
          activePlaylistAfter &&
          activePlaylistAfter.type === "default" &&
          activePlaylistAfter.channels.length === 0
        ) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to load channel list. Please try again.";
          setError(message);
        }
      } finally {
        setTimeout(() => setLoading(false), 0);
      }
    }

    loadAll();
  }, [activePlaylistId, playlists, getCachedChannels, setCachedChannels, clearCachedChannels, fetchAndUpdatePlaylist]);

  // Periodic background hash check — every 15 minutes, verify all default playlists and refresh if stale
  useEffect(() => {
    const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    const checkAndRefresh = async () => {
      const defaultPlaylists = playlists.filter((p) => p.type === "default" && p.channels.length > 0);
      for (const pl of defaultPlaylists) {
        try {
          // Clear expired cache entries
          await clearCachedChannels(pl.id);

          // Check server hash
          const hashResponse = await fetch(`/api/iptv/channels/hash?type=${pl.id}`, {
            cache: "no-store",
          });
          if (!hashResponse.ok) continue;
          const { hash: serverHash } = await hashResponse.json();

          // Check current cached hash
          const cached = await getCachedChannels(pl.id);
          if (cached && cached.hash === serverHash) continue;

          // Hash mismatch or no cache — fetch fresh data
          await fetchAndUpdatePlaylist(pl.id);
        } catch {
          // Silently ignore per-playlist refresh errors
        }
      }
    };

    const intervalId = setInterval(checkAndRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [playlists, getCachedChannels, clearCachedChannels, fetchAndUpdatePlaylist]);

  // Sync active playlist channels to standard list representation
  useEffect(() => {
    const currentPlaylist = playlists.find(p => p.id === activePlaylistId);
    if (currentPlaylist) {
      const selectedChannelId = selectedChannel?.id;
      const selectedChannelUrl = selectedChannel?.url;

      setTimeout(() => {
        const filtered = getIsIOS()
          ? currentPlaylist.channels.filter(c => !(c.type === "dash" || c.url.includes(".mpd") || c.url.endsWith(".mpd")))
          : currentPlaylist.channels;

        setChannels(filtered);
        if (filtered.length > 0) {
          const alreadySelected = filtered.find(
            c => c.id === selectedChannelId || c.url === selectedChannelUrl
          );
          if (!alreadySelected) {
            const randomIndex = Math.floor(Math.random() * filtered.length);
            setSelectedChannel(filtered[randomIndex]);
          }
        } else {
          if (!loading) {
            setSelectedChannel(null);
          }
        }
      }, 0);
    }
  }, [activePlaylistId, playlists, selectedChannel?.id, selectedChannel?.url, loading]);

  // Hydrate playlists from localStorage on client-side mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("iptv_saved_playlists");
      const savedActiveId = localStorage.getItem("iptv_active_playlist_id");

      if (saved) {
        const parsedSaved = JSON.parse(saved) as Playlist[];
        const customPlaylists = parsedSaved.filter(p =>
          p.id !== "default" && p.id !== "sports" && p.id !== "universal" && p.id !== "bangla" && p.id !== "fifa"
        );

        setTimeout(() => {
          setPlaylists(prev => {
            const defaults = prev.filter(p => p.type === "default");
            return [
              ...defaults,
              ...customPlaylists
            ];
          });
        }, 0);
      }

      if (savedActiveId) {
        setTimeout(() => {
          const resolvedActiveId = savedActiveId === "default" ? "fifa" : savedActiveId;
          setActivePlaylistId(resolvedActiveId);
        }, 0);
      }
    } catch (e) {
      console.error("Failed to load playlists from localStorage:", e);
    }
  }, []);

  // Save custom playlists to localStorage whenever they change
  useEffect(() => {
    const customPlaylists = playlists.filter(p =>
      p.id !== "default" && p.id !== "sports" && p.id !== "universal" && p.id !== "bangla" && p.id !== "fifa"
    );
    try {
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
    type?: "dash" | "hls";
    kid?: string;
    key?: string;
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
        ...(ch.type && { type: ch.type }),
        ...(ch.kid && { kid: ch.kid }),
        ...(ch.key && { key: ch.key }),
      };
    });
  };

  // Custom playlist handlers
  const processFile = (file: File) => {
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

        const name = uploadPlaylistName.trim() || file.name.replace(/\.[^/.]+$/, "");
        const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}`,
          name: name,
          type: "upload",
          channels: parsed,
        };

        setPlaylists(prev => [...prev, newPlaylist]);
        setActivePlaylistId(newPlaylist.id);
        setPlaylistTab("browse");
        setUploadPlaylistName("");
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
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
    if (id === "default" || id === "sports" || id === "universal" || id === "bangla" || id === "fifa") return;

    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (activePlaylistId === id) {
        setActivePlaylistId("fifa");
      }
      return updated;
    });
  };

  return {
    channels,
    setChannels,
    loading,
    error,
    selectedChannel,
    setSelectedChannel,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    displayCount,
    setDisplayCount,
    playlists,
    setPlaylists,
    activePlaylistId,
    setActivePlaylistId,
    playlistTab,
    setPlaylistTab,
    importUrl,
    setImportUrl,
    playlistName,
    setPlaylistName,
    uploadPlaylistName,
    setUploadPlaylistName,
    isDragging,
    setIsDragging,
    isImporting,
    importError,
    setImportError,
    fileInputRef,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUrlImport,
    handleDeletePlaylist,
  };
}
