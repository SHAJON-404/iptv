"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  type?: "dash" | "hls" | "ts";
  kid?: string;
  key?: string;
  no_proxy?: boolean;
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
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("");

  // Custom playlist loading states
  const [playlistTab, setPlaylistTab] = useState<"browse" | "manage">("browse");
  const [importUrl, setImportUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [uploadPlaylistName, setUploadPlaylistName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (Default playlist logic and IndexedDB cache have been removed)

  // Initially stop loading spinner since there are no default playlists to load
  useEffect(() => {
    setLoading(false);
  }, []);

  // Sync active playlist channels to standard list representation
  useEffect(() => {
    const currentPlaylist = playlists.find(p => p.id === activePlaylistId);
    if (currentPlaylist) {
      const filtered = getIsIOS()
        ? currentPlaylist.channels.filter(c => !(c.type === "dash" || c.url.includes(".mpd") || c.url.endsWith(".mpd")))
        : currentPlaylist.channels;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannels(filtered);
      
      if (filtered.length > 0) {
        setSelectedChannel(prev => {
          if (prev) {
            const alreadySelected = filtered.find(c => c.id === prev.id || c.url === prev.url);
            if (alreadySelected) {
              return prev !== alreadySelected ? alreadySelected : prev;
            }
          }
          // Select a random channel if none was selected, or if switching to a new playlist
          const randomIndex = Math.floor(Math.random() * filtered.length);
          return filtered[randomIndex];
        });
      } else {
        if (!loading) {
          setSelectedChannel(null);
        }
      }
    }
  }, [activePlaylistId, playlists, loading]);

  // Hydrate playlists from localStorage on client-side mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("iptv_saved_playlists");
      const savedActiveId = localStorage.getItem("iptv_active_playlist_id");

      if (saved) {
        const parsedSaved = JSON.parse(saved) as Playlist[];
        const customPlaylists = parsedSaved.filter(p => p.type !== "default");

        setTimeout(() => {
          setPlaylists(customPlaylists);
          
          if (savedActiveId && customPlaylists.find(p => p.id === savedActiveId)) {
            setActivePlaylistId(savedActiveId);
          } else if (customPlaylists.length > 0) {
            setActivePlaylistId(customPlaylists[0].id);
          } else {
            setPlaylistTab("manage");
          }
        }, 0);
      } else {
        setTimeout(() => setPlaylistTab("manage"), 0);
      }
    } catch (e) {
      console.error("Failed to load playlists from localStorage:", e);
    }
  }, []);

  // Save custom playlists to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("iptv_saved_playlists", JSON.stringify(playlists));
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
    type?: "dash" | "hls" | "ts";
    kid?: string;
    key?: string;
    no_proxy?: boolean;
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
        ...(ch.no_proxy !== undefined && { no_proxy: ch.no_proxy }),
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

    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (activePlaylistId === id) {
        setActivePlaylistId(updated.length > 0 ? updated[0].id : "");
      }
      if (updated.length === 0) {
        setPlaylistTab("manage");
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
