'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Search, GripVertical } from 'lucide-react';
import { 
  DAYS_OF_WEEK, 
  MEAL_TYPES, 
  RECIPE_CATEGORIES,
  type Recipe,
  type MealType,
  type RecipeCategory,
  type NutritionalInfo,
  type Ingredient
} from '@/lib/nutrition-types';
import { getRecipes } from '@/lib/actions/nutrition-actions';
import { RecipeCard } from './recipe-card';

interface MealSlot {
  dayOfWeek: number;
  mealType: MealType;
  recipe: Recipe | null;
  tempId: string;
}

interface MealPlanBuilderProps {
  initialSlots?: MealSlot[];
  onChange: (slots: MealSlot[]) => void;
}

export function MealPlanBuilder({ initialSlots, onChange }: MealPlanBuilderProps) {
  const [slots, setSlots] = useState<MealSlot[]>(initialSlots || []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, [search, categoryFilter]);

  useEffect(() => {
    onChange(slots);
  }, [slots]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const result = await getRecipes({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: search || undefined,
        limit: 20,
      });
      
      if (result.success && result.recipes) {
        const normalizedRecipes = result.recipes.map(r => {
          const ingredients: Ingredient[] = typeof r.ingredients === 'string' 
            ? JSON.parse(r.ingredients) 
            : (r.ingredients as Ingredient[]);
          const nutritionalInfo: NutritionalInfo = typeof r.nutritionalInfo === 'string'
            ? JSON.parse(r.nutritionalInfo)
            : (r.nutritionalInfo as NutritionalInfo);
          
          return {
            ...r,
            ingredients,
            nutritionalInfo,
          } as unknown as Recipe;
        });
        setRecipes(normalizedRecipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSlot = (dayOfWeek: number, mealType: MealType) => {
    const newSlot: MealSlot = {
      dayOfWeek,
      mealType,
      recipe: null,
      tempId: `${Date.now()}-${Math.random()}`,
    };
    setSlots([...slots, newSlot]);
    setSelectedSlot(newSlot.tempId);
  };

  const removeSlot = (tempId: string) => {
    setSlots(slots.filter(s => s.tempId !== tempId));
    if (selectedSlot === tempId) {
      setSelectedSlot(null);
    }
  };

  const assignRecipe = (recipe: Recipe) => {
    if (!selectedSlot) return;
    
    setSlots(slots.map(s => 
      s.tempId === selectedSlot ? { ...s, recipe } : s
    ));
    setSelectedSlot(null);
  };

  // Group slots by day and meal type
  const slotsByDayMeal: Record<number, Record<MealType, MealSlot[]>> = {};
  DAYS_OF_WEEK.forEach(day => {
    slotsByDayMeal[day.value] = {} as Record<MealType, MealSlot[]>;
    MEAL_TYPES.forEach(meal => {
      slotsByDayMeal[day.value][meal.value] = [];
    });
  });
  slots.forEach(slot => {
    if (slotsByDayMeal[slot.dayOfWeek]?.[slot.mealType]) {
      slotsByDayMeal[slot.dayOfWeek][slot.mealType].push(slot);
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Montar Cardápio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-sm font-medium w-24"></th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day.value} className="p-2 text-center text-sm font-medium min-w-[100px]">
                        {day.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEAL_TYPES.map(meal => (
                    <tr key={meal.value} className="border-t">
                      <td className="p-2">
                        <Badge className={meal.color} variant="secondary">
                          {meal.icon}
                        </Badge>
                      </td>
                      {DAYS_OF_WEEK.map(day => {
                        const daySlots = slotsByDayMeal[day.value][meal.value];
                        return (
                          <td key={`${day.value}-${meal.value}`} className="p-1 align-top">
                            <div className="min-h-[60px] space-y-1">
                              {daySlots.map(slot => (
                                <div
                                  key={slot.tempId}
                                  className={`text-xs p-1 rounded border cursor-pointer transition-all ${
                                    selectedSlot === slot.tempId
                                      ? 'border-primary bg-primary/10'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                  onClick={() => setSelectedSlot(slot.tempId)}
                                >
                                  <div className="flex items-center justify-between">
                                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeSlot(slot.tempId);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                  {slot.recipe ? (
                                    <p className="truncate mt-1">{slot.recipe.name}</p>
                                  ) : (
                                    <p className="text-muted-foreground italic mt-1">Selecionar</p>
                                  )}
                                </div>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-6 text-xs"
                                onClick={() => addSlot(day.value, meal.value)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
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
      </div>

      {/* Recipe Selector */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base">Biblioteca de Receitas</CardTitle>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar receita..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select 
                value={categoryFilter} 
                onValueChange={(v) => setCategoryFilter(v as RecipeCategory | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as categorias</SelectItem>
                  {RECIPE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSlot ? (
              <p className="text-sm text-primary mb-2">Clique em uma receita para atribuir</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">Selecione um slot no calendário</p>
            )}
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : recipes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma receita encontrada</p>
              ) : (
                recipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    compact
                    onSelect={selectedSlot ? assignRecipe : undefined}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
