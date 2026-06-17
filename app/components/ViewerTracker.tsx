"use client";

import { useEffect } from "react";

export default function ViewerTracker() {
  useEffect(() => {
    // Generate or retrieve a persistent UUID for this browser
    const getOrCreateSessionId = (): string => {
      if (typeof window === "undefined") return "";
      
      let id = localStorage.getItem("iptv_unique_viewer_id");
      if (!id) {
        // Use crypto.randomUUID if available, fallback to Math.random
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
      // Don't send heartbeat if page is hidden (optional, but helps match GA's active tab logic)
      // For IPTV, users might listen in background, so we will send it regardless, 
      // but maybe track visibility state later if needed.
      try {
        const response = await fetch("/api/iptv/viewers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // We can dispatch a custom event to update the UI globally
          if (typeof data.count === "number") {
            window.dispatchEvent(new CustomEvent("iptv-viewer-count", { detail: { count: data.count } }));
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
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null; // This is a logic-only component
}
