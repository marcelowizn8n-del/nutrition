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

// Efeitos esperados de intervenções baseados em evidências clínicas
const INTERVENTION_EFFECTS = {
  // Perda de peso: efeitos por cada 5kg perdidos
  weightLoss5kg: {
    bmiChange: -1.8,
    waistChange: -4.5,
    triglyceridesChange: -20,
    hdlChange: 3,
    systolicBpChange: -5,
    diastolicBpChange: -3,
    glucoseChange: -5,
  },
  // Exercício regular: efeitos após 3 meses
  exerciseModerate: {
    bmiChange: -0.5,
    waistChange: -2.0,
    triglyceridesChange: -15,
    hdlChange: 5,
    systolicBpChange: -4,
    diastolicBpChange: -3,
    glucoseChange: -3,
  },
  exerciseHigh: {
    bmiChange: -1.0,
    waistChange: -3.5,
    triglyceridesChange: -25,
    hdlChange: 8,
    systolicBpChange: -6,
    diastolicBpChange: -4,
    glucoseChange: -5,
  },
  // Medicamentos
  startStatin: {
    triglyceridesChange: -40,
    hdlChange: 5,
  },
  startMetformin: {
    glucoseChange: -25,
    bmiChange: -0.5,
  },
  startAntihypertensive: {
    systolicBpChange: -15,
    diastolicBpChange: -10,
  },
};

interface SimulationRequest {
  patientId: string;
  recordId: string;
  interventions: {
    weightLossKg?: number;
    activityLevelChange?: 'inactive' | 'moderate' | 'high';
    startStatin?: boolean;
    startMetformin?: boolean;
    startAntihypertensive?: boolean;
    customOverrides?: Record<string, number>;
  };
}

