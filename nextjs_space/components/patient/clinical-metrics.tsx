'use client';

import { Scale, Ruler, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicalRecord } from '@/lib/types';

interface ClinicalMetricsProps {
  currentRecordData: ClinicalRecord | null;
  changeFromBaseline: { weightKg: number; weightPct: number } | null;
  year: number;
}

export default function ClinicalMetrics({
  currentRecordData,
  changeFromBaseline,
  year,
}: ClinicalMetricsProps) {
  if (!currentRecordData) return null;

  const bmi = currentRecordData.weightKg / Math.pow(currentRecordData.heightCm / 100, 2);
  const bmiCategory = bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidade';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Métricas Atuais ({year})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Peso</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{currentRecordData.weightKg?.toFixed(1) ?? '--'} kg</div>
            {changeFromBaseline && (
              <div className={`text-sm flex items-center gap-1 justify-end ${
                changeFromBaseline.weightKg > 0 ? 'text-red-600' :
                changeFromBaseline.weightKg < 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {changeFromBaseline.weightKg > 0 ? <TrendingUp className="w-4 h-4" /> :
                  changeFromBaseline.weightKg < 0 ? <TrendingDown className="w-4 h-4" /> :
                  <Minus className="w-4 h-4" />}
                {changeFromBaseline.weightKg > 0 ? '+' : ''}{changeFromBaseline.weightKg.toFixed(1)} kg
                ({changeFromBaseline.weightPct > 0 ? '+' : ''}{changeFromBaseline.weightPct.toFixed(1)}%)
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-green-600" />
            <span className="font-medium">Altura</span>
          </div>
          <div className="text-xl font-bold">{currentRecordData.heightCm?.toFixed(0) ?? '--'} cm</div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span className="font-medium">IMC</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{bmi.toFixed(1)}</div>
            <div className="text-sm text-gray-500">{bmiCategory}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
