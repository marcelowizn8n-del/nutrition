'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  PieChart,
  Target,
  Gauge,
  ArrowLeft,
  RefreshCw,
  Info
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';

// Dados simulados de performance do modelo
const MODEL_METRICS = {
  version: 'ms-risk-rules-v1',
  trainedOn: '2024-12-15',
  samplesUsed: 5000,
  calibration: {
    brierScore: 0.065,
    brierScoreCI: [0.058, 0.072],
    rocAuc: 0.858,
    rocAucCI: [0.842, 0.874],
    prAuc: 0.336,
    prAucCI: [0.298, 0.374],
  },
  fairness: {
    sexParity: 0.94, // 1.0 = perfeito
    ageParity: 0.91,
  },
};

// Dados de calibração por decil
const CALIBRATION_DATA = [
  { decile: 1, predicted: 0.05, observed: 0.04, n: 500 },
  { decile: 2, predicted: 0.10, observed: 0.09, n: 500 },
  { decile: 3, predicted: 0.15, observed: 0.16, n: 500 },
  { decile: 4, predicted: 0.20, observed: 0.19, n: 500 },
  { decile: 5, predicted: 0.25, observed: 0.27, n: 500 },
  { decile: 6, predicted: 0.30, observed: 0.29, n: 500 },
  { decile: 7, predicted: 0.38, observed: 0.40, n: 500 },
  { decile: 8, predicted: 0.48, observed: 0.45, n: 500 },
  { decile: 9, predicted: 0.58, observed: 0.61, n: 500 },
  { decile: 10, predicted: 0.72, observed: 0.69, n: 500 },
];

// Curva ROC
const ROC_DATA = [
  { fpr: 0.00, tpr: 0.00 },
  { fpr: 0.05, tpr: 0.35 },
  { fpr: 0.10, tpr: 0.52 },
  { fpr: 0.15, tpr: 0.62 },
  { fpr: 0.20, tpr: 0.70 },
  { fpr: 0.25, tpr: 0.76 },
  { fpr: 0.30, tpr: 0.81 },
  { fpr: 0.40, tpr: 0.87 },
  { fpr: 0.50, tpr: 0.91 },
  { fpr: 0.60, tpr: 0.94 },
  { fpr: 0.70, tpr: 0.96 },
  { fpr: 0.80, tpr: 0.98 },
  { fpr: 0.90, tpr: 0.99 },
  { fpr: 1.00, tpr: 1.00 },
];

// Importância de features
const FEATURE_IMPORTANCE = [
  { feature: 'Cintura (cm)', importance: 0.23, color: '#ef4444' },
  { feature: 'Triglicerídeos', importance: 0.18, color: '#f97316' },
  { feature: 'Glicemia', importance: 0.16, color: '#eab308' },
  { feature: 'Pressão Arterial', importance: 0.15, color: '#22c55e' },
  { feature: 'IMC', importance: 0.14, color: '#3b82f6' },
  { feature: 'HDL', importance: 0.09, color: '#8b5cf6' },
  { feature: 'Idade', importance: 0.05, color: '#6b7280' },
];

// Estatísticas de uso
const USAGE_STATS = {
  totalPredictions: 1247,
  uniquePatients: 156,
  avgRiskScore: 0.24,
  highRiskPatients: 42,
  interventionsSimulated: 89,
};

