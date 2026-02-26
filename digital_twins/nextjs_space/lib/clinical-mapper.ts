// ClinicalToBodyMapper - Evidence-based clinical parameter calculation
// FIDELIDADE AOS DADOS: Mapeia dados reais do paciente para morph targets

export interface PatientInput {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: 'M' | 'F';
  diseaseCodes: string[];
  // Dados opcionais para maior fidelidade
  waistCm?: number;
  physicalActivityLevel?: string;
}

export interface MorphTargets {
  Weight: number;
  AbdomenGirth: number;
  MuscleMass: number;
  Posture: number;
  DiabetesEffect: number;
  HeartDiseaseEffect: number;
  HypertensionEffect: number;
}

export class ClinicalToBodyMapper {
  // Ranges baseados em dados epidemiológicos reais
  // IMC
  private static readonly BMI_MIN = 18.5;   // Limite inferior saudável
  private static readonly BMI_MAX = 40;     // Obesidade grau III
  
  // Circunferência abdominal (cm) - valores de referência OMS
  private static readonly WAIST_MIN_M = 70;   // Homem magro
  private static readonly WAIST_MAX_M = 130;  // Obesidade abdominal severa
  private static readonly WAIST_MIN_F = 60;   // Mulher magra
  private static readonly WAIST_MAX_F = 120;  // Obesidade abdominal severa

  // Normaliza valor para 0-1 com base no range
  private static normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // Clamp value to 0-1 range
  private static clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  static calculate(input: PatientInput): MorphTargets {
    const heightM = input.heightCm / 100;
    const bmi = input.weightKg / (heightM * heightM);
    
    // === WEIGHT: Baseado no IMC real ===
    // IMC 18.5 = 0%, IMC 40 = 100% - valores MODERADOS
    const normalizedBMI = this.normalize(bmi, this.BMI_MIN, this.BMI_MAX);
    let weightModifier = normalizedBMI * 0.5; // Max 50%
    
    // === ABDOMEN: Usa circunferência abdominal REAL se disponível ===
    let abdomenModifier: number;
    if (input.waistCm) {
      const waistMin = input.sex === 'M' ? this.WAIST_MIN_M : this.WAIST_MIN_F;
      const waistMax = input.sex === 'M' ? this.WAIST_MAX_M : this.WAIST_MAX_F;
      abdomenModifier = this.normalize(input.waistCm, waistMin, waistMax) * 0.6; // Max 60%
    } else {
      abdomenModifier = normalizedBMI * 0.55;
    }
    
    // === MUSCLE MASS: Baseado em atividade física ===
    let muscleModifier = 0.25;
    if (input.physicalActivityLevel) {
      switch (input.physicalActivityLevel) {
        case 'sedentary': muscleModifier = 0.1; break;
        case 'light': muscleModifier = 0.2; break;
        case 'moderate': muscleModifier = 0.35; break;
        case 'active': muscleModifier = 0.5; break;
        case 'very_active': muscleModifier = 0.7; break;
      }
    }
    muscleModifier = muscleModifier * (1 - normalizedBMI * 0.3);
    
    // === POSTURE: Baseado na idade ===
    let postureModifier = 0;
    if (input.age > 45) {
      postureModifier = Math.min(0.4, (input.age - 45) / 100);
    }
    
    // === EFEITOS DE DOENÇAS (sutis) ===
    let diabetesEffect = 0;
    let heartDiseaseEffect = 0;
    let hypertensionEffect = 0;

    for (const code of input.diseaseCodes) {
      switch (code) {
        case 'E11': // Diabetes Type 2
          diabetesEffect = 0.4;
          abdomenModifier = Math.min(1, abdomenModifier + 0.1);
          weightModifier = Math.min(1, weightModifier + 0.05);
          break;
        case 'I10': // Hipertensão
          hypertensionEffect = 0.35;
          weightModifier = Math.min(1, weightModifier + 0.04);
          break;
        case 'I25': // Doença cardíaca
          heartDiseaseEffect = 0.4;
          postureModifier = Math.min(1, postureModifier + 0.15);
          muscleModifier = Math.max(0, muscleModifier - 0.08);
          break;
      }
    }

    return {
      Weight: this.clamp(weightModifier),
      AbdomenGirth: this.clamp(abdomenModifier),
      MuscleMass: this.clamp(muscleModifier),
      Posture: this.clamp(postureModifier),
      DiabetesEffect: diabetesEffect,
      HeartDiseaseEffect: heartDiseaseEffect,
      HypertensionEffect: hypertensionEffect,
    };
  }

  // Interpolate between two morph target states
  static interpolate(start: MorphTargets, end: MorphTargets, t: number): MorphTargets {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    return {
      Weight: lerp(start.Weight, end.Weight, t),
      AbdomenGirth: lerp(start.AbdomenGirth, end.AbdomenGirth, t),
      MuscleMass: lerp(start.MuscleMass, end.MuscleMass, t),
      Posture: lerp(start.Posture, end.Posture, t),
      DiabetesEffect: lerp(start.DiabetesEffect, end.DiabetesEffect, t),
      HeartDiseaseEffect: lerp(start.HeartDiseaseEffect, end.HeartDiseaseEffect, t),
      HypertensionEffect: lerp(start.HypertensionEffect, end.HypertensionEffect, t),
    };
  }
}
