import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlists = await prisma.savedPlaylist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ playlists });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Check count limit (max 10)
    const count = await prisma.savedPlaylist.count({
      where: { userId: user.id },
    });

    if (count >= 10) {
      return NextResponse.json(
        { error: "Maximum limit of 10 playlists reached" },
        { status: 400 }
      );
    }

    // Create playlist URL in database
    const playlist = await prisma.savedPlaylist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        url: url.trim(),
      },
    });

    return NextResponse.json({ playlist });
  } catch (err: unknown) {
    // Handle unique constraint if they add the same URL twice
    const error = err as { code?: string };
    if (error && error.code === "P2002") {
      return NextResponse.json(
        { error: "This playlist URL is already saved" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, url } = body;

    if (!id) {
      return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 });
    }

    // Validate ownership
    const existing = await prisma.savedPlaylist.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (url !== undefined) {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      updateData.url = url.trim();
    }

    const playlist = await prisma.savedPlaylist.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ playlist });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 });
  }

  // Validate ownership
  const existing = await prisma.savedPlaylist.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  await prisma.savedPlaylist.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