function calculateRiskFromFeatures(features: any): number {
  const isMale = features.sex === 'M';
  
  const waistThreshold = isMale ? MS_CRITERIA.waist_male : MS_CRITERIA.waist_female;
  const waistExcess = Math.max(0, (features.waistCm - waistThreshold) / waistThreshold);
  const waistContribution = waistExcess * RISK_WEIGHTS.waist;
  
  const trigExcess = Math.max(0, (features.triglyceridesMgDl - MS_CRITERIA.triglycerides) / MS_CRITERIA.triglycerides);
  const trigContribution = trigExcess * RISK_WEIGHTS.triglycerides;
  
  const hdlThreshold = isMale ? MS_CRITERIA.hdl_male : MS_CRITERIA.hdl_female;
  const hdlDeficit = Math.max(0, (hdlThreshold - features.hdlMgDl) / hdlThreshold);
  const hdlContribution = hdlDeficit * RISK_WEIGHTS.hdl;
  
  const systolicExcess = Math.max(0, (features.systolicBp - MS_CRITERIA.systolic_bp) / MS_CRITERIA.systolic_bp);
  const diastolicExcess = Math.max(0, (features.diastolicBp - MS_CRITERIA.diastolic_bp) / MS_CRITERIA.diastolic_bp);
  const bpExcess = Math.max(systolicExcess, diastolicExcess);
  const bpContribution = bpExcess * RISK_WEIGHTS.blood_pressure;
  
  const glucoseExcess = Math.max(0, (features.fastingGlucoseMgDl - MS_CRITERIA.glucose) / MS_CRITERIA.glucose);
  const glucoseContribution = glucoseExcess * RISK_WEIGHTS.glucose;
  
  const bmiExcess = Math.max(0, (features.bmi - 25) / 25);
  const bmiContribution = bmiExcess * RISK_WEIGHTS.bmi;
  
  const ageContribution = Math.max(0, (features.age - 40) / 100) * RISK_WEIGHTS.age;
  
  // Contagem de critérios
  const waistCriteria = features.waistCm >= waistThreshold;
  const trigCriteria = features.triglyceridesMgDl >= MS_CRITERIA.triglycerides;
  const hdlCriteria = features.hdlMgDl < hdlThreshold;
  const bpCriteria = features.systolicBp >= MS_CRITERIA.systolic_bp || features.diastolicBp >= MS_CRITERIA.diastolic_bp;
  const glucoseCriteria = features.fastingGlucoseMgDl >= MS_CRITERIA.glucose;
  
  const criteriaCount = [waistCriteria, trigCriteria, hdlCriteria, bpCriteria, glucoseCriteria]
    .filter(Boolean).length;
  
  let baseRisk = waistContribution + trigContribution + hdlContribution + 
                 bpContribution + glucoseContribution + bmiContribution + ageContribution;
  
  if (criteriaCount >= 3) baseRisk += 0.3;
  else if (criteriaCount === 2) baseRisk += 0.15;
  else if (criteriaCount === 1) baseRisk += 0.05;
  
  if (features.physicalActivityLevel === 'high') baseRisk -= 0.08;
  else if (features.physicalActivityLevel === 'moderate') baseRisk -= 0.04;
  else if (features.physicalActivityLevel === 'inactive') baseRisk += 0.05;
  
  return Math.min(0.95, Math.max(0.02, baseRisk / (1 + baseRisk)));
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    const { patientId, recordId, interventions } = body;
    
    if (!patientId || !recordId) {
      return NextResponse.json(
        { error: 'patientId e recordId são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Buscar dados atuais
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
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - record.patient.birthYear;
    
    // Features base (atuais)
    const baseFeatures = {
      bmi: record.bmi || record.weightKg / Math.pow(record.heightCm / 100, 2),
      waistCm: record.waistCm || 85,
      systolicBp: record.systolicBp || 120,
      diastolicBp: record.diastolicBp || 80,
      triglyceridesMgDl: record.triglyceridesMgDl || 100,
      hdlMgDl: record.hdlMgDl || 50,
      fastingGlucoseMgDl: record.fastingGlucoseMgDl || 90,
      age,
      sex: record.patient.sex,
      physicalActivityLevel: record.physicalActivityLevel || 'moderate',
    };
    
    // Calcular risco base
    const baseRisk = calculateRiskFromFeatures(baseFeatures);
    
    // Aplicar intervenções simuladas
    const projectedFeatures = { ...baseFeatures };
    const appliedInterventions: string[] = [];
    const featureChanges: Record<string, { before: number; after: number; unit: string }> = {};
    
    // Perda de peso
    if (interventions.weightLossKg && interventions.weightLossKg > 0) {
      const weightUnits = interventions.weightLossKg / 5;
      const effects = INTERVENTION_EFFECTS.weightLoss5kg;
      
      const oldBmi = projectedFeatures.bmi;
      const oldWaist = projectedFeatures.waistCm;
      const oldTrig = projectedFeatures.triglyceridesMgDl;
      const oldHdl = projectedFeatures.hdlMgDl;
      const oldSys = projectedFeatures.systolicBp;
      const oldDia = projectedFeatures.diastolicBp;
      const oldGlu = projectedFeatures.fastingGlucoseMgDl;
      
      projectedFeatures.bmi = Math.max(18, projectedFeatures.bmi + effects.bmiChange * weightUnits);
      projectedFeatures.waistCm = Math.max(60, projectedFeatures.waistCm + effects.waistChange * weightUnits);
      projectedFeatures.triglyceridesMgDl = Math.max(50, projectedFeatures.triglyceridesMgDl + effects.triglyceridesChange * weightUnits);
      projectedFeatures.hdlMgDl = Math.min(100, projectedFeatures.hdlMgDl + effects.hdlChange * weightUnits);
      projectedFeatures.systolicBp = Math.max(90, projectedFeatures.systolicBp + effects.systolicBpChange * weightUnits);
      projectedFeatures.diastolicBp = Math.max(60, projectedFeatures.diastolicBp + effects.diastolicBpChange * weightUnits);
      projectedFeatures.fastingGlucoseMgDl = Math.max(70, projectedFeatures.fastingGlucoseMgDl + effects.glucoseChange * weightUnits);
      
      appliedInterventions.push(`Perda de ${interventions.weightLossKg}kg`);
      featureChanges.bmi = { before: oldBmi, after: projectedFeatures.bmi, unit: 'kg/m²' };
      featureChanges.waistCm = { before: oldWaist, after: projectedFeatures.waistCm, unit: 'cm' };
      featureChanges.triglyceridesMgDl = { before: oldTrig, after: projectedFeatures.triglyceridesMgDl, unit: 'mg/dL' };
      featureChanges.hdlMgDl = { before: oldHdl, after: projectedFeatures.hdlMgDl, unit: 'mg/dL' };
      featureChanges.systolicBp = { before: oldSys, after: projectedFeatures.systolicBp, unit: 'mmHg' };
      featureChanges.fastingGlucoseMgDl = { before: oldGlu, after: projectedFeatures.fastingGlucoseMgDl, unit: 'mg/dL' };
    }
    
    // Mudança de atividade física
    if (interventions.activityLevelChange) {
      const currentLevel = baseFeatures.physicalActivityLevel;
      const newLevel = interventions.activityLevelChange;
      
      if (newLevel !== currentLevel) {
        let effects;
        if (newLevel === 'high') {
          effects = INTERVENTION_EFFECTS.exerciseHigh;
        } else if (newLevel === 'moderate' && currentLevel === 'inactive') {
          effects = INTERVENTION_EFFECTS.exerciseModerate;
        }
        
        if (effects) {
          projectedFeatures.bmi = Math.max(18, projectedFeatures.bmi + effects.bmiChange);
          projectedFeatures.waistCm = Math.max(60, projectedFeatures.waistCm + effects.waistChange);
          projectedFeatures.triglyceridesMgDl = Math.max(50, projectedFeatures.triglyceridesMgDl + effects.triglyceridesChange);
          projectedFeatures.hdlMgDl = Math.min(100, projectedFeatures.hdlMgDl + effects.hdlChange);
          projectedFeatures.systolicBp = Math.max(90, projectedFeatures.systolicBp + effects.systolicBpChange);
          projectedFeatures.diastolicBp = Math.max(60, projectedFeatures.diastolicBp + effects.diastolicBpChange);
          projectedFeatures.fastingGlucoseMgDl = Math.max(70, projectedFeatures.fastingGlucoseMgDl + effects.glucoseChange);
        }
        
        projectedFeatures.physicalActivityLevel = newLevel;
        appliedInterventions.push(`Atividade física: ${currentLevel} → ${newLevel}`);
      }
    }
    
    // Estatina
    if (interventions.startStatin) {
      const effects = INTERVENTION_EFFECTS.startStatin;
      const oldTrig = projectedFeatures.triglyceridesMgDl;
      const oldHdl = projectedFeatures.hdlMgDl;
      
      projectedFeatures.triglyceridesMgDl = Math.max(50, projectedFeatures.triglyceridesMgDl + effects.triglyceridesChange);
      projectedFeatures.hdlMgDl = Math.min(100, projectedFeatures.hdlMgDl + effects.hdlChange);
      
      appliedInterventions.push('Início de estatina');
      if (!featureChanges.triglyceridesMgDl) {
        featureChanges.triglyceridesMgDl = { before: oldTrig, after: projectedFeatures.triglyceridesMgDl, unit: 'mg/dL' };
      }
      if (!featureChanges.hdlMgDl) {
        featureChanges.hdlMgDl = { before: oldHdl, after: projectedFeatures.hdlMgDl, unit: 'mg/dL' };
      }
    }
    
    // Metformina
    if (interventions.startMetformin) {
      const effects = INTERVENTION_EFFECTS.startMetformin;
      const oldGlu = projectedFeatures.fastingGlucoseMgDl;
      
      projectedFeatures.fastingGlucoseMgDl = Math.max(70, projectedFeatures.fastingGlucoseMgDl + effects.glucoseChange);
      projectedFeatures.bmi = Math.max(18, projectedFeatures.bmi + effects.bmiChange);
      
      appliedInterventions.push('Início de metformina');
      if (!featureChanges.fastingGlucoseMgDl) {
        featureChanges.fastingGlucoseMgDl = { before: oldGlu, after: projectedFeatures.fastingGlucoseMgDl, unit: 'mg/dL' };
      }
    }
    
    // Anti-hipertensivo
    if (interventions.startAntihypertensive) {
      const effects = INTERVENTION_EFFECTS.startAntihypertensive;
      const oldSys = projectedFeatures.systolicBp;
      const oldDia = projectedFeatures.diastolicBp;
      
      projectedFeatures.systolicBp = Math.max(90, projectedFeatures.systolicBp + effects.systolicBpChange);
      projectedFeatures.diastolicBp = Math.max(60, projectedFeatures.diastolicBp + effects.diastolicBpChange);
      
      appliedInterventions.push('Início de anti-hipertensivo');
      if (!featureChanges.systolicBp) {
        featureChanges.systolicBp = { before: oldSys, after: projectedFeatures.systolicBp, unit: 'mmHg' };
      }
    }
    
    // Overrides customizados
    if (interventions.customOverrides) {
      Object.entries(interventions.customOverrides).forEach(([key, value]) => {
        if (key in projectedFeatures) {
          (projectedFeatures as any)[key] = value;
          appliedInterventions.push(`${key}: ${value}`);
        }
      });
    }
    
    // Calcular risco projetado
    const projectedRisk = calculateRiskFromFeatures(projectedFeatures);
    const riskReduction = baseRisk - projectedRisk;
    const riskReductionPercent = (riskReduction / baseRisk) * 100;
    
    // Determinar NNT aproximado (Number Needed to Treat)
    const absoluteRiskReduction = riskReduction;
    const nnt = absoluteRiskReduction > 0 ? Math.round(1 / absoluteRiskReduction) : null;
    
    return NextResponse.json({
      baseline: {
        riskProbability: baseRisk,
        features: baseFeatures,
      },
      projected: {
        riskProbability: projectedRisk,
        features: projectedFeatures,
      },
      impact: {
        absoluteReduction: riskReduction,
        relativeReductionPercent: riskReductionPercent,
        nnt,
        featureChanges,
      },
      appliedInterventions,
      modelVersion: 'ms-simulation-v1',
      disclaimer: 'Simulação baseada em evidências epidemiológicas. Resultados individuais podem variar.',
    });
  } catch (error) {
    console.error('Erro na simulação:', error);
    return NextResponse.json(
      { error: 'Erro ao simular intervenção' },
      { status: 500 }
    );
  }
}
