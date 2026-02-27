'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, User, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { WeeklyCalendar, RecipeDetailModal } from '@/components/nutrition';
import { getMealPlan, updateMealPlan } from '@/lib/actions/nutrition-actions';
import { 
  MEAL_PLAN_STATUSES, 
  type MealPlan,
  type Recipe,
  type MealPlanRecipe,
  type NutritionalInfo,
  type Ingredient
} from '@/lib/nutrition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MealPlanDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadMealPlan();
  }, [params.id]);

  const loadMealPlan = async () => {
    setLoading(true);
    try {
      const result = await getMealPlan(params.id as string);
      if (result.success && result.mealPlan) {
        setMealPlan(result.mealPlan as MealPlan);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar cardápio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setViewingRecipe(recipe);
  };

  const handleActivate = async () => {
    if (!mealPlan) return;
    
    setActivating(true);
    try {
      const result = await updateMealPlan(mealPlan.id, { status: 'ACTIVE' });
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Cardápio ativado com sucesso!' });
        loadMealPlan();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao ativar cardápio',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cardápio não encontrado</p>
        <Link href="/nutricionista/cardapios">
          <Button variant="outline" className="mt-4">
            Voltar para Cardápios
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = MEAL_PLAN_STATUSES.find(s => s.value === mealPlan.status) || MEAL_PLAN_STATUSES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/nutricionista/cardapios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Cardápio</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{mealPlan.patient?.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mealPlan.status === 'DRAFT' && (
            <Button onClick={handleActivate} disabled={activating}>
              {activating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Ativar Cardápio
            </Button>
          )}
          <Link href={`/nutricionista/cardapios/${mealPlan.id}/editar`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(mealPlan.startDate), "d 'de' MMMM", { locale: ptBR })} - 
                {format(new Date(mealPlan.endDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {mealPlan.recipes?.length || 0} receitas
            </span>
          </div>
          {mealPlan.notes && (
            <p className="mt-3 text-sm text-muted-foreground">
              <strong>Observações:</strong> {mealPlan.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <WeeklyCalendar
        mealPlanRecipes={(mealPlan.recipes || []) as (MealPlanRecipe & { recipe: Recipe })[]}
        startDate={new Date(mealPlan.startDate)}
        onRecipeClick={handleRecipeClick}
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={!!viewingRecipe}
        onClose={() => setViewingRecipe(null)}
        recipe={viewingRecipe}
      />
    </div>
  );
}
