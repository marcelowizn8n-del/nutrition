import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to verify authentication
async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  const payload = await verifyAuthToken(token);
  return payload;
}

// GET /api/meal-plans/[id] - Get single meal plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            sex: true,
            birthYear: true,
          },
        },
        recipes: {
          include: {
            recipe: true,
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' },
          ],
        },
      },
    });

    if (!mealPlan) {
      return NextResponse.json({ error: 'Cardápio não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, mealPlan });
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 });
  }
}

// PUT /api/meal-plans/[id] - Update meal plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, notes, status, recipes } = body;

    // Check if meal plan exists
    const existingMealPlan = await prisma.mealPlan.findUnique({
      where: { id },
    });

    if (!existingMealPlan) {
      return NextResponse.json({ error: 'Cardápio não encontrado' }, { status: 404 });
    }

    // Update meal plan
    const updateData: any = {};
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;

    // If recipes are provided, update them
    if (recipes && Array.isArray(recipes)) {
      // Delete existing recipes
      await prisma.mealPlanRecipe.deleteMany({
        where: { mealPlanId: id },
      });

      // Create new recipes
      await prisma.mealPlanRecipe.createMany({
        data: recipes.map((r: any) => ({
          mealPlanId: id,
          recipeId: r.recipeId,
          dayOfWeek: r.dayOfWeek,
          mealType: r.mealType,
          portion: r.portion || 1,
          notes: r.notes,
        })),
      });
    }

    const mealPlan = await prisma.mealPlan.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        recipes: {
          include: {
            recipe: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, mealPlan });
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cardápio' }, { status: 500 });
  }
}

// DELETE /api/meal-plans/[id] - Delete meal plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Check if meal plan exists
    const existingMealPlan = await prisma.mealPlan.findUnique({
      where: { id },
    });

    if (!existingMealPlan) {
      return NextResponse.json({ error: 'Cardápio não encontrado' }, { status: 404 });
    }

    // Delete meal plan (cascade will delete related recipes)
    await prisma.mealPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return NextResponse.json({ error: 'Erro ao excluir cardápio' }, { status: 500 });
  }
}
