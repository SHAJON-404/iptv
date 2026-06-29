"use client";

import { useEffect, useRef } from "react";
import { Playlist } from "../hooks/useIPTVPlaylists";

// IndexedDB Helper Functions
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }
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

async function getFromDB<T>(key: string): Promise<T | null> {
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
}

export default function ViewerTracker() {
  const currentChannelRef = useRef<string>("");

  useEffect(() => {
    // Generate or retrieve a persistent UUID for this browser
    const getOrCreateSessionId = (): string => {
      if (typeof window === "undefined") return "";
      
      let id = localStorage.getItem("iptv_unique_viewer_id");
      if (!id) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
        localStorage.setItem("iptv_unique_viewer_id", id);
      }
      return id;
    };

    const sessionId = getOrCreateSessionId();

    const getPlaylistUrls = async (): Promise<string[]> => {
      const domain = "iamshajon.com";
      const urls: string[] = [];

      const matchesDomain = (u?: string) => {
        if (!u) return false;
        try {
          const parsed = new URL(u);
          return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
        } catch {
          return false;
        }
      };

      try {
        const localSaved = await getFromDB<Playlist[]>("iptv_saved_playlists");
        if (localSaved && Array.isArray(localSaved)) {
          localSaved.forEach((p) => {
            if (p.type === "url" && p.url && matchesDomain(p.url)) {
              urls.push(p.url.trim());
            }
          });
        }
      } catch (e) {
        console.warn("Failed to read local saved playlists:", e);
      }

      try {
        const dbCached = await getFromDB<Playlist[]>("iptv_db_playlists_cache");
        if (dbCached && Array.isArray(dbCached)) {
          dbCached.forEach((p) => {
            if (p.url && matchesDomain(p.url)) {
              urls.push(p.url.trim());
            }
          });
        }
      } catch (e) {
        console.warn("Failed to read cached DB playlists:", e);
      }

      return Array.from(new Set(urls));
    };

    const sendHeartbeat = async () => {
      try {
        const localUrls = await getPlaylistUrls();

        const response = await fetch("/api/iptv/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            sessionId,
            channelName: currentChannelRef.current || undefined,
            playlistUrls: localUrls
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // We dispatch a custom event to update the UI globally
          if (typeof data.count === "number") {
            window.dispatchEvent(new CustomEvent("iptv-viewer-count", { 
              detail: { 
                count: data.count,
                topChannels: data.topChannels || []
              } 
            }));
          }
        }
      } catch (error) {
        console.warn("Failed to send heartbeat:", error);
      }
    };

    // Send immediately on mount
    sendHeartbeat();
    
    // Set up regular interval
    const interval = setInterval(sendHeartbeat, 15000); // Every 15 seconds
    
    // Also send on visibility change to ensure we catch returning users immediately
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    // Handle channel changes
    const handleChannelChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      currentChannelRef.current = customEvent.detail?.name || "";
      sendHeartbeat();
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("iptv-channel-changed", handleChannelChanged);
 
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("iptv-channel-changed", handleChannelChanged);
    };
  }, []);

  return null; // This is a logic-only component
}
