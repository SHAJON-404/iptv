import { NextRequest, NextResponse } from "next/server";
import { fetch as undiciFetch, Agent } from "undici";
import dns from "dns";

function isPrivateOrLocalIp(ip: string): boolean {
  // IPv4 Loopback: 127.0.0.0/8
  if (/^127\./.test(ip)) return true;
  
  // RFC 1918 Private Ranges:
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;
  
  // Link-Local: 169.254.0.0/16
  if (/^169\.254\./.test(ip)) return true;
  
  // Local/unspecified: 0.0.0.0
  if (ip === "0.0.0.0") return true;

  // IPv6 loopback, unspecified, link-local, unique local
  const ipv6Lower = ip.toLowerCase();
  if (ipv6Lower === "::1" || ipv6Lower === "::") return true;
  if (ipv6Lower.startsWith("fe80:")) return true;
  if (/^[fF][cCdD]/.test(ipv6Lower)) return true;

  return false;
}

async function isValidTargetUrl(urlStr: string): Promise<boolean> {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname;
    const lowerHost = hostname.toLowerCase();
    
    // Block localhost names
    if (lowerHost === "localhost" || lowerHost === "loopback" || lowerHost === "localhost.localdomain") {
      return false;
    }
    
    // Block direct local IP hostnames
    if (isPrivateOrLocalIp(hostname)) {
      return false;
    }

    // Resolve DNS to verify resolved IP address
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (isPrivateOrLocalIp(addr.address)) {
          return false;
        }
      }
    } catch {
      // If resolution fails, prevent request to be safe
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

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

function getBaseUrl(targetUrl: string): string {
  try {
    const urlObj = new URL(targetUrl);
    const pathname = urlObj.pathname;
    const lastSlashIndex = pathname.lastIndexOf("/");
    const parentPath = lastSlashIndex !== -1 ? pathname.substring(0, lastSlashIndex + 1) : "/";
    return `${urlObj.origin}${parentPath}`;
  } catch {
    return targetUrl;
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

    let currentUrl = targetUrl;
    let response: Awaited<ReturnType<typeof undiciFetch>> | null = null;
    let redirectCount = 0;
    const MAX_REDIRECTS = 5;

    while (redirectCount < MAX_REDIRECTS) {
      if (!(await isValidTargetUrl(currentUrl))) {
        clearTimeout(timeout);
        return NextResponse.json({ error: "Invalid or restricted target URL" }, { status: 400 });
      }

      const tempResponse = await undiciFetch(currentUrl, {
        headers: upstreamHeaders,
        signal: controller.signal,
        redirect: "manual",
        dispatcher: sslAgent,
      });

      if (tempResponse.status >= 300 && tempResponse.status < 400) {
        const location = tempResponse.headers.get("location");
        if (!location) {
          response = tempResponse;
          break;
        }
        currentUrl = resolveUrl(location, currentUrl);
        redirectCount++;
        // Consume response body to release network resources
        await tempResponse.text().catch(() => {});
        continue;
      }

      response = tempResponse;
      break;
    }

    clearTimeout(timeout);

    if (redirectCount >= MAX_REDIRECTS) {
      return NextResponse.json({ error: "Too many redirects" }, { status: 508 });
    }

    if (!response) {
      return NextResponse.json({ error: "Failed to fetch from target URL" }, { status: 500 });
    }

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

    const isMPD =
      contentType.toLowerCase().includes("dash+xml") ||
      targetUrl.toLowerCase().split(/[?#]/)[0].endsWith(".mpd");

    if (isM3U8) {
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const host = request.headers.get("host");

      let resolvedOrigin = origin;
      if (forwardedProto && forwardedHost) {
        resolvedOrigin = `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`;
      } else if (host) {
        const isHttps = request.url.startsWith("https://") || 
                        request.headers.get("x-forwarded-ssl") === "on";
        const proto = isHttps ? "https" : "http";
        resolvedOrigin = `${proto}://${host.split(",")[0].trim()}`;
      }

      const proxyBaseUrl = `${resolvedOrigin}/api/iptv/proxy`;

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
    } else if (isMPD) {
      const text = await response.text();
      const baseUri = getBaseUrl(targetUrl);

      // Find the first <Period tag or first <SegmentTemplate tag
      const periodIndex = text.search(/<(Period|SegmentTemplate)/i);

      let header = text;
      let body = "";
      if (periodIndex !== -1) {
        header = text.substring(0, periodIndex);
        body = text.substring(periodIndex);
      }

      const hasBaseUrl = /<BaseURL/i.test(header);

      if (hasBaseUrl) {
        // Rewrite all BaseURL elements in the header to be absolute
        header = header.replace(/<BaseURL([^>]*)>([\s\S]*?)<\/BaseURL>/gi, (match, attrs, content) => {
          const trimmed = content.trim();
          if (/^https?:\/\//i.test(trimmed)) {
            return match;
          }
          const resolved = resolveUrl(trimmed, targetUrl);
          return `<BaseURL${attrs}>${resolved}</BaseURL>`;
        });
      } else {
        // Insert BaseURL after <MPD> tag
        const mpdMatch = header.match(/(<MPD[^>]*>)/i);
        if (mpdMatch) {
          header = header.replace(/(<MPD[^>]*>)/i, `$1\n  <BaseURL>${baseUri}</BaseURL>`);
        }
      }

      const rewrittenText = header + body;

      return new Response(rewrittenText, {
        status: 200,
        headers: {
          "Content-Type": contentType || "application/dash+xml",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
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
      const contentEncoding = response.headers.get("content-encoding");
      const isCompressed = contentEncoding && contentEncoding !== "identity";

      const contentLength = response.headers.get("content-length");
      if (contentLength && !isCompressed) {
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
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch from target URL";
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : undefined;
    return NextResponse.json(
      { error: errorMessage, cause: errorCause },
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
