import { NextResponse } from "next/server";
import { getChannelsWithHash } from "../helper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const forceRefresh = searchParams.get("forceRefresh") === "true";

  if (!type) {
    return NextResponse.json({ error: "Missing type parameter" }, { status: 400 });
  }

  try {
    const { hash } = await getChannelsWithHash(type, forceRefresh);
    return NextResponse.json(
      { hash },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch hash";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
