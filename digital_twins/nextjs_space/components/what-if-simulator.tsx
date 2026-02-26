'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingDown, TrendingUp, Sparkles, Activity, Pill, Scale, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SimulationResult {
  baseline: {
    riskProbability: number;
    features: Record<string, any>;
  };
  projected: {
    riskProbability: number;
    features: Record<string, any>;
  };
  impact: {
    absoluteReduction: number;
    relativeReductionPercent: number;
    nnt: number | null;
    featureChanges: Record<string, { before: number; after: number; unit: string }>;
  };
  appliedInterventions: string[];
  disclaimer: string;
}

interface WhatIfSimulatorProps {
  patientId: string;
  recordId: string;
  currentWeight: number;
  currentActivityLevel?: string;
  onSimulationComplete?: (result: SimulationResult) => void;
  onWeightChange?: (weightLossKg: number) => void; // Callback para atualizar modelo 3D
}

export default function WhatIfSimulator({
  patientId,
  recordId,
  currentWeight,
  currentActivityLevel = 'moderate',
  onSimulationComplete,
  onWeightChange,
}: WhatIfSimulatorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Intervenções
  const [weightLoss, setWeightLossState] = useState(0);
  
  // Wrapper para atualizar estado e notificar modelo 3D
  const setWeightLoss = (value: number) => {
    setWeightLossState(value);
    onWeightChange?.(value);
  };
  const [activityLevel, setActivityLevel] = useState<string>(currentActivityLevel);
  const [startStatin, setStartStatin] = useState(false);
  const [startMetformin, setStartMetformin] = useState(false);
  const [startAntihypertensive, setStartAntihypertensive] = useState(false);
  
  const maxWeightLoss = Math.min(30, Math.round(currentWeight * 0.25)); // Max 25% do peso
  
  const hasInterventions = weightLoss > 0 || 
    activityLevel !== currentActivityLevel || 
    startStatin || 
    startMetformin || 
    startAntihypertensive;
  
  const runSimulation = async () => {
    if (!hasInterventions) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/simulate-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          recordId,
          interventions: {
            weightLossKg: weightLoss > 0 ? weightLoss : undefined,
            activityLevelChange: activityLevel !== currentActivityLevel ? activityLevel as 'inactive' | 'moderate' | 'high' : undefined,
            startStatin,
            startMetformin,
            startAntihypertensive,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erro na simulação');
      }
      
      const data = await response.json();
      setResult(data);
      onSimulationComplete?.(data);
    } catch (err) {
      setError('Não foi possível realizar a simulação');
    } finally {
      setLoading(false);
    }
  };
  
  const resetSimulation = () => {
    setWeightLoss(0);
    setActivityLevel(currentActivityLevel);
    setStartStatin(false);
    setStartMetformin(false);
    setStartAntihypertensive(false);
    setResult(null);
    setError(null);
  };
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Simulador "E Se?"</CardTitle>
        </div>
        <CardDescription>Simule o impacto de mudanças no estilo de vida no risco metabólico</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intervenções */}
        <div className="space-y-4">
          {/* Perda de Peso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-orange-500" />
                Perda de Peso
              </Label>
              <Badge variant="outline" className="font-mono">
                {weightLoss > 0 ? `-${weightLoss} kg` : '0 kg'}
              </Badge>
            </div>
            <Slider
              value={[weightLoss]}
              onValueChange={([v]) => setWeightLoss(v)}
              max={maxWeightLoss}
              step={1}
              className="[&_[role=slider]]:bg-orange-500"
            />
            <p className="text-xs text-muted-foreground">
              Peso atual: {currentWeight}kg → Peso projetado: {currentWeight - weightLoss}kg
            </p>
          </div>
          
          {/* Atividade Física */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Nível de Atividade Física
            </Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">Sedentário</SelectItem>
                <SelectItem value="moderate">Moderado (3x/semana)</SelectItem>
                <SelectItem value="high">Intenso (5x/semana)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Medicamentos */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Pill className="h-4 w-4 text-blue-500" />
              Intervenções Farmacológicas
            </Label>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="statin" className="text-sm font-normal">Estatina (dislipidemia)</Label>
                <Switch id="statin" checked={startStatin} onCheckedChange={setStartStatin} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="metformin" className="text-sm font-normal">Metformina (pré-diabetes)</Label>
                <Switch id="metformin" checked={startMetformin} onCheckedChange={setStartMetformin} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="antihypertensive" className="text-sm font-normal">Anti-hipertensivo</Label>
                <Switch id="antihypertensive" checked={startAntihypertensive} onCheckedChange={setStartAntihypertensive} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={runSimulation}
            disabled={!hasInterventions || loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Simulando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Simular Impacto</>
            )}
          </Button>
          {(result || hasInterventions) && (
            <Button variant="outline" onClick={resetSimulation}>
              Limpar
            </Button>
          )}
        </div>
        
        {/* Resultado */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Comparação de Risco */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Risco Atual</p>
                <div className={`text-2xl font-bold ${
                  result.baseline.riskProbability >= 0.35 ? 'text-red-500' :
                  result.baseline.riskProbability >= 0.2 ? 'text-orange-500' :
                  result.baseline.riskProbability >= 0.1 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {formatPercent(result.baseline.riskProbability)}
                </div>
              </div>
              
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Risco Projetado</p>
                <div className={`text-2xl font-bold ${
                  result.projected.riskProbability >= 0.35 ? 'text-red-500' :
                  result.projected.riskProbability >= 0.2 ? 'text-orange-500' :
                  result.projected.riskProbability >= 0.1 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {formatPercent(result.projected.riskProbability)}
                </div>
              </div>
            </div>
            
            {/* Badge de Redução */}
            {result.impact.absoluteReduction > 0 && (
              <div className="flex justify-center">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Redução de {result.impact.relativeReductionPercent.toFixed(1)}% no risco
                </Badge>
              </div>
            )}
            
            {result.impact.absoluteReduction <= 0 && (
              <div className="flex justify-center">
                <Badge variant="destructive" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Sem redução de risco com estas intervenções
                </Badge>
              </div>
            )}
            
            {/* Mudanças nos Parâmetros */}
            {Object.keys(result.impact.featureChanges).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Projeção de Parâmetros:</p>
                <div className="grid gap-1.5">
                  {Object.entries(result.impact.featureChanges).map(([key, change]) => {
                    const labels: Record<string, string> = {
                      bmi: 'IMC',
                      waistCm: 'Cintura',
                      triglyceridesMgDl: 'Triglicerídeos',
                      hdlMgDl: 'HDL',
                      systolicBp: 'PA Sistólica',
                      fastingGlucoseMgDl: 'Glicemia',
                    };
                    const improved = key === 'hdlMgDl' ? change.after > change.before : change.after < change.before;
                    
                    return (
                      <div key={key} className="flex items-center justify-between text-sm bg-white/50 dark:bg-white/5 rounded px-2 py-1">
                        <span className="text-muted-foreground">{labels[key] || key}</span>
                        <span className="flex items-center gap-1">
                          <span className="font-mono text-xs">{change.before.toFixed(1)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className={`font-mono text-xs font-medium ${improved ? 'text-green-600' : 'text-orange-600'}`}>
                            {change.after.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">{change.unit}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* NNT */}
            {result.impact.nnt && result.impact.nnt <= 20 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground cursor-help">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      NNT estimado: {result.impact.nnt}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Número Necessário para Tratar: aproximadamente {result.impact.nnt}</p>
                    <p className="text-xs">pacientes precisam desta intervenção para prevenir 1 caso de SM</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center italic">
              {result.disclaimer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
