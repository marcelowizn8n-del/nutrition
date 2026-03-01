import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { ok: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
