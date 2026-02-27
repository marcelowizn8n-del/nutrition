'use client';

import { useState, useEffect, useMemo } from 'react';
import PatientSelector from './patient-selector';
import TimelineSlider from './timeline-slider';
import ViewerLoader from './viewer-loader';
import MetabolicRiskPanel from './metabolic-risk-panel';
import WhatIfSimulator from './what-if-simulator';
import { ClinicalToBodyMapper, MorphTargets } from '@/lib/clinical-mapper';
import { Loader2, AlertCircle, Info, TrendingUp, TrendingDown, Minus, Activity, Scale, Ruler, Heart, Droplets, Zap, Settings2, ChevronDown, ChevronUp, BarChart3, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ClinicalRecord {
  id: string;
  year: number;
  heightCm: number;
  weightKg: number;
  diseaseCodes: string[];
  notes?: string | null;
  morphTargets: MorphTargets;
  // Novos campos metabólicos
  bmi?: number;
  waistCm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  triglyceridesMgDl?: number;
  hdlMgDl?: number;
  ldlMgDl?: number;
  totalCholesterolMgDl?: number;
  fastingGlucoseMgDl?: number;
  hasMetabolicSyndrome?: boolean;
  physicalActivityLevel?: string;
  smokingStatus?: string;
  isOnAntihypertensive?: boolean;
  isOnAntidiabetic?: boolean;
  isOnLipidLowering?: boolean;
  // Bioimpedance
  bioImpedanceFat?: number;
  bioImpedanceMuscle?: number;
  bioImpedanceWater?: number;
  bioImpedanceVisceral?: number;
  bioImpedanceBone?: number;
  bioImpedanceMetabolicAge?: number;
}

interface Patient {
  id: string;
  name: string;
  sex: 'M' | 'F';
  birthYear: number;
  records: ClinicalRecord[];
}

const defaultMorphTargets: MorphTargets = {
  Weight: 0.2,
  AbdomenGirth: 0.15,
  MuscleMass: 0.4,
  Posture: 0.1,
  DiabetesEffect: 0,
  HeartDiseaseEffect: 0,
  HypertensionEffect: 0,
};

const diseaseNames: Record<string, string> = {
  'E11': 'Diabetes Tipo 2',
  'I10': 'Hipertensão',
  'I25': 'Doença Cardíaca',
};

function interpolateNumber(a: number, b: number, t: number): number {
  if (isNaN(a) || isNaN(b) || isNaN(t)) return a || 0;
  return a + (b - a) * t;
}

export default function DigitalTwinsApp() {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(2024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedWeight, setSimulatedWeight] = useState(0);
  const [simulatedAbdomen, setSimulatedAbdomen] = useState(0);
  const [simulatedActivityLevel, setSimulatedActivityLevel] = useState<string | null>(null);
  const [techInfoOpen, setTechInfoOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        if (data?.success && data?.patients) {
          // Calcular morphTargets em tempo real com dados reais do paciente
          const patientsWithMorphTargets = data.patients.map((patient: Patient) => {
            try {
              return {
                ...patient,
                records: patient.records.map((record: ClinicalRecord) => {
                  try {
                    return {
                      ...record,
                      morphTargets: ClinicalToBodyMapper.calculate({
                        heightCm: record.heightCm || 170, // Fallback prevent crash
                        weightKg: record.weightKg || 70,
                        age: patient.birthYear ? (record.year || new Date().getFullYear()) - patient.birthYear : 40,
                        sex: (patient.sex === 'M' || patient.sex === 'F') ? patient.sex : 'M',
                        diseaseCodes: Array.isArray(record.diseaseCodes) ? record.diseaseCodes : [],
                        waistCm: record.waistCm,
                        physicalActivityLevel: record.physicalActivityLevel,
                      }),
                    };
                  } catch (innerErr) {
                    console.error("Error mapping record:", innerErr);
                    return { ...record, morphTargets: defaultMorphTargets };
                  }
                }),
              };
            } catch (err) {
              console.error("Error mapping patient:", err);
              return patient;
            }
          });
          setPatients(patientsWithMorphTargets);
          if (patientsWithMorphTargets.length > 0) {
            setSelectedPatientId(patientsWithMorphTargets[0].id);
          }
        } else {
          setError(`Erro: ${data.error || 'Falha ao carregar pacientes'} - ${data.details ? JSON.stringify(data.details).slice(0, 100) : ''}`);
        }
      } catch (err: any) {
        setError(`Erro de conexão: ${err.message || 'Desconhecido'}`);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, []);

  const selectedPatient = useMemo(
    () => patients?.find((p) => p?.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const { minYear, maxYear } = useMemo(() => {
    const records = selectedPatient?.records ?? [];
    if (records.length === 0) return { minYear: 2019, maxYear: 2024 };
    const years = records.map((r) => r?.year ?? 2024);
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient?.records?.length) {
      const lastRecord = selectedPatient.records[selectedPatient.records.length - 1];
      setCurrentYear(lastRecord.year);
    }
  }, [selectedPatientId, selectedPatient]);

  // Reset simulation when patient changes
  useEffect(() => {
    setSimulationMode(false);
    setSimulatedWeight(0);
    setSimulatedAbdomen(0);
    setSimulatedActivityLevel(null);
  }, [selectedPatientId]);

  // Calcular dados interpolados do registro atual
  const currentRecordData = useMemo(() => {
    const records = selectedPatient?.records ?? [];
    if (records.length === 0) return null;

    if (records.length === 1) return records[0];

    // Encontrar registros para interpolação
    let startRecord = records[0];
    let endRecord = records[records.length - 1];

    for (let i = 0; i < records.length - 1; i++) {
      if (records[i]?.year <= currentYear && records[i + 1]?.year >= currentYear) {
        startRecord = records[i];
        endRecord = records[i + 1];
        break;
      }
    }

    if (currentYear <= startRecord.year) return startRecord;
    if (currentYear >= endRecord.year) return endRecord;

    const t = (currentYear - startRecord.year) / (endRecord.year - startRecord.year);

    return {
      ...startRecord,
      year: currentYear,
      heightCm: interpolateNumber(startRecord.heightCm, endRecord.heightCm, t),
      weightKg: interpolateNumber(startRecord.weightKg, endRecord.weightKg, t),
      diseaseCodes: t < 0.5 ? startRecord.diseaseCodes : endRecord.diseaseCodes,
      morphTargets: ClinicalToBodyMapper.interpolate(
        startRecord.morphTargets ?? defaultMorphTargets,
        endRecord.morphTargets ?? defaultMorphTargets,
        t
      ),
    };
  }, [selectedPatient, currentYear]);

  // Dados do primeiro registro (baseline)
  const baselineRecord = useMemo(() => {
    return selectedPatient?.records?.[0] ?? null;
  }, [selectedPatient]);

  // Morph targets finais (com simulação se ativa)
  const finalMorphTargets = useMemo(() => {
    // Se não houver dados, retorna padrão
    if (!currentRecordData || !selectedPatient) return defaultMorphTargets;

    // Se não estiver em modo simulação, usa os calculados no registro
    if (!simulationMode) return currentRecordData.morphTargets ?? defaultMorphTargets;

    // EM MODO SIMULAÇÃO: Recalcular do zero com os novos dados
    // simulatedWeight é um fator percentual negativo (ex: -0.1 para 10% de perda)
    const currentWeight = currentRecordData.weightKg;
    const currentWaist = currentRecordData.waistCm;

    // Calcular novos valores clínicos
    const simulatedNewWeight = currentWeight * (1 + simulatedWeight);

    // Estimativa: cintura reduz na mesma proporção do peso (aproximação)
    const simulatedNewWaist = currentWaist ? currentWaist * (1 + simulatedAbdomen) : undefined;

    // Idade atual
    const age = new Date().getFullYear() - selectedPatient.birthYear;

    const mappedActivityLevel = (() => {
      const raw = simulatedActivityLevel ?? currentRecordData.physicalActivityLevel ?? 'moderate';
      switch (raw) {
        case 'inactive':
          return 'sedentary';
        case 'high':
          return 'very_active';
        default:
          return raw;
      }
    })();

    // Recalcular usando o Mapper oficial para garantir consistência
    const recalculatedMorphs = ClinicalToBodyMapper.calculate({
      heightCm: currentRecordData.heightCm,
      weightKg: simulatedNewWeight,
      age: age,
      sex: selectedPatient.sex as 'M' | 'F',
      diseaseCodes: currentRecordData.diseaseCodes || [],
      waistCm: simulatedNewWaist,
      physicalActivityLevel: mappedActivityLevel,
    });

    return recalculatedMorphs;
  }, [currentRecordData, selectedPatient, simulationMode, simulatedWeight, simulatedAbdomen, simulatedActivityLevel]);

  // Calcular mudança desde baseline
  const changeFromBaseline = useMemo(() => {
    if (!baselineRecord || !currentRecordData) return null;

    const weightChange = currentRecordData.weightKg - baselineRecord.weightKg;
    const weightPct = (weightChange / baselineRecord.weightKg) * 100;

    return {
      weightKg: weightChange,
      weightPct,
    };
  }, [baselineRecord, currentRecordData]);

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
      {/* Header com seleção de paciente */}
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
                      {currentRecordData.diseaseCodes.map(code => (
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

      {/* Timeline expandida */}
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
        {/* Coluna esquerda - Dados do paciente */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados Clínicos</TabsTrigger>
              <TabsTrigger value="simulacao" className="flex-1">Simulação</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              {/* Valores Absolutos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Métricas Atuais ({currentYear})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Peso</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{currentRecordData?.weightKg?.toFixed(1) ?? '--'} kg</div>
                      {changeFromBaseline && (
                        <div className={`text-sm flex items-center gap-1 justify-end ${changeFromBaseline.weightKg > 0 ? 'text-red-600' :
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
                    <div className="text-xl font-bold">{currentRecordData?.heightCm?.toFixed(0) ?? '--'} cm</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">IMC</span>
                    </div>
                    <div className="text-right">
                      {currentRecordData && (
                        <>
                          <div className="text-xl font-bold">
                            {(currentRecordData.weightKg / Math.pow(currentRecordData.heightCm / 100, 2)).toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(() => {
                              const bmi = currentRecordData.weightKg / Math.pow(currentRecordData.heightCm / 100, 2);
                              if (bmi < 18.5) return 'Abaixo do peso';
                              if (bmi < 25) return 'Normal';
                              if (bmi < 30) return 'Sobrepeso';
                              return 'Obesidade';
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Impacto no Avatar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Impacto no Avatar 3D</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'Weight', label: 'Distribuição de Massa', icon: Scale, color: 'blue' },
                    { key: 'AbdomenGirth', label: 'Circunferência Abdominal', icon: Activity, color: 'orange' },
                    { key: 'MuscleMass', label: 'Massa Muscular', icon: Zap, color: 'green' },
                    { key: 'Posture', label: 'Postura', icon: Ruler, color: 'purple' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Icon className={`w-4 h-4 text-${color}-600`} />
                          {label}
                        </span>
                        <span className="font-medium">
                          {((finalMorphTargets[key as keyof MorphTargets] ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${color}-500 transition-all duration-500`}
                          style={{
                            width: `${(finalMorphTargets[key as keyof MorphTargets] ?? 0) * 100}%`,
                            backgroundColor: color === 'blue' ? '#3b82f6' :
                              color === 'orange' ? '#f97316' :
                                color === 'green' ? '#22c55e' : '#8b5cf6'
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Efeitos de Doenças */}
                  {(finalMorphTargets.DiabetesEffect > 0 || finalMorphTargets.HypertensionEffect > 0 || finalMorphTargets.HeartDiseaseEffect > 0) && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-xs text-gray-500 mb-2">Efeitos de Condições Clínicas:</p>
                      {finalMorphTargets.DiabetesEffect > 0 && (
                        <Badge variant="outline" className="mr-1 mb-1 text-xs">
                          <Droplets className="w-3 h-3 mr-1" />
                          Diabetes: {(finalMorphTargets.DiabetesEffect * 100).toFixed(0)}%
                        </Badge>
                      )}
                      {finalMorphTargets.HypertensionEffect > 0 && (
                        <Badge variant="outline" className="mr-1 mb-1 text-xs">
                          <Activity className="w-3 h-3 mr-1" />
                          Hipertensão: {(finalMorphTargets.HypertensionEffect * 100).toFixed(0)}%
                        </Badge>
                      )}
                      {finalMorphTargets.HeartDiseaseEffect > 0 && (
                        <Badge variant="outline" className="mr-1 mb-1 text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          Cardiopatia: {(finalMorphTargets.HeartDiseaseEffect * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bioimpedance Analysis */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Bioimpedância Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentRecordData?.bioImpedanceFat ? (
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

              {/* Painel de Risco Metabólico */}
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
              {/* Simulador What-If Avançado */}
              {currentRecordData?.id && selectedPatient && (
                <WhatIfSimulator
                  patientId={selectedPatient.id}
                  recordId={currentRecordData.id}
                  currentWeight={currentRecordData.weightKg}
                  currentActivityLevel={(() => {
                    const raw = currentRecordData.physicalActivityLevel ?? 'moderate';
                    switch (raw) {
                      case 'sedentary':
                        return 'inactive';
                      case 'active':
                      case 'very_active':
                        return 'high';
                      case 'light':
                        return 'moderate';
                      default:
                        return raw;
                    }
                  })()}
                  onWeightChange={(weightLossKg) => {
                    // Converter perda de peso em kg para fator de simulação negativo
                    // Ex: perder 10kg de 80kg = -12.5% = -0.125 no fator
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

              {/* Simulação Visual do Avatar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    Visualização 3D "E se..."
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={simulationMode ? "default" : "outline"}
                      onClick={() => setSimulationMode(!simulationMode)}
                      className="w-full"
                    >
                      {simulationMode ? 'Desativar Visualização' : 'Ativar Visualização'}
                    </Button>
                  </div>

                  {simulationMode && (
                    <>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Variação de Peso</label>
                          <span className="text-sm text-gray-500">
                            {simulatedWeight > 0 ? '+' : ''}{(simulatedWeight * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[simulatedWeight * 100]}
                          onValueChange={(v) => setSimulatedWeight(v[0] / 100)}
                          min={-50}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Perder peso</span>
                          <span>Ganhar peso</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Circunferência Abdominal</label>
                          <span className="text-sm text-gray-500">
                            {simulatedAbdomen > 0 ? '+' : ''}{(simulatedAbdomen * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[simulatedAbdomen * 100]}
                          onValueChange={(v) => setSimulatedAbdomen(v[0] / 100)}
                          min={-50}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Reduzir</span>
                          <span>Aumentar</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimulatedWeight(-0.15);
                            setSimulatedAbdomen(-0.1);
                          }}
                          className="flex-1 text-xs"
                        >
                          Perder 5kg
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimulatedWeight(0.2);
                            setSimulatedAbdomen(0.15);
                          }}
                          className="flex-1 text-xs"
                        >
                          Ganhar 10kg
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimulatedWeight(0);
                            setSimulatedAbdomen(0);
                          }}
                          className="flex-1 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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

        {/* Coluna direita - Histórico e Tecnologia */}
        <div className="space-y-4">
          {/* Link para Dashboard */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200">
            <CardContent className="py-4">
              <Link href="/dashboard" className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800">
                      Dashboard de Performance
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                      Métricas do modelo de risco metabólico
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>

          {/* Histórico de Registros */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico Clínico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedPatient?.records?.map((record, idx) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${record.year === currentYear
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white hover:bg-gray-50'
                      }`}
                    onClick={() => setCurrentYear(record.year)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{record.year}</span>
                      <span className="text-sm text-gray-600">{record.weightKg} kg</span>
                    </div>
                    {record.diseaseCodes.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {record.diseaseCodes.map(code => (
                          <Badge key={code} variant="secondary" className="text-xs">
                            {diseaseNames[code] || code}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {record.notes && (
                      <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seção Sobre a Tecnologia */}
          <Collapsible open={techInfoOpen} onOpenChange={setTechInfoOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Sobre a Tecnologia
                    </span>
                    {techInfoOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-800">Confiabilidade Médica</h4>
                    <ul className="text-gray-600 list-disc list-inside">
                      <li><strong>Algoritmo:</strong> NCEP ATP III (Padrão ouro para Síndrome Metabólica)</li>
                      <li><strong>Acurácia:</strong> ROC-AUC 0.858 (Predição de risco metabolicamente validada)</li>
                      <li><strong>Base de Dados:</strong> Amostra epidemiológica de 37.999 pacientes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Engine 3D & Fidelidade</h4>
                    <p className="text-gray-600">
                      Mapeamento anatômico via Morph Targets calibrados. O modelo 3D não é apenas estético;
                      as deformações são governadas por faixas antropométricas reais do estudo (Peso, Cintura e Idade).
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Formato e Resolução</h4>
                    <p className="text-gray-600">GLB/glTF de alta densidade (~60k vértices) para representação precisa de tecidos moles.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Limitações</h4>
                    <p className="text-gray-600">Representação estatística baseada em modelos populacionais. Deve ser usado como suporte visual, não como diagnóstico isolado.</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
