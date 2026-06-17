import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getCurrentUser() {
  const sessionToken = (await cookies()).get('iptv_session')?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true }
  });

  if (!session || session.expires < new Date()) {
    return null;
  }

  return session.user;
}
