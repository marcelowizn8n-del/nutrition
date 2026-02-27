'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Loader2, UtensilsCrossed, History, Lightbulb } from 'lucide-react';
import { 
  WeeklyCalendar, 
  SubstitutionModal, 
  RecipeDetailModal 
} from '@/components/nutrition';
import { 
  getPatientActiveMealPlan,
  getMealPlans,
  substituteRecipeInMealPlan 
} from '@/lib/actions/nutrition-actions';
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
import { usePatientData } from '@/hooks';

export default function PatientMealPlanPage() {
  const { patients, loading: patientsLoading } = usePatientData();
  const { toast } = useToast();
  const [activeMealPlan, setActiveMealPlan] = useState<MealPlan | null>(null);
  const [pastMealPlans, setPastMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [substitutingRecipe, setSubstitutingRecipe] = useState<{
    recipe: Recipe;
    mealPlanRecipeId: string;
  } | null>(null);

  // Get first patient as "logged in" patient (demo)
  const currentPatient = patients[0];

  useEffect(() => {
    if (currentPatient) {
      loadMealPlans();
    }
  }, [currentPatient]);

  const loadMealPlans = async () => {
    if (!currentPatient) return;
    
    setLoading(true);
    try {
      // Get active meal plan
      const activeResult = await getPatientActiveMealPlan(currentPatient.id);
      if (activeResult.success) {
        setActiveMealPlan(activeResult.mealPlan as MealPlan | null);
      }

      // Get past meal plans
      const pastResult = await getMealPlans({ 
        patientId: currentPatient.id,
      });
      if (pastResult.success && pastResult.mealPlans) {
        const past = (pastResult.mealPlans as MealPlan[]).filter(
          mp => mp.status !== 'ACTIVE' && mp.status !== 'DRAFT'
        );
        setPastMealPlans(past);
      }
    } catch (error) {
      console.error('Error loading meal plans:', error);
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

  const handleSubstituteClick = (mealPlanRecipeId: string, currentRecipe: Recipe) => {
    setSubstitutingRecipe({ recipe: currentRecipe, mealPlanRecipeId });
  };

  const handleSubstitute = async (mealPlanRecipeId: string, newRecipeId: string) => {
    if (!activeMealPlan) return;
    
    try {
      const result = await substituteRecipeInMealPlan(
        mealPlanRecipeId, 
        newRecipeId, 
        activeMealPlan.id
      );
      
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Receita substituída com sucesso!' });
        loadMealPlans();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao substituir receita',
        variant: 'destructive',
      });
    }
  };

  if (patientsLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentPatient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Cardápio</h1>
        <p className="text-muted-foreground">
          Visualize seu plano alimentar semanal
        </p>
      </div>

      <Tabs defaultValue="atual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="atual" className="gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            Cardápio Atual
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="dicas" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Dicas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="atual" className="space-y-4">
          {activeMealPlan ? (
            <>
              {/* Meal Plan Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(activeMealPlan.startDate), "d 'de' MMMM", { locale: ptBR })} - 
                          {format(new Date(activeMealPlan.endDate), "d 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {activeMealPlan.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Obs:</strong> {activeMealPlan.notes}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Calendar with Substitution */}
              <WeeklyCalendar
                mealPlanRecipes={(activeMealPlan.recipes || []) as (MealPlanRecipe & { recipe: Recipe })[]}
                startDate={new Date(activeMealPlan.startDate)}
                onRecipeClick={handleRecipeClick}
                onSubstitute={handleSubstituteClick}
                showSubstituteButton={true}
              />

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Dica:</strong> Clique em "Substituir" em qualquer receita para ver 
                    opções alternativas aprovadas pela sua nutricionista.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum cardápio ativo</h3>
                <p className="text-muted-foreground">
                  Sua nutricionista ainda não criou um cardápio para você.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {pastMealPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sem histórico</h3>
                <p className="text-muted-foreground">
                  Você ainda não tem cardápios anteriores.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pastMealPlans.map(plan => {
                const statusInfo = MEAL_PLAN_STATUSES.find(s => s.value === plan.status) || MEAL_PLAN_STATUSES[0];
                return (
                  <Card key={plan.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {format(new Date(plan.startDate), "MMMM 'de' yyyy", { locale: ptBR })}
                        </CardTitle>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(plan.startDate), "d/MM/yyyy")} - 
                          {format(new Date(plan.endDate), "d/MM/yyyy")}
                        </span>
                        <span>•</span>
                        <span>{plan.recipes?.length || 0} receitas</span>
                      </div>
                      {plan.recipes && plan.recipes.length > 0 && (
                        <WeeklyCalendar
                          mealPlanRecipes={(plan.recipes || []) as (MealPlanRecipe & { recipe: Recipe })[]}
                          startDate={new Date(plan.startDate)}
                          onRecipeClick={handleRecipeClick}
                          compact
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dicas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Dicas de Nutrição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">🥗 Hidratação</h4>
                <p className="text-sm text-green-700">
                  Beba pelo menos 2 litros de água por dia. A hidratação adequada 
                  ajuda na digestão e absorção de nutrientes.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🍎 Frutas e Vegetais</h4>
                <p className="text-sm text-blue-700">
                  Inclua pelo menos 5 porções de frutas e vegetais por dia. 
                  Prefira os de época, que são mais frescos e nutritivos.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">🍽️ Porções</h4>
                <p className="text-sm text-purple-700">
                  Use pratos menores para controlar as porções naturalmente. 
                  Coma devagar e mastigue bem os alimentos.
                </p>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">⏰ Horários</h4>
                <p className="text-sm text-amber-700">
                  Mantenha horários regulares para as refeições. 
                  Não pule refeições para evitar compulsão alimentar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={!!viewingRecipe}
        onClose={() => setViewingRecipe(null)}
        recipe={viewingRecipe}
      />

      {/* Substitution Modal */}
      <SubstitutionModal
        open={!!substitutingRecipe}
        onClose={() => setSubstitutingRecipe(null)}
        currentRecipe={substitutingRecipe?.recipe || null}
        mealPlanRecipeId={substitutingRecipe?.mealPlanRecipeId || null}
        onSubstitute={handleSubstitute}
      />
    </div>
  );
}
