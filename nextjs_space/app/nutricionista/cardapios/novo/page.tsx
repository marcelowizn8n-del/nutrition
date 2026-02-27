'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  createMealPlan, 
  addRecipeToMealPlan,
  getPatients 
} from '@/lib/actions/nutrition-actions';
import { type Recipe, type MealType } from '@/lib/nutrition-types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format, addDays } from 'date-fns';

interface MealSlot {
  dayOfWeek: number;
  mealType: MealType;
  recipe: Recipe | null;
  tempId: string;
}

interface Patient {
  id: string;
  name: string;
  sex: string;
  birthYear: number;
}

export default function NewMealPlanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<MealSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const result = await getPatients();
      if (result.success && result.patients) {
        setPatients(result.patients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
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

    const filledSlots = slots.filter(s => s.recipe);
    if (filledSlots.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma receita ao cardápio',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create meal plan
      const planResult = await createMealPlan({
        patientId: selectedPatientId,
        startDate,
        endDate,
        notes: notes || undefined,
        status: 'DRAFT',
      });

      if (!planResult.success || !planResult.mealPlan) {
        throw new Error(planResult.error || 'Erro ao criar cardápio');
      }

      // Add recipes to meal plan
      for (const slot of filledSlots) {
        if (slot.recipe) {
          await addRecipeToMealPlan({
            mealPlanId: planResult.mealPlan.id,
            recipeId: slot.recipe.id,
            dayOfWeek: slot.dayOfWeek,
            mealType: slot.mealType,
          });
        }
      }

      toast({ title: 'Sucesso', description: 'Cardápio criado com sucesso!' });
      router.push(`/nutricionista/cardapios/${planResult.mealPlan.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar cardápio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/nutricionista/cardapios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Cardápio</h1>
          <p className="text-muted-foreground">Crie um cardápio personalizado para o paciente</p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="patient">Paciente *</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {loadingPatients ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : patients.length === 0 ? (
                    <SelectItem value="empty" disabled>Nenhum paciente cadastrado</SelectItem>
                  ) : (
                    patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))
                  )}
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
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o cardápio..."
                rows={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Plan Builder */}
      <MealPlanBuilder
        onChange={setSlots}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Link href="/nutricionista/cardapios">
          <Button variant="outline" disabled={isSubmitting}>
            Cancelar
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Salvar Cardápio
        </Button>
      </div>
    </div>
  );
}
