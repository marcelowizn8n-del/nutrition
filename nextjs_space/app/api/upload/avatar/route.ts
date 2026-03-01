import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { verifyAuthToken } from '@/lib/auth'
import { cookies } from 'next/headers'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies()
    const token = cookieStore.get('nutrition_session')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const payload = await verifyAuthToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB.' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Gerar nome único
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${payload.userId}_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)

    // Converter para buffer e salvar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar URL pública
    const url = `/uploads/avatars/${fileName}`
    
    return NextResponse.json({ url, message: 'Avatar enviado com sucesso' })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro ao processar upload' },
      { status: 500 }
    )
  }
}
