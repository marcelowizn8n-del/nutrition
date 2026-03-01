'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePatientData, useClinicalMetrics } from '@/hooks';
import PatientSelector from '@/components/patient-selector';
import TimelineSlider from '@/components/timeline-slider';
import ViewerLoader from '@/components/viewer-loader';
import MetabolicRiskPanel from '@/components/metabolic-risk-panel';
import WhatIfSimulator from '@/components/what-if-simulator';
import {
  ClinicalMetrics,
  BodyComposition,
  AvatarImpact,
  ClinicalHistory,
  TechInfo,
  PerformanceDashboardLink,
} from '@/components/patient';
import { ClinicalToBodyMapper } from '@/lib/clinical-mapper';
import { defaultMorphTargets, diseaseNames, MorphTargets } from '@/lib/types';
import { Loader2, AlertCircle, Activity, ArrowLeft, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function MedicoPacientesPage() {
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2024);
  const [activeTab, setActiveTab] = useState('dados');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedWeight, setSimulatedWeight] = useState(0);
  const [simulatedAbdomen, setSimulatedAbdomen] = useState(0);
  const [simulatedActivityLevel, setSimulatedActivityLevel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { patients, selectedPatient, selectedPatientId, setSelectedPatientId, loading, error } = usePatientData();
  
  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(term) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  }, [patients, searchTerm]);
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
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentAge = selectedPatient ? new Date().getFullYear() - selectedPatient.birthYear : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/medico">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500">Visualize e analise os dados de seus pacientes</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente..."
              className="pl-10 w-64"
            />
          </div>
          <Button asChild>
            <Link href="/medico/pacientes/novo">
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Link>
          </Button>
        </div>
      </div>

      {/* Patient Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <PatientSelector
              patients={filteredPatients}
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

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Linha do Tempo Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSlider
            minYear={minYear}
            maxYear={maxYear}
            currentYear={currentYear}
            onChange={setCurrentYear}
            records={selectedPatient?.records}
          />
        </CardContent>
      </Card>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados Clínicos</TabsTrigger>
              <TabsTrigger value="simulacao" className="flex-1">Simulação</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <ClinicalMetrics
                currentRecordData={currentRecordData}
                changeFromBaseline={changeFromBaseline}
                year={currentYear}
              />
              <AvatarImpact morphTargets={finalMorphTargets} />
              <BodyComposition currentRecordData={currentRecordData} />
              {currentRecordData?.id && selectedPatient && (
                <MetabolicRiskPanel
                  patientId={selectedPatient.id}
                  recordId={currentRecordData.id}
                  clinicalData={currentRecordData}
                  sex={selectedPatient.sex}
                />
              )}
            </TabsContent>

            <TabsContent value="simulacao" className="space-y-4 mt-4">
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
                    const originalActivity = currentRecordData.physicalActivityLevel ?? 'moderate';
                    const hasActivityChange = simulatedActivityLevel !== null && simulatedActivityLevel !== originalActivity;
                    setSimulationMode(weightLossKg > 0 || hasActivityChange);
                  }}
                  onActivityLevelChange={(level) => {
                    const originalActivity = currentRecordData.physicalActivityLevel ?? 'moderate';
                    const nextLevel = level === originalActivity ? null : level;
                    setSimulatedActivityLevel(nextLevel);
                    const hasWeightChange = simulatedWeight !== 0 || simulatedAbdomen !== 0;
                    setSimulationMode(Boolean(nextLevel) || hasWeightChange);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna central - Visualizador 3D */}
        <div className="lg:col-span-1 h-[500px] lg:h-[600px]">
          <ViewerLoader
            morphTargets={finalMorphTargets}
            sex={selectedPatient?.sex || 'M'}
            heightCm={currentRecordData?.heightCm || 170}
          />
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          <PerformanceDashboardLink />
          <ClinicalHistory
            records={selectedPatient?.records}
            currentYear={currentYear}
            onYearSelect={setCurrentYear}
          />
          <TechInfo />
        </div>
      </div>
    </div>
  );
}
