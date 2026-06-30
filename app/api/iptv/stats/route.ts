import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";
import { parseM3U, parseJSON, Channel } from "@/app/lib/playlistParser";

interface ViewerSession {
  lastHeartbeat: number;
  channelName?: string;
  playlistUrls?: string[];
}

interface ChannelInfo {
  name: string;
  logo: string;
  url: string;
  group: string;
}

interface PlaylistCacheEntry {
  channels: ChannelInfo[];
  lastFetched: number;
}

// In-memory sessions map
const activeSessions = new Map<string, ViewerSession>();
const HEARTBEAT_TIMEOUT = 45 * 1000; // 45 seconds

// Playlist cache mapping: URL -> cache entry
const playlistCache = new Map<string, PlaylistCacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      activeSessions.delete(sessionId);
    }
  }
}

async function fetchPlaylistChannels(url: string): Promise<ChannelInfo[]> {
  const now = Date.now();
  const cached = playlistCache.get(url);
  if (cached && now - cached.lastFetched < CACHE_DURATION) {
    return cached.channels;
  }

  const channels: ChannelInfo[] = [];
  try {
    const response = await fetch(url, {
      cache: "no-store", // Disable next.js fetch cache to bypass 2MB cache limit warnings
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();
      let parsedRaw: Channel[] = [];
      
      if (trimmed.startsWith("#EXTM3U")) {
        parsedRaw = parseM3U(text);
      } else {
        try {
          parsedRaw = parseJSON(text);
        } catch (e) {
          console.warn(`JSON parse failed for playlist ${url}, trying M3U fallback:`, e);
          parsedRaw = parseM3U(text);
        }
      }

      for (const ch of parsedRaw) {
        if (ch && ch.name) {
          channels.push({
            name: ch.name.trim(),
            logo: ch.logo || "",
            url: ch.url || "",
            group: ch.group || "Uncategorized",
          });
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch/parse playlist from URL ${url}:`, e);
  }

  // Cache result (even if empty) to prevent hammering
  playlistCache.set(url, {
    channels,
    lastFetched: now,
  });
  return channels;
}

async function getStatsData(userId?: string) {
  // If no active session is watching a channel, return early with count to avoid unnecessary playlist fetches
  const hasActiveViewers = Array.from(activeSessions.values()).some((s) => !!s.channelName);
  if (!hasActiveViewers) {
    return {
      count: activeSessions.size,
      topChannels: [],
    };
  }

  const domain = process.env.PLAYLIST_DOMAIN || "iamshajon.com";
  const urlsToFetch: string[] = [];

  // 1. If logged in, fetch saved playlists of this specific user from the database
  if (userId) {
    try {
      const dbPlaylists = await prisma.savedPlaylist.findMany({
        where: { userId },
        select: { url: true },
      });
      dbPlaylists.forEach((p) => {
        const u = p.url.trim();
        try {
          const parsed = new URL(u);
          if (parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)) {
            urlsToFetch.push(u);
          }
        } catch {}
      });
    } catch (e) {
      console.error("DB query failed in stats API:", e);
    }
  }

  // 2. Add client-sent playlist URLs from active sessions
  for (const session of activeSessions.values()) {
    if (session.playlistUrls) {
      session.playlistUrls.forEach((u) => {
        if (!urlsToFetch.includes(u)) {
          urlsToFetch.push(u);
        }
      });
    }
  }



  // 4. Fetch and combine channels from all active playlists
  const channelsMap = new Map<string, ChannelInfo>();
  for (const url of urlsToFetch) {
    const playlistChannels = await fetchPlaylistChannels(url);
    for (const ch of playlistChannels) {
      const nameLower = ch.name.toLowerCase().trim();
      if (!channelsMap.has(nameLower)) {
        channelsMap.set(nameLower, ch);
      }
    }
  }

  // 5. Count active viewers per channel
  const channelCounts = new Map<string, number>();
  for (const session of activeSessions.values()) {
    if (session.channelName) {
      const nameLower = session.channelName.toLowerCase().trim();
      if (channelsMap.has(nameLower)) {
        channelCounts.set(nameLower, (channelCounts.get(nameLower) || 0) + 1);
      }
    }
  }

  // 6. Sort and extract top 5
  const sorted = [...channelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topChannels = sorted.map(([nameLower, viewers]) => {
    const info = channelsMap.get(nameLower)!;
    return {
      name: info.name,
      logo: info.logo,
      url: info.url,
      group: info.group,
      viewers,
    };
  });

  return {
    count: activeSessions.size,
    topChannels,
  };
}

export async function GET() {
  cleanExpiredSessions();
  
  let userId: string | undefined;
  try {
    const user = await getCurrentUser();
    userId = user?.id;
  } catch {}

  const data = await getStatsData(userId);

  return NextResponse.json(
    data,
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, channelName, playlistUrls } = body;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 50) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Safeguard to prevent memory exhaustion by limiting map size to 10,000 active sessions
    if (activeSessions.size > 10000) {
      cleanExpiredSessions();
      if (activeSessions.size > 10000 && !activeSessions.has(sessionId)) {
        return NextResponse.json(
          { error: "Viewer session limit reached" },
          { status: 503 }
        );
      }
    }

    // Register or update heartbeat timestamp
    activeSessions.set(sessionId, {
      lastHeartbeat: Date.now(),
      channelName: typeof channelName === "string" ? channelName.trim() : undefined,
      playlistUrls: Array.isArray(playlistUrls) ? playlistUrls : undefined,
    });

    cleanExpiredSessions();

    let userId: string | undefined;
    try {
      const user = await getCurrentUser();
      userId = user?.id;
    } catch {}

    const data = await getStatsData(userId);

    return NextResponse.json(
      { success: true, ...data },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
