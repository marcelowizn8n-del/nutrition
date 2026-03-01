import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/recipes - List all recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.name = {
        contains: search,
      };
    }

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 });
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = await verifyAuthToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      ingredients,
      instructions,
      nutritionalInfo,
      category,
      prepTime,
      servings,
      imageUrl,
    } = body;

    // Validate required fields
    if (!name || !ingredients || !instructions || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, ingredientes, instruções, categoria' },
        { status: 400 }
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        ingredients,
        instructions,
        nutritionalInfo: nutritionalInfo || {},
        category,
        prepTime: prepTime || 30,
        servings: servings || 1,
        imageUrl,
        createdById: payload.userId,
      },
    });

    return NextResponse.json({ success: true, recipe }, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Erro ao criar receita' }, { status: 500 });
  }
}
