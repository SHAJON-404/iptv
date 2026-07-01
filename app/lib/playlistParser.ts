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

export const parseM3U = (text: string): Channel[] => {
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

// Known custom header keys that some streams require for playback.
// These are extracted from the raw JSON and forwarded to the proxy.
const CUSTOM_HEADER_KEYS = ["user-agent", "origin", "x-playback-session-id"];

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
  useProxy?: boolean;
  referer?: string;
  // Custom header fields
  "user-agent"?: string;
  "origin"?: string;
  "x-playback-session-id"?: string;
  [key: string]: unknown;
}

export const parseJSON = (text: string): Channel[] => {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.channels || data.items || [];
  if (!Array.isArray(list)) {
    throw new Error("Invalid playlist JSON format. Expected an array of channels.");
  }
  return list.map((ch: RawChannelInput, idx: number) => {
    const url = ch.url || ch.streamUrl || ch.link;
    if (!url) throw new Error(`Channel at index ${idx} is missing a streaming URL ('url')`);

    // Extract known custom headers from the raw JSON
    const customHeaders: Record<string, string> = {};
    for (const key of CUSTOM_HEADER_KEYS) {
      const value = ch[key];
      if (typeof value === "string" && value.trim()) {
        customHeaders[key] = value.trim();
      }
    }

    return {
      id: ch.id || `custom-json-${idx}-${Date.now()}`,
      name: ch.name || ch.title || `Channel ${idx + 1}`,
      logo: ch.logo || ch.logoUrl || ch.image || "",
      group: ch.group || ch.category || "Custom",
      url: url,
      ...(ch.type && { type: ch.type }),
      ...(ch.kid && { kid: ch.kid }),
      ...(ch.key && { key: ch.key }),
      ...(ch.useProxy !== undefined && { useProxy: ch.useProxy }),
      ...(ch.referer && { referer: ch.referer }),
      ...(Object.keys(customHeaders).length > 0 && { customHeaders }),
    };
  });
};
