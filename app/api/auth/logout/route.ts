import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const sessionToken = (await cookies()).get('iptv_session')?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: { sessionToken }
    });
  }

  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const rootDomain = process.env.ROOT_DOMAIN || "shajon.dev";
  const isRootDomain = host.includes(rootDomain);

  // Setup cookie deletion options matching how it was set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookieOptions: any = {
    httpOnly: true,
    secure: isRootDomain || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0), // expire immediately
  };

  if (isRootDomain) {
    cookieOptions.domain = `.${rootDomain}`;
  }

  // Clear cookie using cookies() helper for reliable next.js session mutation
  (await cookies()).set('iptv_session', '', cookieOptions);

  // Also clear cookie on the NextResponse object to cover all bases
  const res = NextResponse.json({ success: true });
  res.cookies.set('iptv_session', '', cookieOptions);

  return res;
}
