'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Calendar, User, Loader2, Eye, Edit, Trash2, Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  getMealPlans, 
  deleteMealPlan,
} from '@/lib/actions/nutrition-actions';
import { 
  MEAL_PLAN_STATUSES, 
  type MealPlan,
} from '@/lib/nutrition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MealPlansPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPlan, setDeletingPlan] = useState<MealPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Filter meal plans based on search term
  const filteredMealPlans = mealPlans.filter(plan => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (plan.patient?.name || '').toLowerCase().includes(term) ||
      (plan.notes || '').toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    setLoading(true);
    try {
      const result = await getMealPlans();
      if (result.success && result.mealPlans) {
        setMealPlans(result.mealPlans as MealPlan[]);
      }
    } catch (error) {
      console.error('Error loading meal plans:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar cardápios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    
    try {
      const result = await deleteMealPlan(deletingPlan.id);
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Cardápio excluído com sucesso!' });
        loadMealPlans();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir cardápio',
        variant: 'destructive',
      });
    } finally {
      setDeletingPlan(null);
    }
  };

  const getStatusInfo = (status: string) => {
    return MEAL_PLAN_STATUSES.find(s => s.value === status) || MEAL_PLAN_STATUSES[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/nutricionista">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Cardápios</h1>
          <p className="text-muted-foreground">Gerencie os cardápios dos pacientes</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cardápio..."
              className="pl-10 w-64"
            />
          </div>
          <Link href="/nutricionista/cardapios/novo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cardápio
            </Button>
          </Link>
        </div>
      </div>

      {/* Meal Plans List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredMealPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum cardápio criado ainda</p>
            <Link href="/nutricionista/cardapios/novo">
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeiro cardápio
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMealPlans.map(plan => {
            const statusInfo = getStatusInfo(plan.status);
            return (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {plan.patient?.name || 'Paciente'}
                        </span>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(plan.startDate), "d 'de' MMMM", { locale: ptBR })} - 
                          {format(new Date(plan.endDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      {plan.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {plan.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {plan.recipes?.length || 0} receitas no cardápio
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/nutricionista/cardapios/${plan.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/nutricionista/cardapios/${plan.id}/editar`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingPlan(plan)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cardápio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cardápio?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
