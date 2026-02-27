'use client';

import { Scale, Activity, Zap, Ruler, Droplets, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MorphTargets } from '@/lib/types';

interface AvatarImpactProps {
  morphTargets: MorphTargets;
}

export default function AvatarImpact({ morphTargets }: AvatarImpactProps) {
  const metrics = [
    { key: 'Weight', label: 'Distribuição de Massa', icon: Scale, color: 'blue' },
    { key: 'AbdomenGirth', label: 'Circunferência Abdominal', icon: Activity, color: 'orange' },
    { key: 'MuscleMass', label: 'Massa Muscular', icon: Zap, color: 'green' },
    { key: 'Posture', label: 'Postura', icon: Ruler, color: 'purple' },
  ] as const;

  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    orange: '#f97316',
    green: '#22c55e',
    purple: '#8b5cf6',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Impacto no Avatar 3D</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Icon className={`w-4 h-4 text-${color}-600`} />
                {label}
              </span>
              <span className="font-medium">
                {((morphTargets[key as keyof MorphTargets] ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(morphTargets[key as keyof MorphTargets] ?? 0) * 100}%`,
                  backgroundColor: colorMap[color],
                }}
              />
            </div>
          </div>
        ))}

        {(morphTargets.DiabetesEffect > 0 || morphTargets.HypertensionEffect > 0 || morphTargets.HeartDiseaseEffect > 0) && (
          <div className="pt-2 border-t mt-2">
            <p className="text-xs text-gray-500 mb-2">Efeitos de Condições Clínicas:</p>
            {morphTargets.DiabetesEffect > 0 && (
              <Badge variant="outline" className="mr-1 mb-1 text-xs">
                <Droplets className="w-3 h-3 mr-1" />
                Diabetes: {(morphTargets.DiabetesEffect * 100).toFixed(0)}%
              </Badge>
            )}
            {morphTargets.HypertensionEffect > 0 && (
              <Badge variant="outline" className="mr-1 mb-1 text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Hipertensão: {(morphTargets.HypertensionEffect * 100).toFixed(0)}%
              </Badge>
            )}
            {morphTargets.HeartDiseaseEffect > 0 && (
              <Badge variant="outline" className="mr-1 mb-1 text-xs">
                <Heart className="w-3 h-3 mr-1" />
                Cardiopatia: {(morphTargets.HeartDiseaseEffect * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
