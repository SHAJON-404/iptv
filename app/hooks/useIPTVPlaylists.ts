"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

const CACHE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

const openCacheDB = (): Promise<IDBDatabase> => {
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
};

const getCachedChannels = async (playlistId: string): Promise<{ channels: Channel[]; hash: string } | null> => {
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
          try {
            const delTx = db.transaction("channels", "readwrite");
            delTx.objectStore("channels").delete(`cached-data-${playlistId}`);
          } catch { /* ignore */ }
          return resolve(null);
        }
        resolve({ channels: result.channels, hash: result.hash });
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const clearCachedChannels = async (playlistId: string): Promise<void> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction("channels", "readwrite");
    tx.objectStore("channels").delete(`cached-data-${playlistId}`);
  } catch { /* ignore */ }
};

const setCachedChannels = async (playlistId: string, channelsList: Channel[], hash: string): Promise<void> => {
  try {
    const db = await openCacheDB();
    const tx = db.transaction("channels", "readwrite");
    const store = tx.objectStore("channels");
    store.put({ channels: channelsList, hash, cachedAt: Date.now() }, `cached-data-${playlistId}`);
  } catch (e) {
    console.warn("Failed to cache channels in IndexedDB:", e);
  }
};

const getPlaylistId = (name: string, url: string): string => {
  const filename = url.split('/').pop()?.replace('.json', '');
  if (filename) return filename;
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-");
};

const sortPlaylists = (list: Playlist[]): Playlist[] => {
  const order: Record<string, number> = {
    "fifa": 1,
    "bangla": 2,
    "sports": 3,
    "universal": 4,
  };
  return [...list].sort((a, b) => {
    const orderA = order[a.id.toLowerCase()] ?? 999;
    const orderB = order[b.id.toLowerCase()] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    if (a.type === "default" && b.type !== "default") return -1;
    if (a.type !== "default" && b.type === "default") return 1;
    return a.name.localeCompare(b.name);
  });
};

