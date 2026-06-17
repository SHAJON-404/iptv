import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  const sessionToken = (await cookies()).get('iptv_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ session: null });
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true }
  });

  if (!session || session.expires < new Date()) {
    // Session is invalid or expired
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      expires: session.expires
    }
  });
}
