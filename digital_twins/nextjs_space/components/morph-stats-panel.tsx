'use client';

import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MorphTargets } from '@/lib/clinical-mapper';

interface MorphStatsPanelProps {
  morphTargets: MorphTargets;
  previousTargets?: MorphTargets;
}

const morphLabels: Record<keyof MorphTargets, { label: string; description: string }> = {
  Weight: { label: 'Peso', description: 'Índice de massa corporal normalizado' },
  AbdomenGirth: { label: 'Circunf. Abdominal', description: 'Gordura visceral e abdominal' },
  MuscleMass: { label: 'Massa Muscular', description: 'Volume muscular dos membros' },
  Posture: { label: 'Postura', description: 'Curvatura da coluna e ombros' },
  DiabetesEffect: { label: 'Efeito Diabetes', description: 'Alterações metabólicas' },
  HeartDiseaseEffect: { label: 'Efeito Cardíaco', description: 'Condição cardiovascular' },
  HypertensionEffect: { label: 'Efeito Hipertensão', description: 'Pressão arterial elevada' },
};

export default function MorphStatsPanel({ morphTargets, previousTargets }: MorphStatsPanelProps) {
  const getTrend = (key: keyof MorphTargets) => {
    if (!previousTargets) return null;
    const diff = (morphTargets?.[key] ?? 0) - (previousTargets?.[key] ?? 0);
    if (Math.abs(diff) < 0.01) return <Minus className="w-4 h-4 text-slate-400" />;
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    return <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        Parâmetros Morfológicos
      </h3>

      <div className="space-y-3">
        {(Object.entries(morphLabels) as [keyof MorphTargets, typeof morphLabels[keyof MorphTargets]][]).map(
          ([key, { label, description }]) => {
            const value = morphTargets?.[key] ?? 0;
            const percentage = value * 100;

            return (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    {getTrend(key)}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">{description}</p>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
