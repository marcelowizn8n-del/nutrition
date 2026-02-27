'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { 
  DAYS_OF_WEEK, 
  MEAL_TYPES, 
  getMealTypeInfo,
  type MealPlanRecipe,
  type Recipe,
  type NutritionalInfo,
  type Ingredient
} from '@/lib/nutrition-types';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface WeeklyCalendarProps {
  mealPlanRecipes: (MealPlanRecipe & { recipe: Recipe | Record<string, unknown> })[];
  startDate: Date;
  onRecipeClick?: (recipe: Recipe, mealPlanRecipeId: string) => void;
  onSubstitute?: (mealPlanRecipeId: string, currentRecipe: Recipe) => void;
  showSubstituteButton?: boolean;
  compact?: boolean;
}

export function WeeklyCalendar({
  mealPlanRecipes,
  startDate,
  onRecipeClick,
  onSubstitute,
  showSubstituteButton = false,
  compact = false,
}: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = addDays(startOfWeek(startDate, { weekStartsOn: 0 }), weekOffset * 7);

  // Group recipes by day and meal type
  const recipesByDay: Record<number, Record<string, (MealPlanRecipe & { recipe: Recipe })[]>> = {};
  
  DAYS_OF_WEEK.forEach(day => {
    recipesByDay[day.value] = {};
    MEAL_TYPES.forEach(meal => {
      recipesByDay[day.value][meal.value] = [];
    });
  });

  mealPlanRecipes.forEach(mpr => {
    const recipe = mpr.recipe as Record<string, unknown>;
    const ingredients: Ingredient[] = typeof recipe.ingredients === 'string' 
      ? JSON.parse(recipe.ingredients as string) 
      : (recipe.ingredients as Ingredient[]);
    const nutritionalInfo: NutritionalInfo = typeof recipe.nutritionalInfo === 'string'
      ? JSON.parse(recipe.nutritionalInfo as string)
      : (recipe.nutritionalInfo as NutritionalInfo);
    
    const normalizedRecipe: Recipe = {
      ...recipe,
      ingredients,
      nutritionalInfo,
    } as unknown as Recipe;

    if (recipesByDay[mpr.dayOfWeek]?.[mpr.mealType]) {
      recipesByDay[mpr.dayOfWeek][mpr.mealType].push({
        ...mpr,
        recipe: normalizedRecipe,
      });
    }
  });

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} - 
            {format(addDays(currentWeekStart, 6), "d 'de' MMMM", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.value} className="text-center">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {day.short}
              </div>
              <div className="text-xs">
                {format(addDays(currentWeekStart, day.value), 'd')}
              </div>
            </div>
          ))}
        </div>

        {MEAL_TYPES.map(meal => (
          <div key={meal.value} className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map(day => {
              const recipes = recipesByDay[day.value][meal.value];
              return (
                <div
                  key={`${day.value}-${meal.value}`}
                  className={`min-h-[40px] rounded text-xs p-1 ${meal.color}`}
                >
                  {recipes.length > 0 ? (
                    <div 
                      className="cursor-pointer truncate"
                      onClick={() => onRecipeClick?.(recipes[0].recipe, recipes[0].id)}
                    >
                      {recipes[0].recipe.name}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Cardápio Semanal</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-[180px] text-center">
            {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} - 
            {format(addDays(currentWeekStart, 6), "d 'de' MMMM", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-sm font-medium w-24"></th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day.value} className="p-2 text-center text-sm font-medium min-w-[120px]">
                    <div>{day.label}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {format(addDays(currentWeekStart, day.value), 'd/MM')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map(meal => (
                <tr key={meal.value} className="border-t">
                  <td className="p-2">
                    <Badge className={meal.color}>
                      {meal.icon} {meal.label}
                    </Badge>
                  </td>
                  {DAYS_OF_WEEK.map(day => {
                    const recipes = recipesByDay[day.value][meal.value];
                    return (
                      <td key={`${day.value}-${meal.value}`} className="p-2 align-top">
                        {recipes.length > 0 ? (
                          <div className="space-y-1">
                            {recipes.map(mpr => (
                              <div 
                                key={mpr.id}
                                className="bg-muted/50 rounded p-2 text-sm hover:bg-muted cursor-pointer transition-colors"
                              >
                                <div 
                                  className="font-medium line-clamp-2"
                                  onClick={() => onRecipeClick?.(mpr.recipe, mpr.id)}
                                >
                                  {mpr.recipe.name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {mpr.recipe.nutritionalInfo.calories} kcal
                                </div>
                                {mpr.substitutedFromId && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    Substituída
                                  </Badge>
                                )}
                                {showSubstituteButton && onSubstitute && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full mt-1 h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSubstitute(mpr.id, mpr.recipe);
                                    }}
                                  >
                                    <ArrowLeftRight className="w-3 h-3 mr-1" />
                                    Substituir
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground text-sm py-2">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
