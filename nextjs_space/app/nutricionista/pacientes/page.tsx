'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import PatientSelector from '@/components/patient-selector';
import TimelineSlider from '@/components/timeline-slider';
import ViewerLoader from '@/components/viewer-loader';
import {
  ClinicalMetrics,
  BodyComposition,
  AvatarImpact,
  ClinicalHistory,
} from '@/components/patient';
import { ClinicalToBodyMapper } from '@/lib/clinical-mapper';
import { defaultMorphTargets, diseaseNames, MorphTargets } from '@/lib/types';
import { Loader2, AlertCircle, Activity, ArrowLeft, Utensils, Target, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function NutricionistaPacientesPage() {
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [activeTab, setActiveTab] = useState('perfil');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedWeight, setSimulatedWeight] = useState(0);

  const { patients, selectedPatient, selectedPatientId, setSelectedPatientId, loading, error } = usePatientData();
  const { minYear, maxYear, currentRecordData, changeFromBaseline } = useClinicalMetrics(selectedPatient, currentYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedPatient?.records?.length) {
      const lastRecord = selectedPatient.records[selectedPatient.records.length - 1];
      setCurrentYear(lastRecord.year);
    }
  }, [selectedPatientId, selectedPatient]);

  useEffect(() => {
    setSimulationMode(false);
    setSimulatedWeight(0);
  }, [selectedPatientId]);

  const finalMorphTargets = useMemo(() => {
    if (!currentRecordData || !selectedPatient) return defaultMorphTargets;
    if (!simulationMode) return currentRecordData.morphTargets ?? defaultMorphTargets;

    const currentWeight = currentRecordData.weightKg;
    const simulatedNewWeight = currentWeight * (1 + simulatedWeight);
    const age = new Date().getFullYear() - selectedPatient.birthYear;

    return ClinicalToBodyMapper.calculate({
      heightCm: currentRecordData.heightCm,
      weightKg: simulatedNewWeight,
      age,
      sex: selectedPatient.sex as 'M' | 'F',
      diseaseCodes: currentRecordData.diseaseCodes || [],
      waistCm: currentRecordData.waistCm,
      physicalActivityLevel: currentRecordData.physicalActivityLevel,
    });
  }, [currentRecordData, selectedPatient, simulationMode, simulatedWeight]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Carregando dados dos pacientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-800 font-medium max-w-md break-words">{error}</p>
        </div>
      </div>
    );
  }

  const currentAge = selectedPatient ? new Date().getFullYear() - selectedPatient.birthYear : 0;

  // Cálculo de IMC
  const bmi = currentRecordData ? currentRecordData.weightKg / Math.pow(currentRecordData.heightCm / 100, 2) : 0;
  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Peso normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' };
    return { label: 'Obesidade', color: 'text-red-600' };
  };
  const bmiCategory = getBmiCategory(bmi);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/nutricionista">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500">Visualize perfil nutricional e composição corporal</p>
        </div>
      </div>

      {/* Patient Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <PatientSelector
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
            />
            {selectedPatient && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{selectedPatient.sex === 'M' ? 'Masculino' : 'Feminino'}</span>
                  <span className="text-slate-300">•</span>
                  <span>{currentAge} anos</span>
                </div>
                <Badge variant="outline" className={bmiCategory.color}>
                  IMC: {bmi.toFixed(1)} - {bmiCategory.label}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="perfil" className="flex-1">Perfil Nutricional</TabsTrigger>
              <TabsTrigger value="simulacao" className="flex-1">Simulação</TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="space-y-4 mt-4">
              {/* Métricas principais */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Métricas Atuais
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
                      <p className={`text-2xl font-bold ${bmiCategory.color}`}>{bmi.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cintura</p>
                      <p className="text-2xl font-bold">{currentRecordData?.waistCm || '--'} cm</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <BodyComposition currentRecordData={currentRecordData} />
              <AvatarImpact morphTargets={finalMorphTargets} />
            </TabsContent>

            <TabsContent value="simulacao" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Simulação de Meta
                  </CardTitle>
                  <CardDescription>
                    Visualize como o paciente ficaria ao atingir metas de peso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Peso Alvo</label>
                    <div className="flex items-center gap-4 mt-2">
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="1"
                        value={simulatedWeight * 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100;
                          setSimulatedWeight(val);
                          setSimulationMode(val !== 0);
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-24 text-right">
                        {currentRecordData ? ((currentRecordData.weightKg * (1 + simulatedWeight)).toFixed(1)) : '--'} kg
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Variação: {(simulatedWeight * 100).toFixed(0)}%
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Novo IMC estimado:</strong>{' '}
                      {currentRecordData
                        ? (currentRecordData.weightKg * (1 + simulatedWeight) / Math.pow(currentRecordData.heightCm / 100, 2)).toFixed(1)
                        : '--'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSimulatedWeight(0);
                      setSimulationMode(false);
                    }}
                    disabled={!simulationMode}
                    className="w-full"
                  >
                    Resetar Simulação
                  </Button>
                </CardContent>
              </Card>

              {/* Ação Rápida */}
              <Card>
                <CardContent className="pt-6">
                  <Button asChild className="w-full">
                    <Link href="/nutricionista/cardapios/novo">
                      <Utensils className="w-4 h-4 mr-2" />
                      Criar Cardápio para {selectedPatient?.name?.split(' ')[0] || 'Paciente'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna central - Visualizador 3D */}
        <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
          <ViewerLoader
            morphTargets={finalMorphTargets}
            sex={selectedPatient?.sex || 'F'}
            heightCm={currentRecordData?.heightCm || 164}
          />
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/nutricionista/cardapios">
                  <Utensils className="w-4 h-4 mr-2" /> Ver Cardápios
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/nutricionista/receitas">
                  <Utensils className="w-4 h-4 mr-2" /> Biblioteca de Receitas
                </Link>
              </Button>
            </CardContent>
          </Card>

          <ClinicalHistory
            records={selectedPatient?.records}
            currentYear={currentYear}
            onYearSelect={setCurrentYear}
          />
        </div>
      </div>
    </div>
  );
}
