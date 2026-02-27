'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { MealPlanBuilder } from '@/components/nutrition';
import { 
  getMealPlan,
  updateMealPlan,
  addRecipeToMealPlan,
  removeRecipeFromMealPlan,
  getPatients 
} from '@/lib/actions/nutrition-actions';
import { 
  MEAL_PLAN_STATUSES,
  type Recipe, 
  type MealType,
  type MealPlanStatus,
  type NutritionalInfo,
  type Ingredient
} from '@/lib/nutrition-types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';

interface MealSlot {
  dayOfWeek: number;
  mealType: MealType;
  recipe: Recipe | null;
  tempId: string;
  existingId?: string;
}

interface Patient {
  id: string;
  name: string;
  sex: string;
  birthYear: number;
}

export default function EditMealPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<MealPlanStatus>('DRAFT');
  const [slots, setSlots] = useState<MealSlot[]>([]);
  const [initialSlots, setInitialSlots] = useState<MealSlot[]>([]);
  const [originalRecipeIds, setOriginalRecipeIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [patientsResult, planResult] = await Promise.all([
        getPatients(),
        getMealPlan(params.id as string),
      ]);

      if (patientsResult.success && patientsResult.patients) {
        setPatients(patientsResult.patients);
      }

      if (planResult.success && planResult.mealPlan) {
        const plan = planResult.mealPlan;
        setSelectedPatientId(plan.patientId);
        setStartDate(format(new Date(plan.startDate), 'yyyy-MM-dd'));
        setEndDate(format(new Date(plan.endDate), 'yyyy-MM-dd'));
        setNotes(plan.notes || '');
        setStatus(plan.status as MealPlanStatus);

        // Convert existing recipes to slots
        const existingSlots: MealSlot[] = (plan.recipes || []).map((mpr: Record<string, unknown>) => {
          const recipe = mpr.recipe as Record<string, unknown>;
          const ingredients: Ingredient[] = typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients as string) 
            : (recipe.ingredients as Ingredient[]);
          const nutritionalInfo: NutritionalInfo = typeof recipe.nutritionalInfo === 'string'
            ? JSON.parse(recipe.nutritionalInfo as string)
            : (recipe.nutritionalInfo as NutritionalInfo);
          
          return {
            dayOfWeek: mpr.dayOfWeek as number,
            mealType: mpr.mealType as MealType,
            recipe: {
              ...recipe,
              ingredients,
              nutritionalInfo,
            } as unknown as Recipe,
            tempId: mpr.id as string,
            existingId: mpr.id as string,
          };
        });

        setInitialSlots(existingSlots);
        setSlots(existingSlots);
        setOriginalRecipeIds(new Set(existingSlots.map(s => s.existingId!)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update meal plan info
      const planResult = await updateMealPlan(params.id as string, {
        patientId: selectedPatientId,
        startDate,
        endDate,
        notes: notes || undefined,
        status,
      });

      if (!planResult.success) {
        throw new Error(planResult.error || 'Erro ao atualizar cardápio');
      }

      // Find removed and new slots
      const currentSlotIds = new Set(slots.filter(s => s.existingId).map(s => s.existingId!));
      const removedIds = [...originalRecipeIds].filter(id => !currentSlotIds.has(id));
      const newSlots = slots.filter(s => !s.existingId && s.recipe);

      // Remove deleted recipes
      for (const id of removedIds) {
        await removeRecipeFromMealPlan(id, params.id as string);
      }

      // Add new recipes
      for (const slot of newSlots) {
        if (slot.recipe) {
          await addRecipeToMealPlan({
            mealPlanId: params.id as string,
            recipeId: slot.recipe.id,
            dayOfWeek: slot.dayOfWeek,
            mealType: slot.mealType,
          });
        }
      }

      toast({ title: 'Sucesso', description: 'Cardápio atualizado com sucesso!' });
      router.push(`/nutricionista/cardapios/${params.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar cardápio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/nutricionista/cardapios/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Cardápio</h1>
          <p className="text-muted-foreground">Atualize o cardápio do paciente</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="patient">Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Data Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MealPlanStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_PLAN_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Plan Builder */}
      <MealPlanBuilder
        initialSlots={initialSlots}
        onChange={setSlots}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Link href={`/nutricionista/cardapios/${params.id}`}>
          <Button variant="outline" disabled={isSubmitting}>
            Cancelar
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
