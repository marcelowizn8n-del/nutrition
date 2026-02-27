'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Search, Loader2 } from 'lucide-react';
import { RecipeCard, RecipeForm, RecipeDetailModal } from '@/components/nutrition';
import { 
  getRecipes, 
  createRecipe, 
  updateRecipe, 
  deleteRecipe 
} from '@/lib/actions/nutrition-actions';
import { 
  RECIPE_CATEGORIES, 
  type Recipe, 
  type RecipeFormData,
  type RecipeCategory,
  type NutritionalInfo,
  type Ingredient
} from '@/lib/nutrition-types';
import { useToast } from '@/hooks/use-toast';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | 'ALL'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
  }, [search, categoryFilter]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const result = await getRecipes({
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search: search || undefined,
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
      toast({
        title: 'Erro',
        description: 'Erro ao carregar receitas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: RecipeFormData) => {
    setIsSubmitting(true);
    try {
      if (editingRecipe) {
        const result = await updateRecipe(editingRecipe.id, data);
        if (result.success) {
          toast({ title: 'Sucesso', description: 'Receita atualizada com sucesso!' });
        } else {
          throw new Error(result.error);
        }
      } else {
        const result = await createRecipe(data);
        if (result.success) {
          toast({ title: 'Sucesso', description: 'Receita criada com sucesso!' });
        } else {
          throw new Error(result.error);
        }
      }
      setIsFormOpen(false);
      setEditingRecipe(undefined);
      loadRecipes();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar receita',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecipe) return;
    
    try {
      const result = await deleteRecipe(deletingRecipe.id);
      if (result.success) {
        toast({ title: 'Sucesso', description: 'Receita excluída com sucesso!' });
        loadRecipes();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir receita',
        variant: 'destructive',
      });
    } finally {
      setDeletingRecipe(null);
    }
  };

  const openEditForm = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingRecipe(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca de Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas para os cardápios</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar receitas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={categoryFilter} 
              onValueChange={(v) => setCategoryFilter(v as RecipeCategory | 'ALL')}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
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
        </CardContent>
      </Card>

      {/* Recipe Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : recipes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma receita encontrada</p>
            <Button variant="outline" onClick={openNewForm}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira receita
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onView={setViewingRecipe}
              onEdit={openEditForm}
              onDelete={setDeletingRecipe}
            />
          ))}
        </div>
      )}

      {/* Recipe Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecipe ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
          </DialogHeader>
          <RecipeForm
            recipe={editingRecipe}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        open={!!viewingRecipe}
        onClose={() => setViewingRecipe(null)}
        recipe={viewingRecipe}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRecipe} onOpenChange={() => setDeletingRecipe(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a receita "{deletingRecipe?.name}"?
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
