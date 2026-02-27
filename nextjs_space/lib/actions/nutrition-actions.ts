'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { 
  RecipeFormData, 
  MealPlanFormData, 
  MealPlanRecipeFormData,
  Recipe,
  MealPlan,
  RecipeCategory,
  MealType
} from '@/lib/nutrition-types';

// ========== RECIPE ACTIONS ==========

export async function getRecipes(filters?: { 
  category?: RecipeCategory; 
  search?: string;
  limit?: number;
}) {
  try {
    const where: Record<string, unknown> = {};
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const recipes = await prisma.recipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit,
    });

    return { success: true, recipes };
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return { success: false, error: 'Erro ao buscar receitas' };
  }
}

export async function getRecipe(id: string) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        originalFor: {
          include: { substituteRecipe: true }
        },
        substituteFor: {
          include: { originalRecipe: true }
        }
      }
    });

    if (!recipe) {
      return { success: false, error: 'Receita não encontrada' };
    }

    return { success: true, recipe };
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return { success: false, error: 'Erro ao buscar receita' };
  }
}

export async function createRecipe(data: RecipeFormData) {
  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: data.name,
        description: data.description || null,
        ingredients: JSON.stringify(data.ingredients),
        instructions: data.instructions,
        nutritionalInfo: JSON.stringify(data.nutritionalInfo),
        category: data.category,
        prepTime: data.prepTime,
        servings: data.servings,
        imageUrl: data.imageUrl || null,
      },
    });

    revalidatePath('/nutricionista/receitas');
    return { success: true, recipe };
  } catch (error) {
    console.error('Error creating recipe:', error);
    return { success: false, error: 'Erro ao criar receita' };
  }
}

export async function updateRecipe(id: string, data: Partial<RecipeFormData>) {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.ingredients !== undefined) updateData.ingredients = JSON.stringify(data.ingredients);
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.nutritionalInfo !== undefined) updateData.nutritionalInfo = JSON.stringify(data.nutritionalInfo);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.prepTime !== undefined) updateData.prepTime = data.prepTime;
    if (data.servings !== undefined) updateData.servings = data.servings;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;

    const recipe = await prisma.recipe.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/nutricionista/receitas');
    revalidatePath(`/nutricionista/receitas/${id}`);
    return { success: true, recipe };
  } catch (error) {
    console.error('Error updating recipe:', error);
    return { success: false, error: 'Erro ao atualizar receita' };
  }
}

export async function deleteRecipe(id: string) {
  try {
    await prisma.recipe.delete({
      where: { id },
    });

    revalidatePath('/nutricionista/receitas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return { success: false, error: 'Erro ao excluir receita' };
  }
}

// ========== MEAL PLAN ACTIONS ==========

export async function getMealPlans(filters?: {
  patientId?: string;
  status?: string;
  nutritionistId?: string;
}) {
  try {
    const where: Record<string, unknown> = {};
    
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.status) where.status = filters.status;
    if (filters?.nutritionistId) where.nutritionistId = filters.nutritionistId;

    const mealPlans = await prisma.mealPlan.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true }
        },
        recipes: {
          include: {
            recipe: true
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, mealPlans };
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return { success: false, error: 'Erro ao buscar cardápios' };
  }
}

export async function getMealPlan(id: string) {
  try {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, name: true }
        },
        recipes: {
          include: {
            recipe: {
              include: {
                originalFor: {
                  include: { substituteRecipe: true }
                }
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      },
    });

    if (!mealPlan) {
      return { success: false, error: 'Cardápio não encontrado' };
    }

    return { success: true, mealPlan };
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return { success: false, error: 'Erro ao buscar cardápio' };
  }
}

export async function getPatientActiveMealPlan(patientId: string) {
  try {
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        patientId,
        status: 'ACTIVE',
      },
      include: {
        patient: {
          select: { id: true, name: true }
        },
        recipes: {
          include: {
            recipe: {
              include: {
                originalFor: {
                  include: { substituteRecipe: true }
                }
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, mealPlan };
  } catch (error) {
    console.error('Error fetching patient meal plan:', error);
    return { success: false, error: 'Erro ao buscar cardápio do paciente' };
  }
}

export async function createMealPlan(data: MealPlanFormData) {
  try {
    const mealPlan = await prisma.mealPlan.create({
      data: {
        patientId: data.patientId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        notes: data.notes || null,
        status: data.status || 'DRAFT',
      },
      include: {
        patient: {
          select: { id: true, name: true }
        }
      }
    });

    revalidatePath('/nutricionista/cardapios');
    return { success: true, mealPlan };
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return { success: false, error: 'Erro ao criar cardápio' };
  }
}

export async function updateMealPlan(id: string, data: Partial<MealPlanFormData>) {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (data.patientId !== undefined) updateData.patientId = data.patientId;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status !== undefined) updateData.status = data.status;

    const mealPlan = await prisma.mealPlan.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, name: true }
        }
      }
    });

    revalidatePath('/nutricionista/cardapios');
    revalidatePath(`/nutricionista/cardapios/${id}`);
    return { success: true, mealPlan };
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return { success: false, error: 'Erro ao atualizar cardápio' };
  }
}

