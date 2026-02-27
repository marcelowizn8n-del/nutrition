'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Flame, Edit, Trash2, Eye, ChefHat } from 'lucide-react';
import { getCategoryInfo, type Recipe, type NutritionalInfo, type Ingredient } from '@/lib/nutrition-types';
import Image from 'next/image';

interface RecipeCardProps {
  recipe: Recipe | {
    id: string;
    name: string;
    description: string | null;
    ingredients: unknown;
    instructions: string;
    nutritionalInfo: unknown;
    category: string;
    prepTime: number;
    servings: number;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onSelect?: (recipe: Recipe) => void;
  showActions?: boolean;
  selected?: boolean;
  compact?: boolean;
}

export function RecipeCard({
  recipe,
  onView,
  onEdit,
  onDelete,
  onSelect,
  showActions = true,
  selected = false,
  compact = false,
}: RecipeCardProps) {
  // Parse JSON fields if needed
  const ingredients: Ingredient[] = typeof recipe.ingredients === 'string' 
    ? JSON.parse(recipe.ingredients) 
    : (recipe.ingredients as Ingredient[]);
  
  const nutritionalInfo: NutritionalInfo = typeof recipe.nutritionalInfo === 'string'
    ? JSON.parse(recipe.nutritionalInfo)
    : (recipe.nutritionalInfo as NutritionalInfo);

  const categoryInfo = getCategoryInfo(recipe.category as Recipe['category']);

  const normalizedRecipe: Recipe = {
    ...recipe,
    ingredients,
    nutritionalInfo,
    category: recipe.category as Recipe['category'],
  } as Recipe;

  if (compact) {
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          selected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => onSelect?.(normalizedRecipe)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryInfo.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{recipe.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {nutritionalInfo.calories} kcal
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recipe.prepTime}min
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg ${
      selected ? 'ring-2 ring-primary' : ''
    }`}>
      <CardHeader className="p-0">
        <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ChefHat className="w-16 h-16 text-primary/30" />
            </div>
          )}
          <Badge className="absolute top-2 right-2" variant="secondary">
            {categoryInfo.icon} {categoryInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{recipe.name}</h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {recipe.prepTime} min
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {recipe.servings} porções
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Flame className="w-3 h-3 mr-1" />
            {nutritionalInfo.calories} kcal
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-green-50 rounded p-2">
            <p className="font-medium text-green-700">{nutritionalInfo.proteins}g</p>
            <p className="text-green-600">Proteínas</p>
          </div>
          <div className="bg-amber-50 rounded p-2">
            <p className="font-medium text-amber-700">{nutritionalInfo.carbs}g</p>
            <p className="text-amber-600">Carbos</p>
          </div>
          <div className="bg-rose-50 rounded p-2">
            <p className="font-medium text-rose-700">{nutritionalInfo.fats}g</p>
            <p className="text-rose-600">Gorduras</p>
          </div>
        </div>
      </CardContent>

      {showActions && (onView || onEdit || onDelete || onSelect) && (
        <CardFooter className="p-4 pt-0 flex gap-2">
          {onSelect && (
            <Button 
              variant={selected ? 'default' : 'outline'} 
              size="sm" 
              className="flex-1"
              onClick={() => onSelect(normalizedRecipe)}
            >
              {selected ? 'Selecionada' : 'Selecionar'}
            </Button>
          )}
          {onView && (
            <Button variant="ghost" size="icon" onClick={() => onView(normalizedRecipe)}>
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(normalizedRecipe)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(normalizedRecipe)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
