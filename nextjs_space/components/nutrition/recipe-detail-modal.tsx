'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Flame, ChefHat, ListChecks } from 'lucide-react';
import { type Recipe, getCategoryInfo } from '@/lib/nutrition-types';
import Image from 'next/image';

interface RecipeDetailModalProps {
  open: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

export function RecipeDetailModal({ open, onClose, recipe }: RecipeDetailModalProps) {
  if (!recipe) return null;

  const categoryInfo = getCategoryInfo(recipe.category);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <DialogTitle className="text-xl">{recipe.name}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image and Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg overflow-hidden">
              {recipe.imageUrl ? (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ChefHat className="w-20 h-20 text-primary/30" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {categoryInfo.icon} {categoryInfo.label}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {recipe.prepTime} minutos
                </Badge>
                <Badge variant="outline">
                  <Users className="w-3 h-3 mr-1" />
                  {recipe.servings} porções
                </Badge>
              </div>

              {/* Nutritional Info */}
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    Info Nutricional (por porção)
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calorias:</span>
                      <span className="font-medium">{recipe.nutritionalInfo.calories} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proteínas:</span>
                      <span className="font-medium">{recipe.nutritionalInfo.proteins}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carboidratos:</span>
                      <span className="font-medium">{recipe.nutritionalInfo.carbs}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gorduras:</span>
                      <span className="font-medium">{recipe.nutritionalInfo.fats}g</span>
                    </div>
                    {recipe.nutritionalInfo.fiber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fibras:</span>
                        <span className="font-medium">{recipe.nutritionalInfo.fiber}g</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ingredients */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Ingredientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span className="font-medium">{ingredient.quantity} {ingredient.unit}</span>
                    <span>{ingredient.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Modo de Preparo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line text-sm text-muted-foreground">
                {recipe.instructions}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
