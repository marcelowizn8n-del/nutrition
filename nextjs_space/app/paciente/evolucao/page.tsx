'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import TimelineSlider from '@/components/timeline-slider';
import ViewerLoader from '@/components/viewer-loader';
import { ClinicalMetrics, BodyComposition, ClinicalHistory } from '@/components/patient';
import { ClinicalToBodyMapper } from '@/lib/clinical-mapper';
import { defaultMorphTargets } from '@/lib/types';
import { Loader2, TrendingUp, TrendingDown, ArrowLeft, Activity, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function PacienteEvolucaoPage() {
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const [targetWeight, setTargetWeight] = useState(0);

  const { patients, loading } = usePatientData();
  const patient = patients[0]; // Paciente logado
  const { minYear, maxYear, currentRecordData, changeFromBaseline } = useClinicalMetrics(patient, currentYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dados do ano de comparação
  const comparisonRecord = useMemo(() => {
    if (!patient?.records || !comparisonYear) return null;
    return patient.records.find(r => r.year === comparisonYear);
  }, [patient, comparisonYear]);

  // Morph targets para simulação de meta
  const finalMorphTargets = useMemo(() => {
    if (!currentRecordData || !patient) return defaultMorphTargets;
    if (!simulationMode) return currentRecordData.morphTargets ?? defaultMorphTargets;

    const age = new Date().getFullYear() - patient.birthYear;
    const simulatedWeight = currentRecordData.weightKg + targetWeight;

    return ClinicalToBodyMapper.calculate({
      heightCm: currentRecordData.heightCm,
      weightKg: simulatedWeight,
      age,
      sex: patient.sex as 'M' | 'F',
      diseaseCodes: currentRecordData.diseaseCodes || [],
      waistCm: currentRecordData.waistCm,
      physicalActivityLevel: currentRecordData.physicalActivityLevel,
    });
  }, [currentRecordData, patient, simulationMode, targetWeight]);

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
        {/* Avatar 3D com Simulação */}
        <Card>
          <CardHeader>
            <CardTitle>Visualização 3D</CardTitle>
            <CardDescription>
              {simulationMode ? 'Simulando meta de peso' : 'Baseado nos dados atuais'}
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

        {/* Simulação de Meta */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" />
                Simule Sua Meta
              </CardTitle>
              <CardDescription>
                Veja como você ficaria ao atingir seu peso ideal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ajuste de Peso</label>
                <div className="flex items-center gap-4 mt-2">
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="0.5"
                    value={targetWeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTargetWeight(val);
                      setSimulationMode(val !== 0);
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-20 text-right">
                    {targetWeight > 0 ? '+' : ''}{targetWeight.toFixed(1)} kg
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-800">Peso Atual:</span>
                  <span className="font-medium">{currentRecordData?.weightKg?.toFixed(1) || '--'} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-800">Peso Simulado:</span>
                  <span className="font-bold text-blue-700">
                    {currentRecordData ? (currentRecordData.weightKg + targetWeight).toFixed(1) : '--'} kg
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setTargetWeight(0);
                  setSimulationMode(false);
                }}
                disabled={!simulationMode}
                className="w-full"
              >
                Resetar Simulação
              </Button>
            </CardContent>
          </Card>

          <ClinicalMetrics
            currentRecordData={currentRecordData}
            changeFromBaseline={changeFromBaseline}
            year={currentYear}
          />
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