// Distribuição de risco
const RISK_DISTRIBUTION = [
  { range: '0-10%', count: 45, color: '#10b981' },
  { range: '10-20%', count: 38, color: '#22c55e' },
  { range: '20-35%', count: 42, color: '#eab308' },
  { range: '35-50%', count: 21, color: '#f97316' },
  { range: '>50%', count: 10, color: '#ef4444' },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Voltar</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Digital Twin" width={100} height={40} className="object-contain" />
              <Badge variant="secondary">Dashboard</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {MODEL_METRICS.version}
            </Badge>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Predições</span>
              </div>
              <p className="text-2xl font-bold">{USAGE_STATS.totalPredictions.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Pacientes</span>
              </div>
              <p className="text-2xl font-bold">{USAGE_STATS.uniquePatients}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gauge className="h-4 w-4" />
                <span className="text-xs">Risco Médio</span>
              </div>
              <p className="text-2xl font-bold">{(USAGE_STATS.avgRiskScore * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Alto Risco</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{USAGE_STATS.highRiskPatients}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-purple-500 mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Simulações</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{USAGE_STATS.interventionsSimulated}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs principais */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="performance" className="gap-2">
              <Target className="h-4 w-4" />
              Performance do Modelo
            </TabsTrigger>
            <TabsTrigger value="calibration" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Calibração
            </TabsTrigger>
            <TabsTrigger value="fairness" className="gap-2">
              <PieChart className="h-4 w-4" />
              Equidade
            </TabsTrigger>
          </TabsList>
          
          {/* Performance */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Métricas principais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métricas de Discriminação</CardTitle>
                  <CardDescription>Capacidade do modelo de distinguir casos de não-casos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* ROC-AUC */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ROC-AUC</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-600">
                          {MODEL_METRICS.calibration.rocAuc.toFixed(3)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          CI: [{MODEL_METRICS.calibration.rocAucCI[0].toFixed(3)}, {MODEL_METRICS.calibration.rocAucCI[1].toFixed(3)}]
                        </span>
                      </div>
                    </div>
                    <Progress value={MODEL_METRICS.calibration.rocAuc * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Excelente discriminação (≥0.80). Modelo distingue bem entre pacientes com e sem risco.
                    </p>
                  </div>
                  
                  {/* PR-AUC */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">PR-AUC (Precision-Recall)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-purple-600">
                          {MODEL_METRICS.calibration.prAuc.toFixed(3)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          CI: [{MODEL_METRICS.calibration.prAucCI[0].toFixed(3)}, {MODEL_METRICS.calibration.prAucCI[1].toFixed(3)}]
                        </span>
                      </div>
                    </div>
                    <Progress value={MODEL_METRICS.calibration.prAuc * 100} className="h-2 [&>div]:bg-purple-600" />
                    <p className="text-xs text-muted-foreground">
                      Considerando prevalência de ~15%, o valor está adequado para a tarefa.
                    </p>
                  </div>
                  
                  {/* Brier Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Brier Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          {MODEL_METRICS.calibration.brierScore.toFixed(3)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          CI: [{MODEL_METRICS.calibration.brierScoreCI[0].toFixed(3)}, {MODEL_METRICS.calibration.brierScoreCI[1].toFixed(3)}]
                        </span>
                      </div>
                    </div>
                    <Progress value={(1 - MODEL_METRICS.calibration.brierScore) * 100} className="h-2 [&>div]:bg-green-600" />
                    <p className="text-xs text-muted-foreground">
                      Quanto menor, melhor. Valores {'<'}0.1 indicam boa calibração.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Curva ROC */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Curva ROC</CardTitle>
                  <CardDescription>Trade-off entre sensibilidade e especificidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={ROC_DATA}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="fpr" 
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: '1 - Especificidade (FPR)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                      />
                      <YAxis 
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'Sensibilidade (TPR)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                        labelFormatter={(label) => `FPR: ${(label * 100).toFixed(0)}%`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="tpr" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="TPR"
                      />
                      {/* Linha diagonal (random classifier) */}
                      <Line 
                        type="linear" 
                        dataKey="fpr" 
                        stroke="#9ca3af" 
                        strokeDasharray="5 5"
                        dot={false}
                        name="Random"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            {/* Feature Importance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Importância das Features</CardTitle>
                <CardDescription>Contribuição relativa de cada variável para a predição</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={FEATURE_IMPORTANCE} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <YAxis dataKey="feature" type="category" width={100} fontSize={12} />
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                    <Bar dataKey="importance" name="Importância">
                      {FEATURE_IMPORTANCE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Calibração */}
          <TabsContent value="calibration" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gráfico de Calibração</CardTitle>
                  <CardDescription>Risco predito vs. risco observado por decil</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={CALIBRATION_DATA}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="predicted" 
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'Risco Predito', position: 'insideBottom', offset: -5, fontSize: 11 }}
                      />
                      <YAxis 
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'Risco Observado', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                      />
                      <Legend />
                      {/* Linha de calibração perfeita */}
                      <Line 
                        type="linear" 
                        dataKey="predicted" 
                        stroke="#9ca3af" 
                        strokeDasharray="5 5"
                        dot={false}
                        name="Perfeito"
                      />
                      {/* Valores observados */}
                      <Line 
                        type="monotone" 
                        dataKey="observed" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Observado"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Pontos próximos à linha diagonal indicam boa calibração
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Risco na População</CardTitle>
                  <CardDescription>Número de pacientes por faixa de risco</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={RISK_DISTRIBUTION}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="Pacientes">
                        {RISK_DISTRIBUTION.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Interpretação da Calibração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">Bem Calibrado</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Quando o modelo prediz 20% de risco, aproximadamente 20% dos pacientes 
                      realmente desenvolvem a condição.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-700 dark:text-blue-400">Brier Score: {MODEL_METRICS.calibration.brierScore}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Medida geral de acurácia das probabilidades. Valores menores que 0.1 
                      indicam boa calibração.
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-700 dark:text-purple-400">Uso Clínico</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      As probabilidades podem ser comunicadas diretamente aos pacientes 
                      como estimativas confiáveis de risco.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Equidade */}
          <TabsContent value="fairness" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Paridade por Sexo</CardTitle>
                  <CardDescription>Performance do modelo entre homens e mulheres</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Índice de Paridade</span>
                    <Badge variant={MODEL_METRICS.fairness.sexParity >= 0.9 ? "default" : "destructive"}>
                      {(MODEL_METRICS.fairness.sexParity * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={MODEL_METRICS.fairness.sexParity * 100} className="h-3" />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Masculino</p>
                      <p className="text-lg font-bold text-blue-600">AUC 0.861</p>
                    </div>
                    <div className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Feminino</p>
                      <p className="text-lg font-bold text-pink-600">AUC 0.852</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diferença de AUC {'<'}2% indica performance equitativa entre os sexos.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Paridade por Faixa Etária</CardTitle>
                  <CardDescription>Performance do modelo entre diferentes idades</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Índice de Paridade</span>
                    <Badge variant={MODEL_METRICS.fairness.ageParity >= 0.9 ? "default" : "destructive"}>
                      {(MODEL_METRICS.fairness.ageParity * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={MODEL_METRICS.fairness.ageParity * 100} className="h-3" />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">{'<'}40 anos</p>
                      <p className="text-sm font-bold">AUC 0.845</p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">40-60 anos</p>
                      <p className="text-sm font-bold">AUC 0.862</p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">{'>'}60 anos</p>
                      <p className="text-sm font-bold">AUC 0.858</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Performance consistente em todas as faixas etárias.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">Modelo Aprovado em Equidade</h3>
                    <p className="text-sm text-muted-foreground">
                      O modelo demonstra performance consistente entre diferentes grupos demográficos, 
                      com variação de AUC inferior a 3% entre subgrupos. Isso indica que as predições 
                      são igualmente confiáveis independentemente do sexo ou idade do paciente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Footer info */}
        <Card className="bg-slate-50 dark:bg-slate-950/50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Modelo: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{MODEL_METRICS.version}</code></span>
                <span>Treinado em: {MODEL_METRICS.trainedOn}</span>
                <span>Amostras: {MODEL_METRICS.samplesUsed.toLocaleString()}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/">Voltar para Visualização</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
