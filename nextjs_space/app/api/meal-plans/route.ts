import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/meal-plans - List meal plans
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = await verifyAuthToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    const where: any = {};
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (status) {
      where.status = status;
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, mealPlans });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return NextResponse.json({ error: 'Erro ao buscar cardápios' }, { status: 500 });
  }
}

// POST /api/meal-plans - Create a new meal plan
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
      patientId,
      startDate,
      endDate,
      notes,
      status = 'DRAFT',
      recipes = [],
    } = body;

    // Validate required fields
    if (!patientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patientId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Create meal plan with recipes
    const mealPlan = await prisma.mealPlan.create({
      data: {
        patientId,
        nutritionistId: payload.userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        status,
        recipes: {
          create: recipes.map((r: any) => ({
            recipeId: r.recipeId,
            dayOfWeek: r.dayOfWeek,
            mealType: r.mealType,
            portion: r.portion || 1,
            notes: r.notes,
          })),
        },
      },
      include: {
        patient: true,
        recipes: {
          include: {
            recipe: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, mealPlan }, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return NextResponse.json({ error: 'Erro ao criar cardápio' }, { status: 500 });
  }
}
