'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Plus, X, Utensils, Coffee, Sun, Moon, Apple, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Domingo', short: 'Dom' },
  { id: 1, name: 'Segunda', short: 'Seg' },
  { id: 2, name: 'Terça', short: 'Ter' },
  { id: 3, name: 'Quarta', short: 'Qua' },
  { id: 4, name: 'Quinta', short: 'Qui' },
  { id: 5, name: 'Sexta', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
];

const MEAL_TYPES = [
  { id: 'BREAKFAST', name: 'Café da Manhã', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'LUNCH', name: 'Almoço', icon: Sun, color: 'bg-orange-100 text-orange-700' },
  { id: 'DINNER', name: 'Jantar', icon: Moon, color: 'bg-blue-100 text-blue-700' },
  { id: 'SNACK', name: 'Lanche', icon: Apple, color: 'bg-green-100 text-green-700' },
];

interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number;
  nutritionalInfo: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  };
}

interface MealSlot {
  dayOfWeek: number;
  mealType: string;
  recipeId: string;
  recipeName: string;
  portion: number;
}

interface WeeklyProgrammingProps {
  mealPlanId?: string;
  initialSlots?: MealSlot[];
  onSave?: (slots: MealSlot[]) => void;
  readOnly?: boolean;
}

export default function WeeklyProgramming({
  mealPlanId,
  initialSlots = [],
  onSave,
  readOnly = false,
}: WeeklyProgrammingProps) {
  const [slots, setSlots] = useState<MealSlot[]>(initialSlots);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes || []);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const getSlotForDayAndMeal = (dayOfWeek: number, mealType: string) => {
    return slots.find(s => s.dayOfWeek === dayOfWeek && s.mealType === mealType);
  };

  const handleAddMeal = (dayOfWeek: number, mealType: string) => {
    setSelectedDay(dayOfWeek);
    setSelectedMealType(mealType);
    setSelectedRecipe('');
    setDialogOpen(true);
  };

  const handleConfirmAddMeal = () => {
    if (selectedDay === null || !selectedMealType || !selectedRecipe) return;

    const recipe = recipes.find(r => r.id === selectedRecipe);
    if (!recipe) return;

    // Remove existing slot if any
    const updatedSlots = slots.filter(
      s => !(s.dayOfWeek === selectedDay && s.mealType === selectedMealType)
    );

    // Add new slot
    updatedSlots.push({
      dayOfWeek: selectedDay,
      mealType: selectedMealType,
      recipeId: selectedRecipe,
      recipeName: recipe.name,
      portion: 1,
    });

    setSlots(updatedSlots);
    setDialogOpen(false);
    onSave?.(updatedSlots);
  };

  const handleRemoveMeal = (dayOfWeek: number, mealType: string) => {
    const updatedSlots = slots.filter(
      s => !(s.dayOfWeek === dayOfWeek && s.mealType === mealType)
    );
    setSlots(updatedSlots);
    onSave?.(updatedSlots);
  };

  const getMealTypeInfo = (mealType: string) => {
    return MEAL_TYPES.find(m => m.id === mealType) || MEAL_TYPES[0];
  };

  const filteredRecipes = recipes.filter(r => {
    if (!selectedMealType) return true;
    // Map meal type to recipe category
    if (selectedMealType === 'BREAKFAST') return r.category === 'BREAKFAST';
    if (selectedMealType === 'LUNCH') return r.category === 'LUNCH';
    if (selectedMealType === 'DINNER') return r.category === 'DINNER';
    if (selectedMealType === 'SNACK') return r.category === 'SNACK';
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Programação Semanal
        </CardTitle>
        <CardDescription>
          Organize as refeições da semana arrastando receitas para os slots
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingRecipes ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left w-24">Refeição</th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day.id} className="p-2 text-center text-sm font-medium">
                      {day.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(mealType => (
                  <tr key={mealType.id} className="border-b last:border-0">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <mealType.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{mealType.name}</span>
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const slot = getSlotForDayAndMeal(day.id, mealType.id);
                      return (
                        <td key={day.id} className="p-1">
                          <div
                            className={`min-h-[60px] rounded-lg border-2 border-dashed p-2 transition-colors ${
                              slot
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            {slot ? (
                              <div className="relative group">
                                <Badge className={`${mealType.color} text-xs truncate max-w-full`}>
                                  {slot.recipeName.length > 12
                                    ? slot.recipeName.substring(0, 12) + '...'
                                    : slot.recipeName}
                                </Badge>
                                {!readOnly && (
                                  <button
                                    onClick={() => handleRemoveMeal(day.id, mealType.id)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : !readOnly ? (
                              <button
                                onClick={() => handleAddMeal(day.id, mealType.id)}
                                className="w-full h-full min-h-[40px] flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <span>{slots.length} refeições programadas</span>
          {onSave && !readOnly && (
            <Button onClick={() => onSave(slots)} size="sm">
              Salvar Programação
            </Button>
          )}
        </div>
      </CardContent>

      {/* Add Meal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Refeição</DialogTitle>
            <DialogDescription>
              {selectedDay !== null && selectedMealType && (
                <>
                  {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.name} -{' '}
                  {getMealTypeInfo(selectedMealType).name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Selecione uma receita</label>
            <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma receita..." />
              </SelectTrigger>
              <SelectContent>
                {filteredRecipes.length > 0 ? (
                  filteredRecipes.map(recipe => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4" />
                        <span>{recipe.name}</span>
                        <span className="text-xs text-gray-400">
                          ({recipe.nutritionalInfo?.calories || 0} kcal)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Nenhuma receita disponível para esta categoria
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAddMeal} disabled={!selectedRecipe}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
