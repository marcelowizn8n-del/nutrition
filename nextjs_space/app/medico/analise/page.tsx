'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import PatientSelector from '@/components/patient-selector';
import ViewerLoader from '@/components/viewer-loader';
import MetabolicRiskPanel from '@/components/metabolic-risk-panel';
import WhatIfSimulator from '@/components/what-if-simulator';
import {
  ClinicalMetrics,
  BodyComposition,
  AvatarImpact,
} from '@/components/patient';
import { ClinicalToBodyMapper } from '@/lib/clinical-mapper';
import { defaultMorphTargets, diseaseNames } from '@/lib/types';
import { Loader2, AlertCircle, ArrowLeft, Stethoscope, Activity, Brain, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MedicoAnalisePage() {
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [activeTab, setActiveTab] = useState('risco');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedWeight, setSimulatedWeight] = useState(0);
  const [simulatedAbdomen, setSimulatedAbdomen] = useState(0);
  const [simulatedActivityLevel, setSimulatedActivityLevel] = useState<string | null>(null);

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
    setSimulatedAbdomen(0);
    setSimulatedActivityLevel(null);
  }, [selectedPatientId]);

  const finalMorphTargets = useMemo(() => {
    if (!currentRecordData || !selectedPatient) return defaultMorphTargets;
    if (!simulationMode) return currentRecordData.morphTargets ?? defaultMorphTargets;

    const currentWeight = currentRecordData.weightKg;
    const currentWaist = currentRecordData.waistCm;
    const simulatedNewWeight = currentWeight * (1 + simulatedWeight);
    const simulatedNewWaist = currentWaist ? currentWaist * (1 + simulatedAbdomen) : undefined;
    const age = new Date().getFullYear() - selectedPatient.birthYear;

    const mappedActivityLevel = (() => {
      const raw = simulatedActivityLevel ?? currentRecordData.physicalActivityLevel ?? 'moderate';
      switch (raw) {
        case 'inactive': return 'sedentary';
        case 'high': return 'very_active';
        default: return raw;
      }
    })();

    return ClinicalToBodyMapper.calculate({
      heightCm: currentRecordData.heightCm,
      weightKg: simulatedNewWeight,
      age,
      sex: selectedPatient.sex as 'M' | 'F',
      diseaseCodes: currentRecordData.diseaseCodes || [],
      waistCm: simulatedNewWaist,
      physicalActivityLevel: mappedActivityLevel,
    });
  }, [currentRecordData, selectedPatient, simulationMode, simulatedWeight, simulatedAbdomen, simulatedActivityLevel]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Carregando dados clínicos...</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/medico">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6" />
            Análise Clínica
          </h1>
          <p className="text-gray-500">Avaliação de risco e simulações de intervenção</p>
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
                {currentRecordData?.diseaseCodes && currentRecordData.diseaseCodes.length > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentRecordData.diseaseCodes.map((code) => (
                        <Badge key={code} variant="destructive" className="text-xs">
                          {diseaseNames[code] || code}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - Análises */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="risco" className="flex items-center gap-1">
                <Activity className="w-4 h-4" /> Risco
              </TabsTrigger>
              <TabsTrigger value="simulacao" className="flex items-center gap-1">
                <Brain className="w-4 h-4" /> Simulação
              </TabsTrigger>
              <TabsTrigger value="composicao" className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Composição
              </TabsTrigger>
            </TabsList>

            <TabsContent value="risco" className="mt-4">
              {currentRecordData?.id && selectedPatient && (
                <MetabolicRiskPanel
                  patientId={selectedPatient.id}
                  recordId={currentRecordData.id}
                  clinicalData={currentRecordData}
                  sex={selectedPatient.sex}
                />
              )}
            </TabsContent>

            <TabsContent value="simulacao" className="mt-4 space-y-4">
              {currentRecordData?.id && selectedPatient && (
                <WhatIfSimulator
                  patientId={selectedPatient.id}
                  recordId={currentRecordData.id}
                  currentWeight={currentRecordData.weightKg}
                  currentActivityLevel={(() => {
                    const raw = currentRecordData.physicalActivityLevel ?? 'moderate';
                    switch (raw) {
                      case 'sedentary': return 'inactive';
                      case 'active':
                      case 'very_active': return 'high';
                      case 'light': return 'moderate';
                      default: return raw;
                    }
                  })()}
                  onWeightChange={(weightLossKg) => {
                    const factor = weightLossKg > 0 ? -(weightLossKg / currentRecordData.weightKg) : 0;
                    setSimulatedWeight(factor);
                    setSimulatedAbdomen(factor * 0.8);
                    setSimulationMode(weightLossKg > 0);
                  }}
                  onActivityLevelChange={(level) => {
                    const originalActivity = currentRecordData.physicalActivityLevel ?? 'moderate';
                    const nextLevel = level === originalActivity ? null : level;
                    setSimulatedActivityLevel(nextLevel);
                    setSimulationMode(Boolean(nextLevel) || simulatedWeight !== 0);
                  }}
                />
              )}
              <ClinicalMetrics
                currentRecordData={currentRecordData}
                changeFromBaseline={changeFromBaseline}
                year={currentYear}
              />
            </TabsContent>

            <TabsContent value="composicao" className="mt-4 space-y-4">
              <BodyComposition currentRecordData={currentRecordData} />
              <AvatarImpact morphTargets={finalMorphTargets} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna direita - Visualizador 3D */}
        <div className="h-[500px] lg:h-[600px]">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Visualização 3D</CardTitle>
              <CardDescription className="text-xs">
                {simulationMode ? 'Modo simulação ativo' : 'Dados atuais'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <ViewerLoader
                morphTargets={finalMorphTargets}
                sex={selectedPatient?.sex || 'M'}
                heightCm={currentRecordData?.heightCm || 170}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
