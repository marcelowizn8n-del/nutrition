'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { 
  RECIPE_CATEGORIES, 
  type RecipeFormData, 
  type Recipe,
  type Ingredient,
  type NutritionalInfo,
  type RecipeCategory 
} from '@/lib/nutrition-types';

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: RecipeFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const emptyIngredient: Ingredient = { name: '', quantity: '', unit: '' };

const emptyNutritionalInfo: NutritionalInfo = {
  calories: 0,
  proteins: 0,
  carbs: 0,
  fats: 0,
  fiber: 0,
};

export function RecipeForm({ recipe, onSubmit, onCancel, isLoading }: RecipeFormProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [instructions, setInstructions] = useState(recipe?.instructions || '');
  const [category, setCategory] = useState<RecipeCategory>(recipe?.category || 'LUNCH');
  const [prepTime, setPrepTime] = useState(recipe?.prepTime || 30);
  const [servings, setServings] = useState(recipe?.servings || 2);
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length ? recipe.ingredients : [{ ...emptyIngredient }]
  );
  const [nutritionalInfo, setNutritionalInfo] = useState<NutritionalInfo>(
    recipe?.nutritionalInfo || { ...emptyNutritionalInfo }
  );

  const addIngredient = () => {
    setIngredients([...ingredients, { ...emptyIngredient }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: RecipeFormData = {
      name,
      description: description || undefined,
      instructions,
      category,
      prepTime,
      servings,
      imageUrl: imageUrl || undefined,
      ingredients: ingredients.filter(i => i.name.trim()),
      nutritionalInfo,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Receita *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Frango Grelhado com Legumes"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve descrição da receita..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as RecipeCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepTime">Tempo (min) *</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min={1}
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="servings">Porções *</Label>
                <Input
                  id="servings"
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Nutritional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Nutricionais (por porção)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calories">Calorias (kcal) *</Label>
                <Input
                  id="calories"
                  type="number"
                  min={0}
                  value={nutritionalInfo.calories}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, calories: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="proteins">Proteínas (g) *</Label>
                <Input
                  id="proteins"
                  type="number"
                  min={0}
                  step={0.1}
                  value={nutritionalInfo.proteins}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, proteins: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="carbs">Carboidratos (g) *</Label>
                <Input
                  id="carbs"
                  type="number"
                  min={0}
                  step={0.1}
                  value={nutritionalInfo.carbs}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, carbs: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="fats">Gorduras (g) *</Label>
                <Input
                  id="fats"
                  type="number"
                  min={0}
                  step={0.1}
                  value={nutritionalInfo.fats}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, fats: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="fiber">Fibras (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  min={0}
                  step={0.1}
                  value={nutritionalInfo.fiber || 0}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, fiber: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingredients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ingredientes</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Quantidade"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Unidade (g, ml, xícara)"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  className="w-32"
                />
                <Input
                  placeholder="Ingrediente"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  className="flex-1"
                />
                {ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modo de Preparo</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Descreva o passo a passo do preparo..."
            rows={6}
            required
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-1" /> {recipe ? 'Atualizar' : 'Salvar'} Receita
        </Button>
      </div>
    </form>
  );
}
