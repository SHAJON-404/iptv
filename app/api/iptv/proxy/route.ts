import { NextRequest, NextResponse } from "next/server";
import { fetch as undiciFetch, Agent } from "undici";

// Create a custom Undici Agent to handle legacy IPTV servers
// that use older TLS versions or legacy cipher suites.
const sslAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
    ciphers: "DEFAULT:@SECLEVEL=0",
    minVersion: "TLSv1",
  },
});

function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  try {
    // Build upstream headers — forward relevant client headers for compatibility
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Connection": "keep-alive",
    };

    // Forward Range header from client (HLS.js sends Range: bytes=0-)
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    // Set Referer to the stream's origin for servers that check it
    try {
      const parsedTarget = new URL(targetUrl);
      upstreamHeaders["Referer"] = parsedTarget.origin + "/";
      upstreamHeaders["Origin"] = parsedTarget.origin;
    } catch {
      // Invalid URL, skip Referer
    }

    // Fetch with a timeout to avoid hanging on unresponsive servers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await undiciFetch(targetUrl, {
      headers: upstreamHeaders,
      signal: controller.signal,
      redirect: "follow",
      dispatcher: sslAgent,
    });
    clearTimeout(timeout);

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Failed to fetch from target URL (Status ${response.status})` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    
    // Determine if it is an M3U8/M3U playlist
    const isM3U8 =
      contentType.toLowerCase().includes("mpegurl") ||
      contentType.toLowerCase().includes("mpeg-url") ||
      targetUrl.toLowerCase().split(/[?#]/)[0].endsWith(".m3u8") ||
      targetUrl.toLowerCase().split(/[?#]/)[0].endsWith(".m3u");

    if (isM3U8) {
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      const proxyBaseUrl = `${origin}/api/iptv/proxy`;

      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith("#")) {
          // Rewrite any URI attributes within tags, e.g., URI="..." or URI='...' or URI=...
          return line.replace(
            /URI=(?:"([^"]+)"|'([^']+)'|([^,\s]+))/g,
            (match, qDouble, qSingle, unquoted) => {
              const uri = qDouble || qSingle || unquoted;
              if (!uri) return match;
              const resolved = resolveUrl(uri, targetUrl);
              return `URI="${proxyBaseUrl}?url=${encodeURIComponent(resolved)}"`;
            }
          );
        } else {
          // Rewrite the direct stream/segment URL line
          const resolved = resolveUrl(trimmed, targetUrl);
          return `${proxyBaseUrl}?url=${encodeURIComponent(resolved)}`;
        }
      });

      return new Response(rewrittenLines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": contentType || "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Range",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } else {
      // It's a segment (like .ts, .m4s, .mp4, etc.) or key file. Stream the response directly.
      const headers: Record<string, string> = {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      };

      // Forward critical response headers from upstream
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        headers["Content-Length"] = contentLength;
      }

      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        headers["Content-Range"] = contentRange;
      }

      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) {
        headers["Accept-Ranges"] = acceptRanges;
      }
      
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        headers["Cache-Control"] = cacheControl;
      } else {
        headers["Cache-Control"] = "public, max-age=3600";
      }

      return new Response(response.body as unknown as ReadableStream, {
        status: response.status, // Preserves 206 Partial Content for Range requests
        headers,
      });
    }
  } catch (error) {
    // Handle abort/timeout specifically
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream server timed out (15s)" },
        { status: 504 }
      );
    }
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch from target URL" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight for HLS.js Range requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      "Access-Control-Max-Age": "86400",
    },
  });
}
