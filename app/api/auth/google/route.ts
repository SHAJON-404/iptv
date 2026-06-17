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
  const redirectUri = `${baseUrl}/__/oauth/google/callback`;

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'consent'
  });

  return NextResponse.redirect(authUrl);
}
