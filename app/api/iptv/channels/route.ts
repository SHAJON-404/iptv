import { NextResponse } from "next/server";
import { getChannelsWithHash } from "./helper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const forceRefresh = searchParams.get("forceRefresh") === "true";

  if (!type) {
    return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
  }

  try {
    const { channels, hash } = await getChannelsWithHash(type, forceRefresh);
    return NextResponse.json(channels, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Channels-Hash": hash,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load channel list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
