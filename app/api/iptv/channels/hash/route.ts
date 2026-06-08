import { NextResponse } from "next/server";
import { getChannelsWithHash } from "../route";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "universal";

  const { hash } = getChannelsWithHash(type);

  return NextResponse.json(
    { hash },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
