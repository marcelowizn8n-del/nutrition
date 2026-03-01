import { cookies } from 'next/headers';
import { verifyAuthToken, AUTH_COOKIE_NAME, AuthPayload } from './auth';
import { prisma } from './prisma';

export async function getServerSession(): Promise<{
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'NUTRITIONIST' | 'PATIENT';
    avatarUrl: string | null;
  };
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = verifyAuthToken(token);

    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
