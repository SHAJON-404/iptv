import { OAuth2Client } from 'google-auth-library';
import { NextResponse } from 'next/server';

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const rootDomain = process.env.ROOT_DOMAIN || "shajon.dev";
  const forwardedProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(':', '');
  const protocol = forwardedProto === "http" && host.includes(rootDomain) ? "https" : forwardedProto;
  
  if (host.includes(rootDomain)) {
    return `https://${host}`;
  }
  return `${protocol}://${host}`;
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || baseUrl;
  const redirectUri = `${siteUrl}/__/oauth/google/callback`;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from the environment variables!');
  }

  console.log(`[Google Auth GET] process.env.NEXT_PUBLIC_SITE_URL: "${process.env.NEXT_PUBLIC_SITE_URL}"`);
  console.log(`[Google Auth GET] baseUrl: "${baseUrl}"`);
  console.log(`[Google Auth GET] siteUrl: "${siteUrl}"`);
  console.log(`[Google Auth GET] redirectUri: "${redirectUri}"`);

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const state = Buffer.from(JSON.stringify({ baseUrl })).toString('base64');

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'consent',
    state
  });

  return NextResponse.redirect(authUrl);
}
