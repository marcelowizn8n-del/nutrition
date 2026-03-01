'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Scale, Ruler, Activity, Droplets, Target } from 'lucide-react';

interface BodyMetrics {
  weight: number;
  height: number;
  waistCircumference?: number;
  muscleMass?: number;
  bodyFat?: number;
  waterPercentage?: number;
  visceralFat?: number;
  boneMass?: number;
  metabolicAge?: number;
}

interface BodyMetricsFormProps {
  initialData?: Partial<BodyMetrics>;
  onSubmit: (data: BodyMetrics) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}

export default function BodyMetricsForm({
  initialData,
  onSubmit,
  loading = false,
  readOnly = false,
}: BodyMetricsFormProps) {
  const [formData, setFormData] = useState<BodyMetrics>({
    weight: initialData?.weight || 0,
    height: initialData?.height || 0,
    waistCircumference: initialData?.waistCircumference,
    muscleMass: initialData?.muscleMass,
    bodyFat: initialData?.bodyFat,
    waterPercentage: initialData?.waterPercentage,
    visceralFat: initialData?.visceralFat,
    boneMass: initialData?.boneMass,
    metabolicAge: initialData?.metabolicAge,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof BodyMetrics, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  // Calculate BMI
  const bmi = formData.weight && formData.height 
    ? formData.weight / Math.pow(formData.height / 100, 2) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Dados Corporais
        </CardTitle>
        <CardDescription>
          Medições de composição corporal e antropometria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Métricas Básicas */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Métricas Básicas
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  disabled={readOnly}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm) *</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={formData.height || ''}
                  onChange={(e) => handleChange('height', e.target.value)}
                  disabled={readOnly}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>IMC</Label>
                <div className="h-10 flex items-center px-3 bg-gray-100 rounded-md font-medium">
                  {bmi ? bmi.toFixed(1) : '--'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waistCircumference">Cintura (cm)</Label>
                <Input
                  id="waistCircumference"
                  type="number"
                  step="0.1"
                  value={formData.waistCircumference || ''}
                  onChange={(e) => handleChange('waistCircumference', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Composição Corporal */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Composição Corporal (Bioimpedância)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="muscleMass">Massa Muscular (%)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  value={formData.muscleMass || ''}
                  onChange={(e) => handleChange('muscleMass', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 35.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyFat">Gordura Corporal (%)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  value={formData.bodyFat || ''}
                  onChange={(e) => handleChange('bodyFat', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 25.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waterPercentage" className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  Água Corporal (%)
                </Label>
                <Input
                  id="waterPercentage"
                  type="number"
                  step="0.1"
                  value={formData.waterPercentage || ''}
                  onChange={(e) => handleChange('waterPercentage', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 55.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visceralFat">Gordura Visceral</Label>
                <Input
                  id="visceralFat"
                  type="number"
                  step="1"
                  value={formData.visceralFat || ''}
                  onChange={(e) => handleChange('visceralFat', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boneMass">Massa Óssea (kg)</Label>
                <Input
                  id="boneMass"
                  type="number"
                  step="0.1"
                  value={formData.boneMass || ''}
                  onChange={(e) => handleChange('boneMass', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 3.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metabolicAge" className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Idade Metabólica
                </Label>
                <Input
                  id="metabolicAge"
                  type="number"
                  step="1"
                  value={formData.metabolicAge || ''}
                  onChange={(e) => handleChange('metabolicAge', e.target.value)}
                  disabled={readOnly}
                  placeholder="Ex: 45"
                />
              </div>
            </div>
          </div>

          {!readOnly && (
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar Medições'
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
