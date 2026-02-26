'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, TrendingUp, TrendingDown, Activity, Heart, Droplets, Scale, Gauge, Info, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RiskFactor {
  feature: string;
  featureLabel: string;
  direction: 'increase' | 'decrease';
  impact: 'high' | 'medium' | 'low';
  contribution: number;
  currentValue: number;
  threshold: number;
  unit: string;
}

interface PredictionResponse {
  riskProbability: number;
  timeHorizonMonths: number;
  modelVersion: string;
  criteriaCount: number;
  hasMetabolicSyndrome: boolean;
  calibrationMetrics: {
    brierScore: number;
    rocAuc: number;
    prAuc: number;
  };
  explanation: {
    topFactors: RiskFactor[];
    componentStatus: {
      waist: boolean;
      triglycerides: boolean;
      hdl: boolean;
      bloodPressure: boolean;
      glucose: boolean;
    };
  };
}

interface ClinicalRecord {
  id: string;
  waistCm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  triglyceridesMgDl?: number;
  hdlMgDl?: number;
  fastingGlucoseMgDl?: number;
  hasMetabolicSyndrome?: boolean;
}

interface MetabolicRiskPanelProps {
  patientId: string;
  recordId: string;
  clinicalData: ClinicalRecord;
  sex: 'M' | 'F';
}

function RiskGauge({ value, size = 120 }: { value: number; size?: number }) {
  const percentage = value * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  const getColor = (v: number) => {
    if (v < 0.1) return '#10b981'; // green
    if (v < 0.2) return '#f59e0b'; // yellow
    if (v < 0.35) return '#f97316'; // orange
    return '#ef4444'; // red
  };
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getColor(value)}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-gray-500">risco</span>
      </div>
    </div>
  );
}

function MSComponent({ 
  label, 
  icon: Icon, 
  value, 
  unit, 
  threshold, 
  isAltered,
  isBelowThreshold = false 
}: { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  value?: number; 
  unit: string; 
  threshold: number;
  isAltered: boolean;
  isBelowThreshold?: boolean;
}) {
  return (
    <div className={`p-2.5 rounded-lg border transition-colors ${
      isAltered 
        ? 'border-red-300 bg-red-50 dark:bg-red-950/30' 
        : 'border-green-300 bg-green-50 dark:bg-green-950/30'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${isAltered ? 'text-red-600' : 'text-green-600'}`} />
        <span className="text-xs font-medium">{label}</span>
        {isAltered && <span className="text-red-500">⚠</span>}
      </div>
      <div className="text-sm font-semibold">
        {value?.toFixed(0) ?? '--'} {unit}
      </div>
      <div className="text-[10px] text-gray-500">
        Corte: {isBelowThreshold ? '<' : '≥'} {threshold} {unit}
      </div>
    </div>
  );
}

function getRiskLevel(probability: number): { 
  label: string; 
  color: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  description: string;
} {
  if (probability < 0.1) {
    return { 
      label: 'Baixo', 
      color: '#10b981', 
      variant: 'secondary',
      description: 'Risco baixo de desenvolver síndrome metabólica nos próximos 12 meses'
    };
  }
  if (probability < 0.2) {
    return { 
      label: 'Moderado', 
      color: '#f59e0b', 
      variant: 'outline',
      description: 'Risco moderado - recomenda-se acompanhamento e mudanças de estilo de vida'
    };
  }
  if (probability < 0.35) {
    return { 
      label: 'Alto', 
      color: '#f97316', 
      variant: 'destructive',
      description: 'Risco alto - intervenção terapêutica recomendada'
    };
  }
  return { 
    label: 'Muito Alto', 
    color: '#ef4444', 
    variant: 'destructive',
    description: 'Risco muito alto - requer atenção médica imediata'
  };
}

