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
          const patientsWithMorphTargets = data.patients.map((patient: Patient) => ({
            ...patient,
            records: patient.records.map((record: ClinicalRecord) => ({
              ...record,
              morphTargets: ClinicalToBodyMapper.calculate({
                heightCm: record.heightCm,
                weightKg: record.weightKg,
                age: record.year - patient.birthYear,
                sex: patient.sex,
                diseaseCodes: record.diseaseCodes || [],
                waistCm: record.waistCm,
                physicalActivityLevel: record.physicalActivityLevel,
              }),
            })),
          }));
          setPatients(patientsWithMorphTargets);
          if (patientsWithMorphTargets.length > 0) {
            setSelectedPatientId(patientsWithMorphTargets[0].id);
          }
        } else {
          setError('Falha ao carregar pacientes');
        }
      } catch (err) {
        setError('Erro de conexão com o servidor');
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
    const baseMorphTargets = currentRecordData?.morphTargets ?? defaultMorphTargets;
    
    if (!simulationMode) return baseMorphTargets;
    
    // Aplicar simulação com escala proporcional
    // simulatedWeight/Abdomen vai de -0.3 a +0.3
    // Se negativo: reduz proporcionalmente o valor atual
    // Se positivo: aumenta proporcionalmente em direção a 1.0
    const applySimulation = (baseValue: number, delta: number) => {
      if (delta < 0) {
        // Perda: reduz proporcionalmente (delta=-0.3 → reduz 30% do valor atual)
        return Math.max(0, baseValue * (1 + delta));
      } else {
        // Ganho: aumenta em direção a 1.0 (delta=+0.3 → aumenta 30% do espaço restante)
        const remaining = 1 - baseValue;
        return Math.min(1, baseValue + remaining * delta);
      }
    };
    
    return {
      ...baseMorphTargets,
      Weight: applySimulation(baseMorphTargets.Weight, simulatedWeight),
      AbdomenGirth: applySimulation(baseMorphTargets.AbdomenGirth, simulatedAbdomen),
      // Perda de peso também afeta massa muscular positivamente
      MuscleMass: Math.max(0, Math.min(1, baseMorphTargets.MuscleMass + (simulatedWeight < 0 ? Math.abs(simulatedWeight) * 0.3 : -simulatedWeight * 0.2))),
    };
  }, [currentRecordData, simulationMode, simulatedWeight, simulatedAbdomen]);

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
          <p className="text-slate-800 font-medium">{error}</p>
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
                        <div className={`text-sm flex items-center gap-1 justify-end ${
                          changeFromBaseline.weightKg > 0 ? 'text-red-600' : 
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
                  currentActivityLevel={currentRecordData.physicalActivityLevel}
                  onWeightChange={(weightLossKg) => {
                    // Converter perda de peso em kg para fator de simulação negativo
                    // Ex: perder 10kg de 80kg = -12.5% = -0.125 no fator
                    const factor = weightLossKg > 0 ? -(weightLossKg / currentRecordData.weightKg) : 0;
                    setSimulatedWeight(factor);
                    setSimulatedAbdomen(factor * 0.8);
                    setSimulationMode(weightLossKg > 0);
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
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      record.year === currentYear 
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
                    <h4 className="font-semibold text-gray-800">Engine 3D</h4>
                    <p className="text-gray-600">Three.js + React Three Fiber</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Formato do Modelo</h4>
                    <p className="text-gray-600">glTF/GLB com Morph Targets</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Resolução do Avatar</h4>
                    <p className="text-gray-600">~60.000 vértices, 100.000 faces</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Algoritmo de Mapeamento</h4>
                    <p className="text-gray-600">
                      Conversão de parâmetros clínicos (IMC, códigos CID-10) 
                      para deformações morfológicas baseadas em evidências.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Morph Targets</h4>
                    <ul className="text-gray-600 list-disc list-inside">
                      <li>Weight - Distribuição de massa corporal</li>
                      <li>AbdomenGirth - Circunferência abdominal</li>
                      <li>MuscleMass - Massa muscular</li>
                      <li>Posture - Postura e curvatura</li>
                      <li>DiabetesEffect - Efeito de diabetes</li>
                      <li>HypertensionEffect - Efeito de hipertensão</li>
                      <li>HeartDiseaseEffect - Efeito de cardiopatia</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Limitações</h4>
                    <ul className="text-gray-600 list-disc list-inside">
                      <li>Visualização aproximada, não diagnóstica</li>
                      <li>Baseado em modelos populacionais</li>
                      <li>Não considera variações individuais</li>
                    </ul>
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
