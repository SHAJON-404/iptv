import { NextResponse } from "next/server";

// Structure to hold active sessions in server memory
interface ViewerSession {
  lastHeartbeat: number;
}

// In-memory sessions map (persists as long as the Node server is running)
const activeSessions = new Map<string, ViewerSession>();

const HEARTBEAT_TIMEOUT = 30 * 1000; // 30 seconds

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      activeSessions.delete(sessionId);
    }
  }
}

export async function GET() {
  cleanExpiredSessions();
  const count = activeSessions.size;

  return NextResponse.json(
    { count },
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
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Register or update heartbeat timestamp
    activeSessions.set(sessionId, {
      lastHeartbeat: Date.now(),
    });

    cleanExpiredSessions();
    const count = activeSessions.size;

    return NextResponse.json(
      { success: true, count },
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
