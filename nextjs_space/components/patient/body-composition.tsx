'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicalRecord } from '@/lib/types';

interface BodyCompositionProps {
  currentRecordData: ClinicalRecord | null;
}

export default function BodyComposition({ currentRecordData }: BodyCompositionProps) {
  if (!currentRecordData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Bioimpedância Estimada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentRecordData.bioImpedanceFat ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg text-center">
                <span className="text-sm text-indigo-600 block mb-1">Gordura Corporal</span>
                <span className="text-xl font-bold">{currentRecordData.bioImpedanceFat.toFixed(1)}%</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <span className="text-sm text-blue-600 block mb-1">Massa Muscular</span>
                <span className="text-xl font-bold">{currentRecordData.bioImpedanceMuscle?.toFixed(1)}%</span>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg text-center">
                <span className="text-sm text-cyan-600 block mb-1">Água Corporal</span>
                <span className="text-xl font-bold">{currentRecordData.bioImpedanceWater?.toFixed(1)}%</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <span className="text-sm text-orange-600 block mb-1">Gordura Visceral</span>
                <span className="text-xl font-bold">{currentRecordData.bioImpedanceVisceral?.toFixed(0)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-500">Massa Óssea: {currentRecordData.bioImpedanceBone?.toFixed(1)} kg</span>
              <span className="text-gray-500">Idade Metabólica: {currentRecordData.bioImpedanceMetabolicAge} anos</span>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-400">
            Sem dados de bioimpedância para este registro.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
