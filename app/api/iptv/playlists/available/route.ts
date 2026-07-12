import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const domain = process.env.PLAYLIST_DOMAIN || "iamshajon.com";
    const availablePlaylistUrl = `https://${domain}/available_playlist.json`;
    
    const response = await fetch(availablePlaylistUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch available playlists (Status ${response.status})`);
    }
    
    const data = await response.json();
    
    // Filter out playlists that do not end with .json
    const filteredPlaylists = (data as { name: string; url: string }[]).filter(
      item => item.url && item.url.endsWith(".json")
    );

    return NextResponse.json(filteredPlaylists, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("API Error in available playlists:", err);
    const message = err instanceof Error ? err.message : "Failed to load available playlists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
