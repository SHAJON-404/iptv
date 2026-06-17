import { OAuth2Client } from 'google-auth-library';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const MAX_SESSIONS = 5;

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
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const baseUrl = getBaseUrl(request);

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=NoCode', baseUrl));
  }

  const redirectUri = `${baseUrl}/__/oauth/google/callback`;
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;

  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch user profile info exactly like the reference project
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });
    const userData = ticket.getPayload();

    if (!userData || !userData.email) {
      return NextResponse.redirect(new URL('/login?error=NoEmail', baseUrl));
    }

    // Upsert User
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name || userData.email.split("@")[0],
          image: userData.picture || null,
        }
      });
    }

    // Ensure Account link exists
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: userData.sub
        }
      }
    });

    if (!account) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: userData.sub,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          token_type: tokens.token_type,
          id_token: tokens.id_token,
        }
      });
    }

    // Enforce 5 Session Limit
    const userSessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { expires: 'asc' }
    });

    if (userSessions.length >= MAX_SESSIONS) {
      const excess = userSessions.length - MAX_SESSIONS + 1; // +1 because we are about to add a new one
      const toDelete = userSessions.slice(0, excess);
      await prisma.session.deleteMany({
        where: { id: { in: toDelete.map(s => s.id) } }
      });
    }

    // Create New Session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 10); // 10 days from now

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      }
    });

    // Setup dynamic cookie configuration
    const host = request.headers.get("host") || url.host;
    const rootDomain = process.env.ROOT_DOMAIN || "shajon.dev";
    const isRootDomain = host.includes(rootDomain);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookieOptions: any = {
      httpOnly: true,
      secure: isRootDomain || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expires,
    };

    // Cross-subdomain sharing for ROOT_DOMAIN
    if (isRootDomain) {
      cookieOptions.domain = `.${rootDomain}`;
    }

    // Set Cookie
    (await cookies()).set('iptv_session', sessionToken, cookieOptions);

    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (error) {
    console.error('Google OAuth Error:', error);
    return NextResponse.redirect(new URL('/login?error=OAuthFailed', baseUrl));
  }
}