export async function deleteMealPlan(id: string) {
  try {
    await prisma.mealPlan.delete({
      where: { id },
    });

    revalidatePath('/nutricionista/cardapios');
    return { success: true };
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return { success: false, error: 'Erro ao excluir cardápio' };
  }
}

// ========== MEAL PLAN RECIPE ACTIONS ==========

export async function addRecipeToMealPlan(data: MealPlanRecipeFormData) {
  try {
    const mealPlanRecipe = await prisma.mealPlanRecipe.create({
      data: {
        mealPlanId: data.mealPlanId,
        recipeId: data.recipeId,
        dayOfWeek: data.dayOfWeek,
        mealType: data.mealType,
        portion: data.portion || 1,
        notes: data.notes || null,
      },
      include: {
        recipe: true
      }
    });

    revalidatePath(`/nutricionista/cardapios/${data.mealPlanId}`);
    return { success: true, mealPlanRecipe };
  } catch (error) {
    console.error('Error adding recipe to meal plan:', error);
    return { success: false, error: 'Erro ao adicionar receita ao cardápio' };
  }
}

export async function removeRecipeFromMealPlan(id: string, mealPlanId: string) {
  try {
    await prisma.mealPlanRecipe.delete({
      where: { id },
    });

    revalidatePath(`/nutricionista/cardapios/${mealPlanId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing recipe from meal plan:', error);
    return { success: false, error: 'Erro ao remover receita do cardápio' };
  }
}

export async function updateMealPlanRecipe(
  id: string, 
  mealPlanId: string,
  data: { portion?: number; notes?: string; mealType?: MealType; dayOfWeek?: number }
) {
  try {
    const mealPlanRecipe = await prisma.mealPlanRecipe.update({
      where: { id },
      data,
      include: {
        recipe: true
      }
    });

    revalidatePath(`/nutricionista/cardapios/${mealPlanId}`);
    return { success: true, mealPlanRecipe };
  } catch (error) {
    console.error('Error updating meal plan recipe:', error);
    return { success: false, error: 'Erro ao atualizar receita do cardápio' };
  }
}

// ========== SUBSTITUTION ACTIONS ==========

export async function getRecipeSubstitutions(recipeId: string) {
  try {
    const substitutions = await prisma.recipeSubstitution.findMany({
      where: { originalRecipeId: recipeId },
      include: {
        substituteRecipe: true
      }
    });

    return { success: true, substitutions };
  } catch (error) {
    console.error('Error fetching substitutions:', error);
    return { success: false, error: 'Erro ao buscar substituições' };
  }
}

export async function createRecipeSubstitution(
  originalRecipeId: string,
  substituteRecipeId: string,
  reason?: string
) {
  try {
    const substitution = await prisma.recipeSubstitution.create({
      data: {
        originalRecipeId,
        substituteRecipeId,
        reason: reason || null,
      },
      include: {
        originalRecipe: true,
        substituteRecipe: true
      }
    });

    revalidatePath('/nutricionista/receitas');
    return { success: true, substitution };
  } catch (error) {
    console.error('Error creating substitution:', error);
    return { success: false, error: 'Erro ao criar substituição' };
  }
}

export async function deleteRecipeSubstitution(id: string) {
  try {
    await prisma.recipeSubstitution.delete({
      where: { id },
    });

    revalidatePath('/nutricionista/receitas');
    return { success: true };
  } catch (error) {
    console.error('Error deleting substitution:', error);
    return { success: false, error: 'Erro ao excluir substituição' };
  }
}

// ========== PATIENT SUBSTITUTION (for patient portal) ==========

export async function substituteRecipeInMealPlan(
  mealPlanRecipeId: string,
  newRecipeId: string,
  mealPlanId: string
) {
  try {
    // Get the original meal plan recipe
    const original = await prisma.mealPlanRecipe.findUnique({
      where: { id: mealPlanRecipeId }
    });

    if (!original) {
      return { success: false, error: 'Receita do cardápio não encontrada' };
    }

    // Update with new recipe, storing the original
    const updated = await prisma.mealPlanRecipe.update({
      where: { id: mealPlanRecipeId },
      data: {
        recipeId: newRecipeId,
        substitutedFromId: original.recipeId,
      },
      include: {
        recipe: true
      }
    });

    revalidatePath(`/paciente/cardapio`);
    revalidatePath(`/nutricionista/cardapios/${mealPlanId}`);
    return { success: true, mealPlanRecipe: updated };
  } catch (error) {
    console.error('Error substituting recipe:', error);
    return { success: false, error: 'Erro ao substituir receita' };
  }
}

// ========== PATIENTS (for meal plan creation) ==========

export async function getPatients() {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        name: true,
        sex: true,
        birthYear: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, patients };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { success: false, error: 'Erro ao buscar pacientes' };
  }
}
