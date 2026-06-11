import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

interface PlaylistCache {
  channels: Channel[];
  hash: string;
  lastLoadedTime: number;
}

const cache: Record<string, PlaylistCache> = {
  sports: { channels: [], hash: "", lastLoadedTime: 0 },
  universal: { channels: [], hash: "", lastLoadedTime: 0 },
  bangla: { channels: [], hash: "", lastLoadedTime: 0 },
  fifa: { channels: [], hash: "", lastLoadedTime: 0 },
};

function getFilename(type: string): string {
  if (type === "sports") return "sports.json";
  if (type === "bangla") return "bangla.json";
  if (type === "fifa") return "fifa.json";
  return "channels.json";
}

export function getChannelsWithHash(rawType: string = "universal") {
  let type = rawType.toLowerCase();
  if (type === "default" || type === "channels") {
    type = "universal";
  }
  if (type !== "sports" && type !== "bangla" && type !== "fifa") {
    type = "universal";
  }

  const now = Date.now();
  const playlistCache = cache[type] || { channels: [], hash: "", lastLoadedTime: 0 };

  // Refresh cache every 60 seconds
  if (now - playlistCache.lastLoadedTime > 60_000 || playlistCache.channels.length === 0) {
    try {
      const filename = getFilename(type);
      const channelsPath = path.join(
        process.cwd(),
        "app/data",
        filename
      );

      if (fs.existsSync(channelsPath)) {
        const fileContent = fs.readFileSync(channelsPath, "utf8");

        // Compute SHA-256 hash of raw file content
        const hash = crypto
          .createHash("sha256")
          .update(fileContent)
          .digest("hex");

        const raw = JSON.parse(fileContent);

        // Add IDs if not present and deduplicate
        const channels = raw.map(
          (
            ch: { name: string; logo: string; group: string; url: string; type?: string; kid?: string; key?: string },
            idx: number
          ) => ({
            id: `ch-${type}-${idx}`,
            name: ch.name,
            logo: ch.logo || "",
            group: ch.group || "Uncategorized",
            url: ch.url,
            ...(ch.type && { type: ch.type }),
            ...(ch.kid && { kid: ch.kid }),
            ...(ch.key && { key: ch.key }),
          })
        );
        
        cache[type] = {
          channels,
          hash,
          lastLoadedTime: now,
        };
      }
    } catch (error) {
      console.error(`Error reading IPTV channels file for type ${type}:`, error);
    }
  }

  return cache[type] || { channels: [], hash: "" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "universal";

  const { channels, hash } = getChannelsWithHash(type);

  return NextResponse.json(channels, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Channels-Hash": hash,
    },
  });
}
