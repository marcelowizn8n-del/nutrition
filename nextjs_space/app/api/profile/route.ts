import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

// PUT /api/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = await verifyAuthToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl, currentPassword, newPassword } = body;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Senha atual é obrigatória' }, { status: 400 });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
      }

      // Hash new password
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar perfil' },
      { status: 500 }
    );
  }
}
