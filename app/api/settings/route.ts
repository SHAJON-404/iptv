import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET handler to fetch configuration settings.
 * Currently returns values from environment variables (e.g., VLC_LIVE_URL) 
 * without requiring any central database connection.
 *
 * @param {Request} request - The incoming Next.js API Request object
 * @returns {Promise<NextResponse>} JSON response containing settings value and role check
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key === "vlcLiveUrl") {
    return NextResponse.json({ value: process.env.VLC_LIVE_URL || null, isAdmin: false });
  }

  return NextResponse.json({ isAdmin: false });
}
