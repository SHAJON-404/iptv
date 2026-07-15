package com.shajon.iptv;

import android.util.Base64;
import android.util.Log;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Localhost {
    private static final String TAG = "IPTV_LocalhostServer";
    private static final int PORT = 3000;
    private static ServerSocket serverSocket;
    private static ExecutorService threadPool = Executors.newCachedThreadPool();
    private static boolean isRunning = false;
    private static final String DEFAULT_DOMAIN = "iamshajon.com";

    public static synchronized void startServer() {
        if (isRunning) return;
        isRunning = true;
        threadPool.execute(() -> {
            try {
                serverSocket = new ServerSocket(PORT);
                Log.i(TAG, "Local HTTP server started on port " + PORT);
                while (isRunning) {
                    Socket clientSocket = serverSocket.accept();
                    threadPool.execute(() -> handleClient(clientSocket));
                }
            } catch (IOException e) {
                Log.e(TAG, "Server socket error", e);
            }
        });
    }

    public static synchronized void stopServer() {
        isRunning = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing server socket", e);
            }
        }
    }

    private static void handleClient(Socket client) {
        try (
            InputStream in = client.getInputStream();
            OutputStream out = client.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))
        ) {
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            Log.d(TAG, "Request: " + requestLine);
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;

            String method = parts[0];
            String fullPath = parts[1];

            // Parse headers
            Map<String, String> requestHeaders = new HashMap<>();
            String headerLine;
            while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                int colonIndex = headerLine.indexOf(":");
                if (colonIndex != -1) {
                    requestHeaders.put(
                        headerLine.substring(0, colonIndex).trim().toLowerCase(),
                        headerLine.substring(colonIndex + 1).trim()
                    );
                }
            }

            if (method.equalsIgnoreCase("OPTIONS")) {
                sendOptionsResponse(out);
                return;
            }

            String path = fullPath;
            String query = null;
            int qIndex = fullPath.indexOf('?');
            if (qIndex != -1) {
                path = fullPath.substring(0, qIndex);
                query = fullPath.substring(qIndex + 1);
            }
            Map<String, String> queryParams = parseQuery(query);

            if (path.equals("/api/iptv/playlists/available")) {
                handleAvailablePlaylists(out);
            } else if (path.equals("/api/iptv/channels")) {
                handleChannels(queryParams.get("type"), out);
            } else if (path.equals("/api/iptv/channels/hash")) {
                handleChannelsHash(queryParams.get("type"), out);
            } else if (path.equals("/api/iptv/proxy")) {
                handleProxy(queryParams, requestHeaders, out);
            } else if (path.equals("/api/iptv/stats")) {
                sendResponse(out, 200, "application/json", "{\"status\":\"ok\",\"count\":1}");
            } else {
                sendResponse(out, 404, "text/plain", "Not Found");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error handling client connection", e);
        } finally {
            try {
                client.close();
            } catch (IOException ignored) {}
        }
    }

    private static void sendResponse(OutputStream out, int statusCode, String contentType, String body) throws IOException {
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 " + statusCode + " " + getStatusText(statusCode) + "\r\n" +
                        "Content-Type: " + contentType + "\r\n" +
                        "Content-Length: " + bodyBytes.length + "\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Connection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.write(bodyBytes);
        out.flush();
    }

    private static void sendOptionsResponse(OutputStream out) throws IOException {
        String header = "HTTP/1.1 204 No Content\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: GET, OPTIONS, POST\r\n" +
                        "Access-Control-Allow-Headers: Range, Content-Type\r\n" +
                        "Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n" +
                        "Access-Control-Max-Age: 86400\r\n" +
                        "Connection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    private static String getStatusText(int code) {
        switch (code) {
            case 200: return "OK";
            case 204: return "No Content";
            case 206: return "Partial Content";
            case 400: return "Bad Request";
            case 404: return "Not Found";
            default: return "Internal Server Error";
        }
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null || query.isEmpty()) return params;
        try {
            for (String param : query.split("&")) {
                String[] entry = param.split("=");
                if (entry.length > 1) {
                    params.put(URLDecoder.decode(entry[0], "UTF-8"), URLDecoder.decode(entry[1], "UTF-8"));
                } else if (entry.length > 0) {
                    params.put(URLDecoder.decode(entry[0], "UTF-8"), "");
                }
            }
        } catch (UnsupportedEncodingException ignored) {}
        return params;
    }

    private static void handleAvailablePlaylists(OutputStream out) throws IOException {
        try {
            String playlistsJson = fetchUrlText("https://" + DEFAULT_DOMAIN + "/available_playlist.json");
            sendResponse(out, 200, "application/json", playlistsJson);
        } catch (Exception e) {
            sendResponse(out, 500, "text/plain", "Error: " + e.getMessage());
        }
    }

    private static void handleChannels(String type, OutputStream out) throws IOException {
        if (type == null || type.isEmpty()) {
            sendResponse(out, 400, "text/plain", "Missing type");
            return;
        }
        try {
            String playlistsJson = fetchUrlText("https://" + DEFAULT_DOMAIN + "/available_playlist.json");
            String targetUrl = "";
            String escapedType = type.replace("-", "\\-");
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"url\"\\s*:\\s*\"([^\"]*?" + escapedType + "\\.json)\"");
            java.util.regex.Matcher matcher = pattern.matcher(playlistsJson);
            if (matcher.find()) {
                targetUrl = matcher.group(1);
            }
            if (targetUrl.isEmpty()) {
                targetUrl = "https://" + DEFAULT_DOMAIN + "/" + type + ".json";
            }
            String channelsJson = fetchUrlText(targetUrl);
            sendResponse(out, 200, "application/json", channelsJson);
        } catch (Exception e) {
            sendResponse(out, 500, "text/plain", "Error: " + e.getMessage());
        }
    }

    private static void handleChannelsHash(String type, OutputStream out) throws IOException {
        if (type == null || type.isEmpty()) {
            sendResponse(out, 400, "text/plain", "Missing type");
            return;
        }
        try {
            String targetUrl = "https://" + DEFAULT_DOMAIN + "/" + type + ".json";
            String content = fetchUrlText(targetUrl);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            String hash = sb.toString();

            String responseHeader = "HTTP/1.1 200 OK\r\n" +
                                    "Content-Type: application/json\r\n" +
                                    "Content-Length: 2\r\n" +
                                    "Access-Control-Allow-Origin: *\r\n" +
                                    "X-Channels-Hash: " + hash + "\r\n" +
                                    "Connection: close\r\n\r\n{}";
            out.write(responseHeader.getBytes(StandardCharsets.UTF_8));
            out.flush();
        } catch (Exception e) {
            sendResponse(out, 500, "text/plain", "Error: " + e.getMessage());
        }
    }

    private static void handleProxy(Map<String, String> queryParams, Map<String, String> requestHeaders, OutputStream out) throws IOException {
        String targetUrlStr = queryParams.get("url");
        if (targetUrlStr == null || targetUrlStr.isEmpty()) {
            sendResponse(out, 400, "text/plain", "Missing url parameter");
            return;
        }

        String customReferer = queryParams.get("referer");
        String customHeadersB64 = queryParams.get("headers");
        String customUA = queryParams.get("ua");

        try {
            URL targetUrl = new URL(targetUrlStr);
            HttpURLConnection conn = (HttpURLConnection) targetUrl.openConnection();
            conn.setRequestMethod("GET");
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);

            String rangeHeader = requestHeaders.get("range");
            if (rangeHeader != null) {
                conn.setRequestProperty("Range", rangeHeader);
            }

            if (customReferer != null && !customReferer.isEmpty()) {
                conn.setRequestProperty("Referer", customReferer);
            }
            if (customUA != null && !customUA.isEmpty()) {
                conn.setRequestProperty("User-Agent", customUA);
            } else if (requestHeaders.get("user-agent") != null) {
                conn.setRequestProperty("User-Agent", requestHeaders.get("user-agent"));
            }

            if (customHeadersB64 != null && !customHeadersB64.isEmpty()) {
                try {
                    byte[] decoded = android.util.Base64.decode(customHeadersB64, android.util.Base64.DEFAULT);
                    String json = new String(decoded, StandardCharsets.UTF_8);
                    json = json.trim().substring(1, json.length() - 1);
                    for (String entry : json.split(",")) {
                        String[] pair = entry.split(":");
                        if (pair.length == 2) {
                            String k = pair[0].trim().replace("\"", "");
                            String v = pair[1].trim().replace("\"", "");
                            conn.setRequestProperty(k, v);
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Failed to parse custom headers", e);
                }
            }

            int responseCode = conn.getResponseCode();

            if (responseCode == 301 || responseCode == 302 || responseCode == 303 || responseCode == 307 || responseCode == 308) {
                String newUrl = conn.getHeaderField("Location");
                queryParams.put("url", newUrl);
                handleProxy(queryParams, requestHeaders, out);
                return;
            }

            String contentType = conn.getContentType();
            if (contentType == null) contentType = "application/octet-stream";

            boolean isM3U8 = contentType.toLowerCase().contains("mpegurl") ||
                             contentType.toLowerCase().contains("mpeg-url") ||
                             targetUrlStr.toLowerCase().split("[?#]")[0].endsWith(".m3u8");

            if (isM3U8) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder manifestBuilder = new StringBuilder();
                String line;
                String requestHost = requestHeaders.get("host");
                if (requestHost == null || requestHost.isEmpty()) {
                    requestHost = "127.0.0.1:3000";
                }
                String proxyBaseUrl = "http://" + requestHost + "/api/iptv/proxy";
                String paramSuffix = "";
                if (customReferer != null) paramSuffix += "&referer=" + URLEncoder.encode(customReferer, "UTF-8");
                if (customHeadersB64 != null) paramSuffix += "&headers=" + URLEncoder.encode(customHeadersB64, "UTF-8");
                if (customUA != null) paramSuffix += "&ua=" + URLEncoder.encode(customUA, "UTF-8");

                while ((line = br.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) {
                        manifestBuilder.append(line).append("\n");
                        continue;
                    }
                    if (trimmed.startsWith("#")) {
                        String rewritten = rewriteTagUris(line, targetUrlStr, proxyBaseUrl, paramSuffix);
                        manifestBuilder.append(rewritten).append("\n");
                    } else {
                        String resolvedSegment = resolveRelativeUrl(trimmed, targetUrlStr);
                        manifestBuilder.append(proxyBaseUrl).append("?url=").append(URLEncoder.encode(resolvedSegment, "UTF-8")).append(paramSuffix).append("\n");
                    }
                }
                br.close();

                byte[] rewrittenBytes = manifestBuilder.toString().getBytes(StandardCharsets.UTF_8);
                String responseHeader = "HTTP/1.1 200 OK\r\n" +
                                        "Content-Type: " + contentType + "\r\n" +
                                        "Content-Length: " + rewrittenBytes.length + "\r\n" +
                                        "Access-Control-Allow-Origin: *\r\n" +
                                        "Access-Control-Allow-Headers: Range\r\n" +
                                        "Access-Control-Expose-Headers: Content-Range, Content-Length\r\n" +
                                        "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
                                        "Connection: close\r\n\r\n";
                out.write(responseHeader.getBytes(StandardCharsets.UTF_8));
                out.write(rewrittenBytes);
                out.flush();
            } else {
                String responseHeader = "HTTP/1.1 " + responseCode + " " + getStatusText(responseCode) + "\r\n" +
                                        "Content-Type: " + contentType + "\r\n" +
                                        "Access-Control-Allow-Origin: *\r\n" +
                                        "Access-Control-Allow-Headers: Range\r\n" +
                                        "Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n";

                String contentLength = conn.getHeaderField("Content-Length");
                if (contentLength != null) {
                    responseHeader += "Content-Length: " + contentLength + "\r\n";
                }
                String contentRange = conn.getHeaderField("Content-Range");
                if (contentRange != null) {
                    responseHeader += "Content-Range: " + contentRange + "\r\n";
                }
                String acceptRanges = conn.getHeaderField("Accept-Ranges");
                if (acceptRanges != null) {
                    responseHeader += "Accept-Ranges: " + acceptRanges + "\r\n";
                }
                String cacheControl = conn.getHeaderField("Cache-Control");
                if (cacheControl != null) {
                    responseHeader += "Cache-Control: " + cacheControl + "\r\n";
                }

                responseHeader += "Connection: close\r\n\r\n";
                out.write(responseHeader.getBytes(StandardCharsets.UTF_8));

                InputStream connIn = conn.getInputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = connIn.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                connIn.close();
                out.flush();
            }

        } catch (Exception e) {
            Log.e(TAG, "Proxy error", e);
            sendResponse(out, 500, "text/plain", "Proxy Error: " + e.getMessage());
        }
    }

    private static String rewriteTagUris(String line, String baseUrl, String proxyBaseUrl, String paramSuffix) {
        StringBuffer sb = new StringBuffer();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("URI=(?:\"([^\"]+)\"|'([^']+)'|([^,\\s]+))");
        java.util.regex.Matcher matcher = pattern.matcher(line);
        while (matcher.find()) {
            String uri = matcher.group(1);
            if (uri == null) uri = matcher.group(2);
            if (uri == null) uri = matcher.group(3);
            if (uri != null) {
                String resolved = resolveRelativeUrl(uri, baseUrl);
                try {
                    String replacement = "URI=\"" + proxyBaseUrl + "?url=" + URLEncoder.encode(resolved, "UTF-8") + paramSuffix + "\"";
                    matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(replacement));
                } catch (Exception e) {
                    matcher.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(matcher.group(0)));
                }
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static String resolveRelativeUrl(String relative, String base) {
        try {
            URL baseUrl = new URL(base);
            URL resolved = new URL(baseUrl, relative);
            return resolved.toString();
        } catch (Exception e) {
            return relative;
        }
    }

    private static String fetchUrlText(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(15000);
        try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }
}
