'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface PatientFormData {
  name: string;
  email: string;
  sex: string;
  birthDate: string;
  phone: string;
  cpf: string;
  // Body metrics
  height: string;
  weight: string;
  muscleMass: string;
  bodyFat: string;
  waterPercentage: string;
  visceralFat: string;
  waistCircumference: string;
}

interface PatientFormProps {
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<PatientFormData>;
  loading?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
}

export default function PatientForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  error = null,
  mode = 'create',
}: PatientFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    sex: initialData?.sex || '',
    birthDate: initialData?.birthDate || '',
    phone: initialData?.phone || '',
    cpf: initialData?.cpf || '',
    height: initialData?.height || '',
    weight: initialData?.weight || '',
    muscleMass: initialData?.muscleMass || '',
    bodyFat: initialData?.bodyFat || '',
    waterPercentage: initialData?.waterPercentage || '',
    visceralFat: initialData?.visceralFat || '',
    waistCircumference: initialData?.waistCircumference || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informações básicas do paciente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Ex: maria@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo *</Label>
              <Select value={formData.sex} onValueChange={(value) => handleChange('sex', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados Corporais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Corporais</CardTitle>
          <CardDescription>Medições e composição corporal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm) *</Label>
              <Input
                id="height"
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="Ex: 170"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="Ex: 70.5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waistCircumference">Cintura (cm)</Label>
              <Input
                id="waistCircumference"
                type="number"
                step="0.1"
                value={formData.waistCircumference}
                onChange={(e) => handleChange('waistCircumference', e.target.value)}
                placeholder="Ex: 80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="muscleMass">Massa Muscular (%)</Label>
              <Input
                id="muscleMass"
                type="number"
                step="0.1"
                value={formData.muscleMass}
                onChange={(e) => handleChange('muscleMass', e.target.value)}
                placeholder="Ex: 35.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bodyFat">Gordura Corporal (%)</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                value={formData.bodyFat}
                onChange={(e) => handleChange('bodyFat', e.target.value)}
                placeholder="Ex: 25.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterPercentage">Água Corporal (%)</Label>
              <Input
                id="waterPercentage"
                type="number"
                step="0.1"
                value={formData.waterPercentage}
                onChange={(e) => handleChange('waterPercentage', e.target.value)}
                placeholder="Ex: 55.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visceralFat">Gordura Visceral</Label>
              <Input
                id="visceralFat"
                type="number"
                step="1"
                value={formData.visceralFat}
                onChange={(e) => handleChange('visceralFat', e.target.value)}
                placeholder="Ex: 8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            mode === 'create' ? 'Adicionar Paciente' : 'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  );
}
