'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import TimelineSlider from '@/components/timeline-slider';
import ViewerLoader from '@/components/viewer-loader';
import { ClinicalMetrics, BodyComposition, ClinicalHistory } from '@/components/patient';
import { defaultMorphTargets } from '@/lib/types';
import { Loader2, TrendingUp, TrendingDown, ArrowLeft, Activity, Target, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function PacienteEvolucaoPage() {
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);

  const { patients, loading } = usePatientData();
  const patient = patients[0]; // Paciente logado
  const { minYear, maxYear, currentRecordData, changeFromBaseline } = useClinicalMetrics(patient, currentYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use current morph targets without simulation for patients
  const finalMorphTargets = useMemo(() => {
    if (!currentRecordData || !patient) return defaultMorphTargets;
    return currentRecordData.morphTargets ?? defaultMorphTargets;
  }, [currentRecordData, patient]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const weightChange = currentRecordData && patient?.records?.[0]
    ? currentRecordData.weightKg - patient.records[0].weightKg
    : 0;

  // Calculate BMI
  const bmi = currentRecordData 
    ? currentRecordData.weightKg / Math.pow(currentRecordData.heightCm / 100, 2) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/paciente">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Evolução</h1>
        <p className="text-gray-500">Acompanhe seu progresso ao longo do tempo</p>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Linha do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSlider
            minYear={minYear}
            maxYear={maxYear}
            currentYear={currentYear}
            onChange={setCurrentYear}
            records={patient?.records}
          />
        </CardContent>
      </Card>

      {/* Resumo da Evolução */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={weightChange < 0 ? 'bg-green-50 border-green-200' : weightChange > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {weightChange < 0 ? (
                <TrendingDown className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingUp className="w-8 h-8 text-orange-600" />
              )}
              <div>
                <p className="text-sm text-gray-600">Variação de Peso</p>
                <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Meta de Peso</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currentRecordData ? (currentRecordData.weightKg - 5).toFixed(0) : '--'} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Progresso para Meta</p>
              <Progress value={65} className="h-3" />
              <p className="text-sm text-gray-500 mt-1">65% concluído</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar 3D - Apenas visualização sem simulação */}
        <Card>
          <CardHeader>
            <CardTitle>Visualização 3D</CardTitle>
            <CardDescription>
              Baseado nos seus dados atuais
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ViewerLoader
              morphTargets={finalMorphTargets}
              sex={patient?.sex || 'F'}
              heightCm={currentRecordData?.heightCm || 164}
            />
          </CardContent>
        </Card>

        {/* Métricas e Composição Corporal */}
        <div className="space-y-4">
          {/* Métricas Principais */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Dados Atuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Peso</p>
                  <p className="text-2xl font-bold">{currentRecordData?.weightKg?.toFixed(1) || '--'} kg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Altura</p>
                  <p className="text-2xl font-bold">{currentRecordData?.heightCm || '--'} cm</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IMC</p>
                  <p className="text-2xl font-bold">{bmi.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cintura</p>
                  <p className="text-2xl font-bold">{currentRecordData?.waistCm || '--'} cm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ClinicalMetrics
            currentRecordData={currentRecordData}
            changeFromBaseline={changeFromBaseline}
            year={currentYear}
          />
          
          <BodyComposition currentRecordData={currentRecordData} />
        </div>
      </div>

      {/* Histórico Completo */}
      <ClinicalHistory
        records={patient?.records}
        currentYear={currentYear}
        onYearSelect={setCurrentYear}
      />
    </div>
  );
}
