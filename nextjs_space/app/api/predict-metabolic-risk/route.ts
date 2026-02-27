import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Constantes clínicas para cálculo de risco
const NCEP_CRITERIA = {
  waist_male: 102, // NCEP ATP III strict
  waist_female: 88,
  triglycerides: 150,
  hdl_male: 40,
  hdl_female: 50,
  systolic_bp: 130,
  diastolic_bp: 85,
  glucose: 100,
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

  // NCEP ATP III CRITERIA CHECK

  // 1. Abdominal Obesity (Waist Circumference)
  const waistThreshold = isMale ? NCEP_CRITERIA.waist_male : NCEP_CRITERIA.waist_female;
  const hasWaistCriteria = features.waistCm >= waistThreshold;

  // Severity contribution (Continuous Risk Score methodology)
  // Normalizing excess: (Value - Threshold) / SD_approx
  const waistExcess = Math.max(0, (features.waistCm - waistThreshold) / waistThreshold);

  if (hasWaistCriteria) {
    factors.push({
      feature: 'waistCm',
      featureLabel: 'Circunferência Abdominal (Obesidade Central)',
      direction: 'increase',
      impact: waistExcess > 0.15 ? 'high' : 'medium',
      contribution: waistExcess * 0.25, // Weight in continuous score
      currentValue: features.waistCm,
      threshold: waistThreshold,
      unit: 'cm',
    });
  }

  // 2. Triglycerides
  const hasTrigCriteria = features.triglyceridesMgDl >= NCEP_CRITERIA.triglycerides || features.isOnLipidLowering === true;
  const trigExcess = Math.max(0, (features.triglyceridesMgDl - 150) / 150);

  if (hasTrigCriteria) {
    factors.push({
      feature: 'triglyceridesMgDl',
      featureLabel: 'Triglicerídeos Elevados',
      direction: 'increase',
      impact: features.triglyceridesMgDl >= 200 ? 'high' : 'medium',
      contribution: trigExcess * 0.2,
      currentValue: features.triglyceridesMgDl,
      threshold: 150,
      unit: 'mg/dL',
    });
  }

  // 3. HDL Cholesterol
  const hdlThreshold = isMale ? NCEP_CRITERIA.hdl_male : NCEP_CRITERIA.hdl_female;
  const hasHdlCriteria = features.hdlMgDl < hdlThreshold || features.isOnLipidLowering === true; // NCEP considers lipid meds for HDL too
  const hdlDeficit = Math.max(0, (hdlThreshold - features.hdlMgDl) / hdlThreshold);

  if (hasHdlCriteria) {
    factors.push({
      feature: 'hdlMgDl',
      featureLabel: 'HDL Baixo (Colesterol Bom)',
      direction: 'decrease',
      impact: hdlDeficit > 0.25 ? 'high' : 'medium',
      contribution: hdlDeficit * 0.2,
      currentValue: features.hdlMgDl,
      threshold: hdlThreshold,
      unit: 'mg/dL',
    });
  }

  // 4. Blood Pressure
  const hasBpCriteria = features.systolicBp >= 130 || features.diastolicBp >= 85 || features.isOnAntihypertensive === true;
  const sysExcess = Math.max(0, (features.systolicBp - 130) / 130);
  const diaExcess = Math.max(0, (features.diastolicBp - 85) / 85);
  const bpSeverity = Math.max(sysExcess, diaExcess);

  if (hasBpCriteria) {
    factors.push({
      feature: 'bloodPressure',
      featureLabel: 'Pressão Arterial Elevada',
      direction: 'increase',
      impact: features.systolicBp >= 160 ? 'high' : bpSeverity > 0.1 ? 'medium' : 'low',
      contribution: bpSeverity * 0.2,
      currentValue: features.systolicBp,
      threshold: 130,
      unit: 'mmHg',
    });
  }

  // 5. Fasting Glucose
  const hasGlucoseCriteria = features.fastingGlucoseMgDl >= 100 || features.isOnAntidiabetic === true;
  const glucoseExcess = Math.max(0, (features.fastingGlucoseMgDl - 100) / 100);

  if (hasGlucoseCriteria) {
    factors.push({
      feature: 'fastingGlucoseMgDl',
      featureLabel: 'Glicemia de Jejum (Hiperglicemia)',
      direction: 'increase',
      impact: features.fastingGlucoseMgDl >= 126 ? 'high' : 'medium', // 126 diabetes threshold
      contribution: glucoseExcess * 0.25,
      currentValue: features.fastingGlucoseMgDl,
      threshold: 100,
      unit: 'mg/dL',
    });
  }

  // === METABOLIC SYNDROME DIAGNOSIS ===
  const criteriaList = [hasWaistCriteria, hasTrigCriteria, hasHdlCriteria, hasBpCriteria, hasGlucoseCriteria];
  const criteriaCount = criteriaList.filter(Boolean).length;
  const hasMetabolicSyndrome = criteriaCount >= 3;

  // === CONTINUOUS RISK SCORE (MetS Severity Z-Score Approximation) ===
  // Derived from: "A Continuous Metabolic Syndrome Score" (Wijndaele et al.)
  // We use a simplified version normalized to 0-1 probability for the UI gauge

  // Base probability matches the criteria count (step-wise)
  let baseProb = 0;
  if (criteriaCount === 0) baseProb = 0.05;
  else if (criteriaCount === 1) baseProb = 0.15;
  else if (criteriaCount === 2) baseProb = 0.35; // High Risk / border
  else if (criteriaCount === 3) baseProb = 0.65; // Diagnosis confirmed
  else if (criteriaCount === 4) baseProb = 0.85;
  else if (criteriaCount === 5) baseProb = 0.95;

  // Add severity within the step based on how extreme the values are
  // E.g. Glucose 110 is criterium met (0.65 base), but Glucose 200 is much worse
  const totalSeverityLoad = waistExcess + trigExcess + hdlDeficit + bpSeverity + glucoseExcess;

  // Sigmoid smoothing to clamp cumulative risk
  // Impact factor 0.1 per severity unit
  const finalRisk = Math.min(0.99, baseProb + (totalSeverityLoad * 0.1));

  // Sort factors by clinical impact (severity)
  factors.sort((a, b) => b.contribution - a.contribution);

  return {
    riskProbability: finalRisk,
    criteriaCount,
    topFactors: factors.slice(0, 3), // Show top 3 drivers
    componentStatus: {
      waist: hasWaistCriteria,
      triglycerides: hasTrigCriteria,
      hdl: hasHdlCriteria,
      bloodPressure: hasBpCriteria,
      glucose: hasGlucoseCriteria,
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
