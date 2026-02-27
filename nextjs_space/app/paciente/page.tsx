'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import ViewerLoader from '@/components/viewer-loader';
import { ClinicalMetrics, BodyComposition, ClinicalHistory } from '@/components/patient';
import { defaultMorphTargets } from '@/lib/types';
import { Loader2, Heart, Utensils, Calendar, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function PacienteDashboard() {
  const [mounted, setMounted] = useState(false);
  const [currentYear] = useState(2024);

  const { patients, selectedPatient, loading } = usePatientData();

  // Para o paciente, sempre mostramos o primeiro paciente (simulação de paciente logado)
  const patient = patients[0];
  const { currentRecordData, changeFromBaseline } = useClinicalMetrics(patient, currentYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const morphTargets = currentRecordData?.morphTargets ?? defaultMorphTargets;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {patient?.name?.split(' ')[0] || 'Paciente'}! 👋</h1>
        <p className="text-gray-500">Acompanhe sua evolução e mantenha-se saudável</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Saúde Geral</p>
                <p className="text-2xl font-bold text-green-700">Boa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Meta de Peso</p>
                <p className="text-2xl font-bold text-blue-700">
                  {currentRecordData ? `${(currentRecordData.weightKg - 5).toFixed(0)} kg` : '--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Progresso</p>
                <p className="text-2xl font-bold text-purple-700">65%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar 3D */}
        <Card>
          <CardHeader>
            <CardTitle>Seu Avatar Digital</CardTitle>
            <CardDescription>Visualização 3D baseada nos seus dados clínicos</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ViewerLoader
              morphTargets={morphTargets}
              sex={patient?.sex || 'F'}
              heightCm={currentRecordData?.heightCm || 164}
            />
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="space-y-4">
          <ClinicalMetrics
            currentRecordData={currentRecordData}
            changeFromBaseline={changeFromBaseline}
            year={currentYear}
          />
          <BodyComposition currentRecordData={currentRecordData} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/paciente/cardapio">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Utensils className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">Meu Cardápio</p>
                  <p className="text-sm text-gray-500">Veja suas refeições de hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/paciente/agenda">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-full">
                  <Calendar className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <p className="font-semibold">Minha Agenda</p>
                  <p className="text-sm text-gray-500">Próxima consulta: 15/03/2026</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Histórico */}
      <ClinicalHistory
        records={patient?.records}
        currentYear={currentYear}
        onYearSelect={() => {}}
      />
    </div>
  );
}
