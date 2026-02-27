import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user });
}