export default function MetabolicRiskPanel({ 
  patientId, 
  recordId, 
  clinicalData,
  sex 
}: MetabolicRiskPanelProps) {
  const [riskData, setRiskData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRisk() {
      if (!recordId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/predict-metabolic-risk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, recordId }),
        });
        
        if (!response.ok) {
          throw new Error('Falha ao calcular risco');
        }
        
        const data = await response.json();
        setRiskData(data);
      } catch (err) {
        console.error('Erro ao buscar risco:', err);
        setError('Não foi possível calcular o risco metabólico');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRisk();
  }, [patientId, recordId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Calculando risco metabólico...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !riskData) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error || 'Dados insuficientes para cálculo'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(riskData.riskProbability);
  const { componentStatus } = riskData.explanation;
  
  // Thresholds baseados no sexo
  const waistThreshold = sex === 'M' ? 94 : 80;
  const hdlThreshold = sex === 'M' ? 40 : 50;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          Risco de Síndrome Metabólica
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Predição baseada em modelo clínico com AUC-ROC de {riskData.calibrationMetrics.rocAuc.toFixed(2)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge de Risco */}
        <div className="flex flex-col items-center">
          <RiskGauge value={riskData.riskProbability} />
          <p className="text-xs text-gray-500 mt-1">em {riskData.timeHorizonMonths} meses</p>
          <Badge 
            variant={riskLevel.variant} 
            className="mt-2"
            style={{ backgroundColor: riskLevel.variant === 'destructive' ? riskLevel.color : undefined }}
          >
            Risco {riskLevel.label}
          </Badge>
          <p className="text-xs text-gray-500 text-center mt-2 max-w-[200px]">
            {riskLevel.description}
          </p>
        </div>

        {/* Status dos Componentes da SM */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1">
            Componentes da SM 
            <span className="text-xs font-normal text-gray-500">
              ({riskData.criteriaCount}/5 alterados)
            </span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <MSComponent
              label="Cintura"
              icon={Scale}
              value={clinicalData.waistCm}
              unit="cm"
              threshold={waistThreshold}
              isAltered={componentStatus.waist}
            />
            <MSComponent
              label="PA Sistólica"
              icon={Heart}
              value={clinicalData.systolicBp}
              unit="mmHg"
              threshold={130}
              isAltered={componentStatus.bloodPressure}
            />
            <MSComponent
              label="Triglicerídeos"
              icon={Droplets}
              value={clinicalData.triglyceridesMgDl}
              unit="mg/dL"
              threshold={150}
              isAltered={componentStatus.triglycerides}
            />
            <MSComponent
              label="HDL"
              icon={Droplets}
              value={clinicalData.hdlMgDl}
              unit="mg/dL"
              threshold={hdlThreshold}
              isAltered={componentStatus.hdl}
              isBelowThreshold={true}
            />
            <MSComponent
              label="Glicemia"
              icon={Gauge}
              value={clinicalData.fastingGlucoseMgDl}
              unit="mg/dL"
              threshold={100}
              isAltered={componentStatus.glucose}
            />
          </div>
        </div>

        {/* Fatores de Risco (SHAP-like) */}
        {riskData.explanation.topFactors.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="factors" className="border-none">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                Por que este risco?
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {riskData.explanation.topFactors.map((factor) => (
                    <div key={factor.feature} className="flex items-center gap-2 text-sm">
                      {factor.direction === 'increase' ? (
                        <TrendingUp className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="flex-1">{factor.featureLabel}</span>
                      <span className="text-xs text-gray-500">
                        {factor.currentValue.toFixed(0)} {factor.unit}
                      </span>
                      <Badge 
                        variant={factor.impact === 'high' ? 'destructive' : 'secondary'}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {factor.impact === 'high' ? 'Alto' : factor.impact === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Disclaimer */}
        <div className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
          <p>Modelo: {riskData.modelVersion} | AUC-ROC: {riskData.calibrationMetrics.rocAuc.toFixed(3)}</p>
          <p className="mt-0.5">Este sistema é para fins educacionais. Sempre consulte um médico.</p>
        </div>
      </CardContent>
    </Card>
  );
}
