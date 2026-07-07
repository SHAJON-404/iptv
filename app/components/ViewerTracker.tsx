"use client";

import { useEffect, useRef } from "react";
import { Channel } from "../hooks/useIPTVPlaylists";

export default function ViewerTracker() {
  const currentChannelRef = useRef<Channel | null>(null);

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

    const sendHeartbeat = async () => {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
        const statsUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/api/iptv/stats` : "/api/iptv/stats";

        const playingNow = currentChannelRef.current ? {
          ...currentChannelRef.current,
          logo: currentChannelRef.current.logo || "",
          group: currentChannelRef.current.group || "",
          useProxy: !!currentChannelRef.current.useProxy,
          referer: currentChannelRef.current.referer || currentChannelRef.current.customHeaders?.Referer || currentChannelRef.current.customHeaders?.referer || "",
          origin: currentChannelRef.current.customHeaders?.Origin || currentChannelRef.current.customHeaders?.origin || "",
          "user-agent": currentChannelRef.current.customHeaders?.["user-agent"] || currentChannelRef.current.customHeaders?.["User-Agent"] || "",
        } : undefined;

        const response = await fetch(statsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            sessionId,
            playingNow
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
      currentChannelRef.current = customEvent.detail?.channel || null;
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
