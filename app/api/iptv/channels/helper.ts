import crypto from "crypto";
import { parseM3U, parseJSON } from "@/app/lib/playlistParser";
import { Channel } from "@/app/hooks/useIPTVPlaylists";

interface PlaylistCache {
  channels: Channel[];
  hash: string;
  lastLoadedTime: number;
}

// In-memory cache for dynamic playlists on the server
const serverCache: Record<string, PlaylistCache> = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache on server

const getPlaylistId = (name: string, url: string): string => {
  const filename = url.split('/').pop()?.replace('.json', '');
  if (filename) return filename;
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-");
};

export async function getChannelsWithHash(playlistId: string, forceRefresh: boolean = false): Promise<PlaylistCache> {
  const now = Date.now();
  const cached = serverCache[playlistId];

  // Return cached version if fresh
  if (!forceRefresh && cached && now - cached.lastLoadedTime < CACHE_EXPIRY_MS && cached.channels.length > 0) {
    return cached;
  }

  try {
    // 1. Fetch available playlists config
    const domain = process.env.PLAYLIST_DOMAIN || "iamshajon.com";
    const availablePlaylistUrl = `https://${domain}/available_playlist.json`;
    const availRes = await fetch(availablePlaylistUrl, { cache: "no-store" });
    if (!availRes.ok) {
      throw new Error(`Failed to fetch available playlists (Status ${availRes.status})`);
    }
    const playlistsConfig = await availRes.json();

    // 2. Find matching playlist by generated ID
    const matchedConfig = (playlistsConfig as { name: string; url: string }[]).find(
      item => item.url && item.url.endsWith(".json") && getPlaylistId(item.name, item.url) === playlistId
    );

    if (!matchedConfig) {
      throw new Error(`Playlist with ID '${playlistId}' not found in available playlists.`);
    }

    // 3. Fetch playlist content
    const playlistRes = await fetch(matchedConfig.url, { cache: "no-store" });
    if (!playlistRes.ok) {
      throw new Error(`Failed to fetch playlist contents from ${matchedConfig.url} (Status ${playlistRes.status})`);
    }

    const text = await playlistRes.text();
    const hash = crypto.createHash("sha256").update(text).digest("hex");

    // 4. Parse content
    let channels: Channel[] = [];
    const trimmed = text.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      channels = parseJSON(text);
    } else {
      channels = parseM3U(text);
    }

    if (channels.length === 0) {
      throw new Error(`No channels could be parsed from ${matchedConfig.url}`);
    }

    // Assign IDs consistent with previous version format if not present
    const formattedChannels = channels.map((ch, idx) => ({
      ...ch,
      id: ch.id || `ch-${playlistId}-${idx}`
    }));

    // 5. Store in server cache
    serverCache[playlistId] = {
      channels: formattedChannels,
      hash,
      lastLoadedTime: now,
    };

    return serverCache[playlistId];
  } catch (error) {
    console.error(`API Error: Loading channels for playlist ${playlistId} failed:`, error);
    // If dynamic load fails, fall back to cached version if we have one
    if (cached) {
      return cached;
    }
    throw error;
  }
}