export function useIPTVPlaylists() {
  // No auth status required
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
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
        setLoading(true);

        // Step 1: Load cached default playlists config from IndexedDB/localStorage if available
        let savedDefaultsConfig: { name: string; url: string }[] = [];
        try {
          const cachedConfig = await getFromDB<{ name: string; url: string }[]>("iptv_default_playlists_config");
          if (cachedConfig && Array.isArray(cachedConfig)) {
            savedDefaultsConfig = cachedConfig;
          } else {
            const localConfigStr = localStorage.getItem("iptv_default_playlists_config");
            if (localConfigStr) {
              savedDefaultsConfig = JSON.parse(localConfigStr);
            }
          }
        } catch (e) {
          console.warn("Failed to load cached default playlists config:", e);
        }

        // Map initial cached defaults
        const initialDefaultPlaylists: Playlist[] = savedDefaultsConfig.map((item) => ({
          id: getPlaylistId(item.name, item.url),
          name: item.name,
          type: "default" as const,
          url: item.url,
          channels: []
        }));

        // Load custom playlists
        let savedPlaylists = await getFromDB<Playlist[]>("iptv_saved_playlists");
        if (!savedPlaylists) {
          const localStr = localStorage.getItem("iptv_saved_playlists");
          if (localStr) {
            savedPlaylists = JSON.parse(localStr) as Playlist[];
            await saveToDB("iptv_saved_playlists", savedPlaylists);
          }
        }

        const savedActiveId = localStorage.getItem("iptv_active_playlist_id");
        const customPlaylists = (savedPlaylists && Array.isArray(savedPlaylists))
          ? savedPlaylists.filter(p => p.type !== "default")
          : [];

        // Set initial combined list so it renders instantly
        const initialCombined = [...initialDefaultPlaylists, ...customPlaylists];
        setPlaylists(initialCombined);

        const sortedInit = sortPlaylists(initialCombined);
        if (savedActiveId && initialCombined.find(p => p.id === savedActiveId)) {
          setActivePlaylistId(savedActiveId);
        } else if (sortedInit.length > 0) {
          setActivePlaylistId(sortedInit[0].id);
        } else {
          setPlaylistTab("manage");
        }

        // Step 2: Fetch default playlists config dynamically from the new API route
        
        let fetchedDefaultsConfig = [];
        let success = false;
        let retries = 3;
        let delay = 2000;

        while (!success && retries > 0) {
          try {
            const response = await fetch('/api/iptv/playlists/available', { cache: 'no-store' });
            if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data) && data.length > 0) {
                fetchedDefaultsConfig = data;
                success = true;
                // Store configuration cache for subsequent mount speedups
                await saveToDB("iptv_default_playlists_config", fetchedDefaultsConfig);
                localStorage.setItem("iptv_default_playlists_config", JSON.stringify(fetchedDefaultsConfig));
              } else {
                throw new Error("Empty playlist configuration returned");
              }
            } else {
              throw new Error(`Failed status: ${response.status}`);
            }
          } catch (fetchErr) {
            console.warn(`Failed to fetch available playlists dynamically (retries left: ${retries - 1}):`, fetchErr);
            retries--;
            if (retries > 0) {
              await new Promise(r => setTimeout(r, delay));
              delay *= 2;
            }
          }
        }

        if (!success) {
          fetchedDefaultsConfig = savedDefaultsConfig;
        }

        const defaultPlaylists: Playlist[] = (fetchedDefaultsConfig as { name: string; url: string }[]).map((item) => ({
          id: getPlaylistId(item.name, item.url),
          name: item.name,
          type: "default" as const,
          url: item.url,
          channels: []
        }));

        setPlaylists(prev => {
          const currentCustoms = prev.filter(p => p.type !== "default");
          return sortPlaylists([...defaultPlaylists, ...currentCustoms]);
        });
      } catch (e) {
        console.error("Failed to load playlists during hydration:", e);
        setPlaylistTab("manage");
      } finally {
        setLoading(false);
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

  // Preload channels for all default playlists using IndexedDB cache + server hash validation
  useEffect(() => {
    if (!isHydrated || playlists.length === 0) return;

    const defaultPlaylistsToLoad = playlists.filter(
      p => p.type === "default" && (!p.channels || p.channels.length === 0)
    );

    if (defaultPlaylistsToLoad.length === 0) {
      return;
    }

    const loadAllDefaultChannels = async () => {
      // If the active playlist is empty and needs to load, show loader
      const activePlaylist = playlists.find(p => p.id === activePlaylistId);
      if (
        activePlaylist &&
        activePlaylist.type === "default" &&
        (!activePlaylist.channels || activePlaylist.channels.length === 0)
      ) {
        setLoading(true);
      }

      try {
        await Promise.all(
          defaultPlaylistsToLoad.map(async (pl) => {
            const playlistId = pl.id;

            // Step 1: Check IndexedDB cache
            const cached = await getCachedChannels(playlistId);
            if (cached && cached.channels.length > 0) {
              setPlaylists(prev =>
                prev.map(p =>
                  p.id === playlistId ? { ...p, channels: cached.channels } : p
                )
              );

              // Hide loader immediately if the active playlist content has been restored from cache
              if (playlistId === activePlaylistId) {
                setLoading(false);
              }

              // Step 2: Fetch hash from server in background to verify freshness
              try {
                const hashResponse = await fetch(`/api/iptv/channels/hash?type=${playlistId}`, {
                  cache: "no-store",
                });
                if (hashResponse.ok) {
                  const { hash: serverHash } = await hashResponse.json();
                  if (serverHash === cached.hash) {
                    return; // Cache is fresh!
                  }
                  // Hash mismatch — clear stale cache and fall through to reload from server
                  await clearCachedChannels(playlistId);
                }
              } catch (hashErr) {
                console.warn(`Failed to verify hash for playlist ${playlistId}:`, hashErr);
                return; // Server hash check failed, keep cache content
              }
            }

            // Step 3: Fetch full data from server API
            const response = await fetch(`/api/iptv/channels?type=${playlistId}`, {
              cache: "no-store",
            });
            if (!response.ok) {
              throw new Error(`Failed to load channels for ${pl.name} (Status ${response.status})`);
            }
            const data = await response.json();
            const serverHash = response.headers.get("X-Channels-Hash") || "";

            setPlaylists(prev =>
              prev.map(p =>
                p.id === playlistId ? { ...p, channels: data } : p
              )
            );

            // Store in IndexedDB cache
            if (serverHash) {
              await setCachedChannels(playlistId, data, serverHash);
            }
          })
        );
      } catch (err) {
        console.error("Error preloading default playlists:", err);
        const activePlaylistAfter = playlists.find(p => p.id === activePlaylistId);
        if (
          activePlaylistAfter &&
          activePlaylistAfter.type === "default" &&
          (!activePlaylistAfter.channels || activePlaylistAfter.channels.length === 0)
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load channel list. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadAllDefaultChannels();
  }, [activePlaylistId, playlists, isHydrated]);

  // Periodic background check — every 15 minutes, verify all default playlists and refresh if stale
  useEffect(() => {
    if (!isHydrated) return;
    const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

    const checkAndRefresh = async () => {
      const defaultPlaylists = playlists.filter(p => p.type === "default" && p.channels && p.channels.length > 0);
      for (const pl of defaultPlaylists) {
        try {
          await clearCachedChannels(pl.id);
          const hashResponse = await fetch(`/api/iptv/channels/hash?type=${pl.id}&forceRefresh=true`, {
            cache: "no-store",
          });
          if (!hashResponse.ok) continue;
          const { hash: serverHash } = await hashResponse.json();

          const cached = await getCachedChannels(pl.id);
          if (cached && cached.hash === serverHash) continue;

          // Hash mismatch or cache cleared — fetch fresh data
          const response = await fetch(`/api/iptv/channels?type=${pl.id}`, {
            cache: "no-store",
          });
          if (response.ok) {
            const data = await response.json();
            const newHash = response.headers.get("X-Channels-Hash") || "";
            setPlaylists(prev =>
              prev.map(p =>
                p.id === pl.id ? { ...p, channels: data } : p
              )
            );
            if (newHash) {
              await setCachedChannels(pl.id, data, newHash);
            }
          }
        } catch (e) {
          console.warn(`Periodic refresh failed for ${pl.id}:`, e);
        }
      }
    };

    const intervalId = setInterval(checkAndRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [playlists, isHydrated]);

  // Save custom playlists to IndexedDB whenever they change
  useEffect(() => {
    if (!isHydrated) return; // Don't save empty state during hydration
    const customPlaylists = playlists.filter(
      p => p.type !== "default" && !p.id.startsWith("db-playlist-")
    );
    saveToDB("iptv_saved_playlists", customPlaylists).catch(e =>
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

      // Clear IndexedDB cached channels for default playlists config
      try {
        const cachedConfig = await getFromDB<{ name: string; url: string }[]>("iptv_default_playlists_config");
        if (cachedConfig && Array.isArray(cachedConfig)) {
          for (const item of cachedConfig) {
            const playlistId = getPlaylistId(item.name, item.url);
            await clearCachedChannels(playlistId);
            // Bust server cache
            fetch(`/api/iptv/channels/hash?type=${playlistId}&forceRefresh=true`, { cache: "no-store" }).catch(console.warn);
          }
        }
      } catch (e) {
        console.warn("Failed to clear IndexedDB cached channels:", e);
      }

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
        (p.type === "url" || p.type === "default" || p.id.startsWith("db-playlist-")) ? { ...p, channels: [] } : p
      ));
    }
    console.log("[useIPTVPlaylists] refreshAllPlaylists triggered. isManual:", isManual);

    // 1. Refresh available default playlists config
    let fetchedDefaultsConfig: { name: string; url: string }[] = [];
    try {
      const response = await fetch('/api/iptv/playlists/available', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          fetchedDefaultsConfig = data;
          await saveToDB("iptv_default_playlists_config", fetchedDefaultsConfig);
          localStorage.setItem("iptv_default_playlists_config", JSON.stringify(fetchedDefaultsConfig));
        }
      }
    } catch (e) {
      console.warn("Failed to refresh default playlists config:", e);
    }

    if (fetchedDefaultsConfig.length === 0) {
      try {
        const cachedConfig = await getFromDB<{ name: string; url: string }[]>("iptv_default_playlists_config");
        if (cachedConfig && Array.isArray(cachedConfig)) {
          fetchedDefaultsConfig = cachedConfig;
        }
      } catch (e) {
        console.warn("Failed to load cached config during refresh:", e);
      }
    }

    const defaultPlaylists: Playlist[] = fetchedDefaultsConfig.map((item) => ({
      id: getPlaylistId(item.name, item.url),
      name: item.name,
      type: "default" as const,
      url: item.url,
      channels: []
    }));

    // 2. Refresh Local URL Playlists
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

    // 3. Update state with refreshed local playlists and preserved default playlists
    setPlaylists(prev => {
      const merged = updatedLocalPlaylists;
      const currentCustoms = merged.filter(p => p.type !== "default");

      // Merge defaults: if we already have channels for a default playlist in state, preserve them!
      // However, if it's a manual update, we force-clear them to trigger reload.
      const mergedDefaults = defaultPlaylists.map(def => {
        if (isManual) {
          return { ...def, channels: [] };
        }
        const existing = prev.find(p => p.id === def.id);
        return existing ? { ...def, channels: existing.channels } : def;
      });

      const sortedCombined = sortPlaylists([...mergedDefaults, ...currentCustoms]);

      setActivePlaylistId(currentId => {
        if (currentId && sortedCombined.find(p => p.id === currentId)) {
          return currentId;
        }
        return sortedCombined.length > 0 ? sortedCombined[0].id : "";
      });
      return sortedCombined;
    });

    if (isManual) {
      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 2000);
    }
  }, []);

  // Load saved playlists from database and sync with cache (every 10 minutes)
  useEffect(() => {
    if (!isHydrated) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAllPlaylists(false);

    // Set up interval to automatically refresh every 10 minutes (during active session)
    const intervalId = setInterval(() => {
      refreshAllPlaylists(false);
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isHydrated, refreshAllPlaylists]);

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

  const sortedPlaylists = useMemo(() => {
    return sortPlaylists(playlists);
  }, [playlists]);

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
    playlists: sortedPlaylists,
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
