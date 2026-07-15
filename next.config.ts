import type { NextConfig } from "next";

const customOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((item) => item.trim())
  : [];

const isExport = process.env.NEXT_STANDALONE_EXPORT === "true";

const nextConfig: NextConfig = {
  env: {
    PLAYLIST_DOMAIN: process.env.PLAYLIST_DOMAIN || "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
  },
  output: isExport ? "export" : "standalone",
  trailingSlash: isExport ? true : undefined,
  allowedDevOrigins: customOrigins,
  images: {
    unoptimized: isExport ? true : undefined,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.aynaott.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "tstatic.akash-go.com",
      },
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
      {
        protocol: "https",
        hostname: "media.unreel.me",
      },
      {
        protocol: "https",
        hostname: "a.jsrdn.com",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  ...(isExport ? {} : {
    async rewrites() {
      return [
        {
          source: '/__/oauth/google/callback',
          destination: '/api/auth/callback/google',
        },
        {
          source: '/__/oauth/google/callback/',
          destination: '/api/auth/callback/google',
        },
      ];
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "X-Frame-Options",
              value: "SAMEORIGIN",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
          ],
        },
      ];
    },
  })
};

export default nextConfig;
