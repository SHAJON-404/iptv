"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { parseM3U, parseJSON } from "@/app/lib/playlistParser";

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("IPTVAppDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store");
      }
    };
  });
};

const getFromDB = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("store", "readonly");
      const store = transaction.objectStore("store");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? (request.result as T) : null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB get error:", e);
    return null;
  }
};

const saveToDB = async <T>(key: string, value: T): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("store", "readwrite");
      const store = transaction.objectStore("store");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB save error:", e);
  }
};

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  type?: "dash" | "hls" | "ts";
  kid?: string;
  key?: string;
  useProxy?: boolean;
  referer?: string;
  customHeaders?: Record<string, string>;
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
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? "";
  const isMac = platform === "macOS" || /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua);
  return isMac && navigator.maxTouchPoints > 1;
};

export const getIsAppleDevice = (): boolean => {
  if (typeof navigator === "undefined") return false;
  if (getIsIOS()) return true;
  const ua = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? "";
  return platform === "macOS" || /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua);
};

export function useIPTVPlaylists() {
  const { status } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // (Default playlist logic and IndexedDB cache have been removed)

  // Loading spinner is now initialized to false natively

  // Sync active playlist channels to standard list representation
  useEffect(() => {
    const currentPlaylist = playlists.find(p => p.id === activePlaylistId);
    if (currentPlaylist) {
      const filtered = getIsAppleDevice()
        ? currentPlaylist.channels.filter(c => !(c.type === "dash" || c.url.includes(".mpd") || c.url.endsWith(".mpd")))
        : currentPlaylist.channels;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannels(filtered);
      
      // Reset search and filters when playlist changes
      setSearchQuery("");
      setSelectedCategory("All");
      setDisplayCount(80);

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

  // Hydrate playlists from IndexedDB/localStorage on client-side mount
  useEffect(() => {
    const hydrate = async () => {
      try {
        let savedPlaylists = await getFromDB<Playlist[]>("iptv_saved_playlists");

        // Fallback to localStorage if IndexedDB is empty (migration)
        if (!savedPlaylists) {
          const localStr = localStorage.getItem("iptv_saved_playlists");
          if (localStr) {
            savedPlaylists = JSON.parse(localStr) as Playlist[];
            await saveToDB("iptv_saved_playlists", savedPlaylists);
          }
        }

        const savedActiveId = localStorage.getItem("iptv_active_playlist_id");

        if (savedPlaylists && Array.isArray(savedPlaylists)) {
          const customPlaylists = savedPlaylists.filter(p => p.type !== "default");
          setPlaylists(customPlaylists);

          if (savedActiveId && customPlaylists.find(p => p.id === savedActiveId)) {
            setActivePlaylistId(savedActiveId);
          } else if (customPlaylists.length > 0) {
            setActivePlaylistId(customPlaylists[0].id);
          } else {
            setPlaylistTab("manage");
          }
        } else {
          setPlaylistTab("manage");
        }
      } catch (e) {
        console.error("Failed to load playlists from DB:", e);
        setPlaylistTab("manage");
      } finally {
        setIsHydrated(true);
      }
    };
    hydrate();
  }, []);

  // Auto-switch to browse tab when playlists become available
  useEffect(() => {
    if (isHydrated && playlists.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaylistTab("browse");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlists.length > 0, isHydrated]);

  // Save custom playlists to IndexedDB whenever they change
  useEffect(() => {
    if (!isHydrated) return; // Don't save empty state during hydration
    const localOnly = playlists.filter(p => !p.id.startsWith("db-playlist-"));
    saveToDB("iptv_saved_playlists", localOnly).catch(e =>
      console.error("Failed to save playlists to DB:", e)
    );
  }, [playlists, isHydrated]);

  // Sync activePlaylistId to localStorage
  useEffect(() => {
    if (activePlaylistId) {
      localStorage.setItem("iptv_active_playlist_id", activePlaylistId);
    }
  }, [activePlaylistId]);

  // M3U & JSON Parsing Helpers are imported from "@/app/lib/playlistParser"

  // Define function to fetch and refresh DB & Local URL playlists
  const refreshAllPlaylists = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setIsUpdating(true);
      setUpdateSuccess(false);

      // Immediately delete old cache for all playlists upon manual update
      await saveToDB("iptv_db_playlists_cache", []);
      localStorage.removeItem("iptv_db_playlists_cache");

      try {
        let savedLocal = await getFromDB<Playlist[]>("iptv_saved_playlists");
        if (!savedLocal) {
          const localStr = localStorage.getItem("iptv_saved_playlists");
          if (localStr) savedLocal = JSON.parse(localStr);
        }
        if (savedLocal && Array.isArray(savedLocal)) {
          const clearedLocal = savedLocal.map(p => p.type === 'url' ? { ...p, channels: [] } : p);
          await saveToDB("iptv_saved_playlists", clearedLocal);
          localStorage.setItem("iptv_saved_playlists", JSON.stringify(clearedLocal));
        }
      } catch (e) {
        console.error("Failed to clear local cache:", e);
      }

      // Update UI state immediately to show cache is deleted
      setPlaylists(prev => prev.map(p => 
        (p.type === "url" || p.id.startsWith("db-playlist-")) ? { ...p, channels: [] } : p
      ));
    }
    console.log("[useIPTVPlaylists] refreshAllPlaylists triggered. status:", status, "isManual:", isManual);
    // Refresh DB playlists (cloud-saved)
    const loadedDBPlaylists: Playlist[] = [];
    if (status === "authenticated") {
      try {
        const res = await fetch("/api/iptv/playlists");
        if (res.ok) {
          const data = await res.json();
          interface DBSavedPlaylist {
            id: string;
            name: string;
            url: string;
          }
          const dbPlaylists = (data.playlists || []) as DBSavedPlaylist[];
          console.log("[useIPTVPlaylists] DB returned playlists count:", dbPlaylists.length);

          // Read existing cache first so we can fall back to it
          let existingCached: Playlist[] = [];
          if (!isManual) {
            try {
              const cached = await getFromDB<Playlist[]>("iptv_db_playlists_cache");
              if (cached && Array.isArray(cached)) {
                existingCached = cached;
              } else {
                const localStr = localStorage.getItem("iptv_db_playlists_cache");
                if (localStr) existingCached = JSON.parse(localStr) as Playlist[];
              }
            } catch (e) {
              console.error("Failed to parse cached DB playlists:", e);
            }
          }

          for (const dbp of dbPlaylists) {
            const dbPlaylistId = `db-playlist-${dbp.id}`;
            try {
              console.log(`[useIPTVPlaylists] Fetching DB playlist content for: ${dbp.name} (${dbp.url})`);
              const proxiedUrl = `/api/iptv/proxy?url=${encodeURIComponent(dbp.url.trim())}`;
              const fileRes = await fetch(proxiedUrl);
              if (fileRes.ok) {
                const text = await fileRes.text();
                let parsed: Channel[] = [];
                const trimmedText = text.trim();
                if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
                  parsed = parseJSON(text);
                } else {
                  parsed = parseM3U(text);
                }

                if (parsed.length > 0) {
                  console.log(`[useIPTVPlaylists] Successfully parsed ${parsed.length} channels for ${dbp.name}`);
                  loadedDBPlaylists.push({
                    id: dbPlaylistId,
                    name: dbp.name,
                    type: "url",
                    url: dbp.url,
                    channels: parsed,
                  });
                  continue;
                }
              } else {
                console.warn(`[useIPTVPlaylists] Failed to fetch proxy URL for ${dbp.name}, status: ${fileRes.status}`);
              }
            } catch (e) {
              console.error(`[useIPTVPlaylists] Failed to refresh DB playlist ${dbp.name}:`, e);
            }

            // Fallback: If network fetch failed, errored, or returned 0 channels,
            // try to keep the existing cached channels for this playlist.
            const existing = existingCached.find(p => p.id === dbPlaylistId);
            if (existing) {
              console.log(`[useIPTVPlaylists] Using cached channels fallback for: ${dbp.name}`);
              loadedDBPlaylists.push({
                ...existing,
                name: dbp.name,
                url: dbp.url,
              });
            } else {
              console.log(`[useIPTVPlaylists] No cache found for ${dbp.name}. Creating empty playlist structure.`);
              loadedDBPlaylists.push({
                id: dbPlaylistId,
                name: dbp.name,
                type: "url",
                url: dbp.url,
                channels: [],
              });
            }
          }

          // Save loaded playlists to cache
          await saveToDB("iptv_db_playlists_cache", loadedDBPlaylists);
        } else {
          console.error("[useIPTVPlaylists] Failed to fetch playlists from API, status:", res.status);
        }
      } catch (err) {
        console.error("Error refreshing DB playlists:", err);
      }
    }

    // Refresh Local URL Playlists
    let localPlaylists: Playlist[] = [];
    try {
      const saved = await getFromDB<Playlist[]>("iptv_saved_playlists");
      if (saved && Array.isArray(saved)) {
        localPlaylists = saved;
      } else {
        const localStr = localStorage.getItem("iptv_saved_playlists");
        if (localStr) localPlaylists = JSON.parse(localStr) as Playlist[];
      }
    } catch (e) {
      console.error("Failed to read local playlists for refresh:", e);
    }

    const updatedLocalPlaylists: Playlist[] = [];
    for (const pl of localPlaylists) {
      if (pl.type === "url" && pl.url) {
        try {
          const proxiedUrl = `/api/iptv/proxy?url=${encodeURIComponent(pl.url.trim())}`;
          const fileRes = await fetch(proxiedUrl);
          if (fileRes.ok) {
            const text = await fileRes.text();
            let parsed: Channel[] = [];
            const trimmedText = text.trim();
            if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
              parsed = parseJSON(text);
            } else {
              parsed = parseM3U(text);
            }
            if (parsed.length > 0) {
              updatedLocalPlaylists.push({
                ...pl,
                channels: parsed,
              });
              continue;
            }
          }
        } catch (e) {
          console.error(`Failed to refresh local playlist ${pl.name}:`, e);
        }
      }
      updatedLocalPlaylists.push(pl);
    }

    // Update state with both refreshed local and DB playlists
    setPlaylists(() => {
      const merged = [...updatedLocalPlaylists, ...loadedDBPlaylists];

      setActivePlaylistId(currentId => {
        if (currentId && merged.find(p => p.id === currentId)) {
          return currentId;
        }
        return merged.length > 0 ? merged[0].id : "";
      });
      return merged;
    });

    if (isManual) {
      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 2000);
    }
  }, [status]);

  // Load saved playlists from database and sync with cache (every 10 minutes)
  useEffect(() => {
    if (!isHydrated) return;

    console.log("[useIPTVPlaylists] auth status changed:", status, "isHydrated:", isHydrated);

    // 1. If authenticated, load from DB cache first for instant UI response
    if (status === "authenticated") {
      getFromDB<Playlist[]>("iptv_db_playlists_cache").then(cached => {
        if (!cached) {
          const localStr = localStorage.getItem("iptv_db_playlists_cache");
          if (localStr) cached = JSON.parse(localStr) as Playlist[];
        }

        if (cached && Array.isArray(cached)) {
          console.log("[useIPTVPlaylists] Found cached DB playlists:", cached.length);
          setPlaylists(prev => {
            const localOnly = prev.filter(p => !p.id.startsWith("db-playlist-"));
            const merged = [...localOnly, ...cached];

            setActivePlaylistId(currentId => {
              if (currentId && merged.find(p => p.id === currentId)) {
                return currentId;
              }
              return merged.length > 0 ? merged[0].id : "";
            });
            return merged;
          });
        } else {
          console.log("[useIPTVPlaylists] No cached DB playlists found.");
        }
      }).catch(e => console.error("Failed to load cached DB playlists:", e));
    } else if (status === "unauthenticated") {
      console.log("[useIPTVPlaylists] Unauthenticated. Clearing DB playlists.");
      // If unauthenticated, clear any DB playlists from the state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaylists(prev => prev.filter(p => !p.id.startsWith("db-playlist-")));
    }

    // Trigger initial refresh in the background
    refreshAllPlaylists(false);

    // 3. Set up interval to automatically refresh every 10 minutes (during active session)
    const intervalId = setInterval(() => {
      refreshAllPlaylists(false);
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [status, isHydrated, refreshAllPlaylists]);

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
    isUpdating,
    updateSuccess,
    refreshAllPlaylists,
  };
}
