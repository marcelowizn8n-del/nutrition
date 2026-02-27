'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Check, Flame, Clock } from 'lucide-react';
import { type Recipe, type NutritionalInfo, type Ingredient, getCategoryInfo } from '@/lib/nutrition-types';
import { getRecipeSubstitutions } from '@/lib/actions/nutrition-actions';

interface SubstitutionModalProps {
  open: boolean;
  onClose: () => void;
  currentRecipe: Recipe | null;
  mealPlanRecipeId: string | null;
  onSubstitute: (mealPlanRecipeId: string, newRecipeId: string) => Promise<void>;
}

export function SubstitutionModal({
  open,
  onClose,
  currentRecipe,
  mealPlanRecipeId,
  onSubstitute,
}: SubstitutionModalProps) {
  const [substitutions, setSubstitutions] = useState<{ recipe: Recipe; reason: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (open && currentRecipe) {
      loadSubstitutions();
    } else {
      setSubstitutions([]);
      setSelectedRecipe(null);
    }
  }, [open, currentRecipe]);

  const loadSubstitutions = async () => {
    if (!currentRecipe) return;
    
    setLoading(true);
    try {
      const result = await getRecipeSubstitutions(currentRecipe.id);
      if (result.success && result.substitutions) {
        const subs = result.substitutions.map(sub => {
          const recipe = sub.substituteRecipe as Record<string, unknown>;
          const ingredients: Ingredient[] = typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients as string) 
            : (recipe.ingredients as Ingredient[]);
          const nutritionalInfo: NutritionalInfo = typeof recipe.nutritionalInfo === 'string'
            ? JSON.parse(recipe.nutritionalInfo as string)
            : (recipe.nutritionalInfo as NutritionalInfo);
          
          return {
            recipe: {
              ...recipe,
              ingredients,
              nutritionalInfo,
            } as unknown as Recipe,
            reason: sub.reason,
          };
        });
        setSubstitutions(subs);
      }
    } catch (error) {
      console.error('Error loading substitutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubstitute = async () => {
    if (!selectedRecipe || !mealPlanRecipeId) return;
    
    setSubmitting(true);
    try {
      await onSubstitute(mealPlanRecipeId, selectedRecipe.id);
      onClose();
    } catch (error) {
      console.error('Error substituting recipe:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentRecipe) return null;

  const categoryInfo = getCategoryInfo(currentRecipe.category);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Substituir Receita</DialogTitle>
          <DialogDescription>
            Escolha uma opção para substituir "{currentRecipe.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Recipe */}
          <div>
            <p className="text-sm font-medium mb-2">Receita Atual:</p>
            <Card className="bg-muted/50">
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-2xl">{categoryInfo.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{currentRecipe.name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {currentRecipe.nutritionalInfo.calories} kcal
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {currentRecipe.prepTime} min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>

          {/* Substitution Options */}
          <div>
            <p className="text-sm font-medium mb-2">Opções de Substituição:</p>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : substitutions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma substituição disponível para esta receita.</p>
                <p className="text-sm mt-1">A nutricionista pode adicionar opções de substituição.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {substitutions.map(({ recipe, reason }) => {
                  const subCategoryInfo = getCategoryInfo(recipe.category);
                  const isSelected = selectedRecipe?.id === recipe.id;
                  
                  return (
                    <Card 
                      key={recipe.id}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <span className="text-2xl">{subCategoryInfo.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{recipe.name}</p>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {recipe.nutritionalInfo.calories} kcal
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.prepTime} min
                            </span>
                          </div>
                          {reason && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {reason}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubstitute} 
            disabled={!selectedRecipe || submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar Substituição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
