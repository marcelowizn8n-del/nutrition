// Nutrition Types for Phase 2

export type RecipeCategory = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type MealPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface NutritionalInfo {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string;
  nutritionalInfo: NutritionalInfo;
  category: RecipeCategory;
  prepTime: number;
  servings: number;
  imageUrl: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeFormData {
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string;
  nutritionalInfo: NutritionalInfo;
  category: RecipeCategory;
  prepTime: number;
  servings: number;
  imageUrl?: string;
}

export interface MealPlan {
  id: string;
  patientId: string;
  nutritionistId: string | null;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  status: MealPlanStatus;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    id: string;
    name: string;
  };
  recipes?: MealPlanRecipe[];
}

export interface MealPlanRecipe {
  id: string;
  mealPlanId: string;
  recipeId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  mealType: MealType;
  portion: number;
  notes: string | null;
  substitutedFromId: string | null;
  recipe?: Recipe;
}

export interface RecipeSubstitution {
  id: string;
  originalRecipeId: string;
  substituteRecipeId: string;
  reason: string | null;
  originalRecipe?: Recipe;
  substituteRecipe?: Recipe;
}

export interface MealPlanFormData {
  patientId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status?: MealPlanStatus;
}

export interface MealPlanRecipeFormData {
  mealPlanId: string;
  recipeId: string;
  dayOfWeek: number;
  mealType: MealType;
  portion?: number;
  notes?: string;
}

// UI Helper Types
export const RECIPE_CATEGORIES: { value: RecipeCategory; label: string; icon: string }[] = [
  { value: 'BREAKFAST', label: 'Café da Manhã', icon: '☕' },
  { value: 'LUNCH', label: 'Almoço', icon: '🍽️' },
  { value: 'DINNER', label: 'Jantar', icon: '🌙' },
  { value: 'SNACK', label: 'Lanche', icon: '🍎' },
];

export const MEAL_TYPES: { value: MealType; label: string; icon: string; color: string }[] = [
  { value: 'BREAKFAST', label: 'Café da Manhã', icon: '☕', color: 'bg-amber-100 text-amber-700' },
  { value: 'LUNCH', label: 'Almoço', icon: '🍽️', color: 'bg-green-100 text-green-700' },
  { value: 'DINNER', label: 'Jantar', icon: '🌙', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'SNACK', label: 'Lanche', icon: '🍎', color: 'bg-pink-100 text-pink-700' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export const MEAL_PLAN_STATUSES: { value: MealPlanStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  { value: 'ACTIVE', label: 'Ativo', color: 'bg-green-100 text-green-700' },
  { value: 'COMPLETED', label: 'Concluído', color: 'bg-blue-100 text-blue-700' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

export function getCategoryInfo(category: RecipeCategory) {
  return RECIPE_CATEGORIES.find(c => c.value === category) || RECIPE_CATEGORIES[0];
}

export function getMealTypeInfo(mealType: MealType) {
  return MEAL_TYPES.find(m => m.value === mealType) || MEAL_TYPES[0];
}

export function getDayOfWeekInfo(dayOfWeek: number) {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek) || DAYS_OF_WEEK[0];
}
