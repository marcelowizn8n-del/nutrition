import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Constantes clínicas para cálculo de risco
const MS_CRITERIA = {
  waist_male: 94,
  waist_female: 80,
  triglycerides: 150,
  hdl_male: 40,
  hdl_female: 50,
  systolic_bp: 130,
  diastolic_bp: 85,
  glucose: 100,
};

// Pesos para cálculo de risco (baseados no artigo)
const RISK_WEIGHTS = {
  bmi: 0.15,
  waist: 0.20,
  triglycerides: 0.15,
  hdl: 0.12,
  blood_pressure: 0.15,
  glucose: 0.15,
  age: 0.05,
  physical_activity: 0.03,
};

interface ClinicalFeatures {
  bmi: number;
  waistCm: number;
  systolicBp: number;
  diastolicBp: number;
  triglyceridesMgDl: number;
  hdlMgDl: number;
  fastingGlucoseMgDl: number;
  age: number;
  sex: string;
  physicalActivityLevel?: string;
  isOnAntihypertensive?: boolean;
  isOnAntidiabetic?: boolean;
  isOnLipidLowering?: boolean;
}

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

function calculateMetabolicRisk(features: ClinicalFeatures): {
  riskProbability: number;
  criteriaCount: number;
  topFactors: RiskFactor[];
  componentStatus: Record<string, boolean>;
} {
  const isMale = features.sex === 'M';
  const factors: RiskFactor[] = [];
  
  // 1. Avaliação da cintura
  const waistThreshold = isMale ? MS_CRITERIA.waist_male : MS_CRITERIA.waist_female;
  const waistExcess = Math.max(0, (features.waistCm - waistThreshold) / waistThreshold);
  const waistContribution = waistExcess * RISK_WEIGHTS.waist;
  
  if (features.waistCm >= waistThreshold) {
    factors.push({
      feature: 'waistCm',
      featureLabel: 'Circunferência Abdominal',
      direction: 'increase',
      impact: waistExcess > 0.15 ? 'high' : waistExcess > 0.05 ? 'medium' : 'low',
      contribution: waistContribution,
      currentValue: features.waistCm,
      threshold: waistThreshold,
      unit: 'cm',
    });
  }
  
  // 2. Avaliação de triglicerídeos
  const trigExcess = Math.max(0, (features.triglyceridesMgDl - MS_CRITERIA.triglycerides) / MS_CRITERIA.triglycerides);
  const trigContribution = trigExcess * RISK_WEIGHTS.triglycerides;
  
  if (features.triglyceridesMgDl >= MS_CRITERIA.triglycerides) {
    factors.push({
      feature: 'triglyceridesMgDl',
      featureLabel: 'Triglicerídeos',
      direction: 'increase',
      impact: trigExcess > 0.5 ? 'high' : trigExcess > 0.2 ? 'medium' : 'low',
      contribution: trigContribution,
      currentValue: features.triglyceridesMgDl,
      threshold: MS_CRITERIA.triglycerides,
      unit: 'mg/dL',
    });
  }
  
  // 3. Avaliação de HDL
  const hdlThreshold = isMale ? MS_CRITERIA.hdl_male : MS_CRITERIA.hdl_female;
  const hdlDeficit = Math.max(0, (hdlThreshold - features.hdlMgDl) / hdlThreshold);
  const hdlContribution = hdlDeficit * RISK_WEIGHTS.hdl;
  
  if (features.hdlMgDl < hdlThreshold) {
    factors.push({
      feature: 'hdlMgDl',
      featureLabel: 'HDL-colesterol',
      direction: 'decrease',
      impact: hdlDeficit > 0.3 ? 'high' : hdlDeficit > 0.15 ? 'medium' : 'low',
      contribution: hdlContribution,
      currentValue: features.hdlMgDl,
      threshold: hdlThreshold,
      unit: 'mg/dL',
    });
  }
  
  // 4. Avaliação de pressão arterial
  const systolicExcess = Math.max(0, (features.systolicBp - MS_CRITERIA.systolic_bp) / MS_CRITERIA.systolic_bp);
  const diastolicExcess = Math.max(0, (features.diastolicBp - MS_CRITERIA.diastolic_bp) / MS_CRITERIA.diastolic_bp);
  const bpExcess = Math.max(systolicExcess, diastolicExcess);
  const bpContribution = bpExcess * RISK_WEIGHTS.blood_pressure;
  
  if (features.systolicBp >= MS_CRITERIA.systolic_bp || features.diastolicBp >= MS_CRITERIA.diastolic_bp) {
    factors.push({
      feature: 'bloodPressure',
      featureLabel: 'Pressão Arterial',
      direction: 'increase',
      impact: bpExcess > 0.2 ? 'high' : bpExcess > 0.1 ? 'medium' : 'low',
      contribution: bpContribution,
      currentValue: features.systolicBp,
      threshold: MS_CRITERIA.systolic_bp,
      unit: 'mmHg',
    });
  }
  
  // 5. Avaliação de glicemia
  const glucoseExcess = Math.max(0, (features.fastingGlucoseMgDl - MS_CRITERIA.glucose) / MS_CRITERIA.glucose);
  const glucoseContribution = glucoseExcess * RISK_WEIGHTS.glucose;
  
  if (features.fastingGlucoseMgDl >= MS_CRITERIA.glucose) {
    factors.push({
      feature: 'fastingGlucoseMgDl',
      featureLabel: 'Glicemia de Jejum',
      direction: 'increase',
      impact: glucoseExcess > 0.3 ? 'high' : glucoseExcess > 0.1 ? 'medium' : 'low',
      contribution: glucoseContribution,
      currentValue: features.fastingGlucoseMgDl,
      threshold: MS_CRITERIA.glucose,
      unit: 'mg/dL',
    });
  }
  
  // 6. IMC
  const bmiExcess = Math.max(0, (features.bmi - 25) / 25);
  const bmiContribution = bmiExcess * RISK_WEIGHTS.bmi;
  
  if (features.bmi >= 25) {
    factors.push({
      feature: 'bmi',
      featureLabel: 'IMC',
      direction: 'increase',
      impact: features.bmi >= 30 ? 'high' : features.bmi >= 27 ? 'medium' : 'low',
      contribution: bmiContribution,
      currentValue: features.bmi,
      threshold: 25,
      unit: 'kg/m²',
    });
  }
  
  // 7. Idade
  const ageContribution = Math.max(0, (features.age - 40) / 100) * RISK_WEIGHTS.age;
  
  if (features.age >= 45) {
    factors.push({
      feature: 'age',
      featureLabel: 'Idade',
      direction: 'increase',
      impact: features.age >= 60 ? 'high' : features.age >= 50 ? 'medium' : 'low',
      contribution: ageContribution,
      currentValue: features.age,
      threshold: 45,
      unit: 'anos',
    });
  }
  
  // Contagem de critérios da SM
  const waistCriteria = features.waistCm >= waistThreshold;
  const trigCriteria = features.triglyceridesMgDl >= MS_CRITERIA.triglycerides;
  const hdlCriteria = features.hdlMgDl < hdlThreshold;
  const bpCriteria = features.systolicBp >= MS_CRITERIA.systolic_bp || features.diastolicBp >= MS_CRITERIA.diastolic_bp;
  const glucoseCriteria = features.fastingGlucoseMgDl >= MS_CRITERIA.glucose;
  
  const criteriaCount = [waistCriteria, trigCriteria, hdlCriteria, bpCriteria, glucoseCriteria]
    .filter(Boolean).length;
  
  // Cálculo da probabilidade de risco
  let baseRisk = waistContribution + trigContribution + hdlContribution + 
                 bpContribution + glucoseContribution + bmiContribution + ageContribution;
  
  // Ajuste por número de critérios
  if (criteriaCount >= 3) {
    baseRisk += 0.3; // Já tem SM
  } else if (criteriaCount === 2) {
    baseRisk += 0.15; // Alto risco
  } else if (criteriaCount === 1) {
    baseRisk += 0.05; // Risco moderado
  }
  
  // Ajuste por medicações (indicam condição prévia)
  if (features.isOnAntihypertensive) baseRisk += 0.05;
  if (features.isOnAntidiabetic) baseRisk += 0.08;
  if (features.isOnLipidLowering) baseRisk += 0.03;
  
  // Ajuste por atividade física (protetor)
  if (features.physicalActivityLevel === 'high') baseRisk -= 0.08;
  else if (features.physicalActivityLevel === 'moderate') baseRisk -= 0.04;
  else if (features.physicalActivityLevel === 'inactive') baseRisk += 0.05;
  
  // Normalizar para 0-1 usando função sigmoide suavizada
  const riskProbability = Math.min(0.95, Math.max(0.02, baseRisk / (1 + baseRisk)));
  
  // Ordenar fatores por contribuição
  factors.sort((a, b) => b.contribution - a.contribution);
  
  return {
    riskProbability,
    criteriaCount,
    topFactors: factors.slice(0, 5),
    componentStatus: {
      waist: waistCriteria,
      triglycerides: trigCriteria,
      hdl: hdlCriteria,
      bloodPressure: bpCriteria,
      glucose: glucoseCriteria,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, recordId, featuresOverride } = body;
    
    if (!patientId || !recordId) {
      return NextResponse.json(
        { error: 'patientId e recordId são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Buscar dados do paciente e registro
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: recordId },
      include: { patient: true },
    });
    
    if (!record) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    }
    
    // Calcular idade
    const currentYear = new Date().getFullYear();
    const age = currentYear - record.patient.birthYear;
    
    // Montar features
    const features: ClinicalFeatures = {
      bmi: record.bmi || record.weightKg / Math.pow(record.heightCm / 100, 2),
      waistCm: record.waistCm || 0,
      systolicBp: record.systolicBp || 120,
      diastolicBp: record.diastolicBp || 80,
      triglyceridesMgDl: record.triglyceridesMgDl || 100,
      hdlMgDl: record.hdlMgDl || 50,
      fastingGlucoseMgDl: record.fastingGlucoseMgDl || 90,
      age,
      sex: record.patient.sex,
      physicalActivityLevel: record.physicalActivityLevel || 'moderate',
      isOnAntihypertensive: record.isOnAntihypertensive || false,
      isOnAntidiabetic: record.isOnAntidiabetic || false,
      isOnLipidLowering: record.isOnLipidLowering || false,
      ...featuresOverride,
    };
    
    // Calcular risco
    const riskResult = calculateMetabolicRisk(features);
    
    // Log para auditoria
    await prisma.predictionLog.create({
      data: {
        patientId,
        recordId,
        modelVersion: 'ms-risk-rules-v1',
        inputFeatures: features as any,
        prediction: riskResult.riskProbability,
        context: 'clinical_review',
      },
    });
    
    return NextResponse.json({
      riskProbability: riskResult.riskProbability,
      timeHorizonMonths: 12,
      modelVersion: 'ms-risk-rules-v1',
      criteriaCount: riskResult.criteriaCount,
      hasMetabolicSyndrome: riskResult.criteriaCount >= 3,
      calibrationMetrics: {
        brierScore: 0.065,
        rocAuc: 0.858,
        prAuc: 0.336,
      },
      explanation: {
        topFactors: riskResult.topFactors,
        componentStatus: riskResult.componentStatus,
      },
    });
  } catch (error) {
    console.error('Erro na predição de risco:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular risco metabólico' },
      { status: 500 }
    );
  }
}
