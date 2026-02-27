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
  // Bioimpedance Data (0-100 scale for %)
  bioImpedanceFat?: number;      // Body Fat %
  bioImpedanceMuscle?: number;   // Muscle Mass % or kg (We'll treat as % if > 20, else kg and convert)
  bioImpedanceVisceral?: number; // Visceral Fat Rating (1-59)
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
  private static readonly BMI_MAX = 60;     // Calibração: 1.0 no modelo representa Obesidade Extrema (IMC 60)

  // Circunferência abdominal (cm) - valores de referência OMS
  private static readonly WAIST_MIN_M = 70;   // Homem magro
  private static readonly WAIST_MAX_M = 160;  // Calibração: 1.0 representa 160cm
  private static readonly WAIST_MIN_F = 60;   // Mulher magra
  private static readonly WAIST_MAX_F = 150;  // Calibração: 1.0 representa 150cm

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
    // IMC 18.5 = 0%, IMC 60 = 100%
    const normalizedBMI = this.normalize(bmi, this.BMI_MIN, this.BMI_MAX);

    // === WEIGHT: BMI vs Bioimpedance ===
    let weightModifier = 0;

    if (input.bioImpedanceFat !== undefined && input.bioImpedanceFat > 0) {
      // PRECISÃO: Usar % de Gordura Real
      // Homens: Essencial 2-5%, Atleta 6-13%, Fitness 14-17%, Médio 18-24%, Obeso 25%+
      // Mulheres: Essencial 10-13%, Atleta 14-20%, Fitness 21-24%, Médio 25-31%, Obeso 32%+

      const fat = input.bioImpedanceFat;
      let targetFatMin = 10;
      let targetFatMax = 50; // 50% de gordura é muito alto (obesidade mórbida)

      if (input.sex === 'M') {
        targetFatMin = 5;
        targetFatMax = 40;
      } else {
        targetFatMin = 15;
        targetFatMax = 50;
      }

      weightModifier = this.normalize(fat, targetFatMin, targetFatMax);

    } else {
      // FALLBACK: Usar BMI com mapeamento não-linear avançado
      // A maioria das pessoas tem IMC entre 20 e 40.
      if (bmi < 18.5) {
        // Abaixo do peso: 0 a 0.05
        weightModifier = this.normalize(bmi, 15, 18.5) * 0.05;
      } else if (bmi < 25) {
        // Peso Normal: 0.05 a 0.2
        weightModifier = 0.05 + this.normalize(bmi, 18.5, 25) * 0.15;
      } else if (bmi < 30) {
        // Sobrepeso: 0.2 a 0.45 (Crescimento mais rápido)
        const t = this.normalize(bmi, 25, 30);
        weightModifier = 0.2 + (Math.pow(t, 1.2) * 0.25);
      } else if (bmi < 40) {
        // Obesidade I/II: 0.45 a 0.8
        const t = this.normalize(bmi, 30, 40);
        weightModifier = 0.45 + (Math.pow(t, 0.8) * 0.35);
      } else {
        // Obesidade III: Saturação 0.8 a 1.0 (Logarítmica para evitar "estouro")
        const t = this.normalize(bmi, 40, 60);
        weightModifier = 0.8 + (Math.log10(1 + t * 9) / 1) * 0.2;
      }
    }

    // === ABDOMEN: Visceral Fat vs Waist vs BMI ===
    let abdomenModifier: number;

    if (input.bioImpedanceVisceral !== undefined && input.bioImpedanceVisceral > 0) {
      // PRECISÃO MÁXIMA: Gordura Visceral (Rating 1-59)
      // 1-9: Saudável
      // 10-14: Alto
      // 15+: Muito Alto (Forte indicação de Síndrome Metabólica)

      const visceral = input.bioImpedanceVisceral;

      if (visceral <= 9) {
        // Progressão linear suave para perfis saudáveis
        abdomenModifier = this.normalize(visceral, 1, 9) * 0.35;
      } else if (visceral <= 15) {
        // Ganho acelerado (barriga globosa/visceral)
        const t = this.normalize(visceral, 9, 15);
        abdomenModifier = 0.35 + (Math.pow(t, 0.7) * 0.35); // Chega a 0.7
      } else {
        // Saturação em níveis críticos
        const t = this.normalize(visceral, 15, 30);
        abdomenModifier = 0.7 + (Math.min(1, t) * 0.3);
      }

    } else if (input.waistCm) {
      const waistMin = input.sex === 'M' ? this.WAIST_MIN_M : this.WAIST_MIN_F;
      const waistMax = input.sex === 'M' ? this.WAIST_MAX_M : this.WAIST_MAX_F;

      const normalizedWaist = this.normalize(input.waistCm, waistMin, waistMax);

      // Cintura reage mais rápido que o peso geral em SM
      abdomenModifier = Math.pow(normalizedWaist, 0.8);

      // BOOST para Síndrome Metabólica Central (barriga proeminente com IMC menor)
      if (bmi < 28 && normalizedWaist > 0.6) {
        abdomenModifier = Math.min(0.8, abdomenModifier * 1.25);
      }
    } else {
      // Estimativa baseada em BMI: se sobrepeso, abdômen ganha precedência
      abdomenModifier = weightModifier * (bmi > 30 ? 1.1 : 0.95);
    }

    // === MUSCLE MASS: Bioimpedance vs Activity ===
    let muscleModifier = 0.25;

    if (input.bioImpedanceMuscle !== undefined && input.bioImpedanceMuscle > 0) {
      // PRECISÃO: Massa Muscular
      // Pode vir em % ou KG. Tentar inferir.
      let musclePercent = input.bioImpedanceMuscle;

      // Se for > 60 provavelmente é KG (assumindo pessoa média), mas em % seria impossível para a maioria.
      // Vamos assumir que se for > 55 é KG e converter para % aproximada
      if (musclePercent > 55) {
        musclePercent = (input.bioImpedanceMuscle / input.weightKg) * 100;
      }

      // Homem: 30-40% Normal, 40-50% Alto, 50%+ Atleta
      // Mulher: 25-30% Normal, 30-35% Alto, 35%+ Atleta
      let minMus = 30, maxMus = 50;
      if (input.sex === 'F') { minMus = 25; maxMus = 40; }

      muscleModifier = this.normalize(musclePercent, minMus, maxMus);

    } else if (input.physicalActivityLevel) {
      switch (input.physicalActivityLevel) {
        case 'sedentary': muscleModifier = 0.1; break;
        case 'light': muscleModifier = 0.2; break;
        case 'moderate': muscleModifier = 0.35; break;
        case 'active': muscleModifier = 0.55; break;
        case 'very_active': muscleModifier = 0.75; break;
      }
      // Efeito de "esconder" músculo sob gordura (visualmente)
      muscleModifier = muscleModifier * (1 - Math.min(0.5, normalizedBMI * 0.5));
    } else {
      // Default fallback
      muscleModifier = 0.25 * (1 - Math.min(0.5, normalizedBMI * 0.5));
    }


    // === POSTURE: Baseado na idade ===
    let postureModifier = 0;
    if (input.age > 45) {
      postureModifier = Math.min(0.4, (input.age - 45) / 100);
    }

    if (input.physicalActivityLevel) {
      switch (input.physicalActivityLevel) {
        case 'sedentary':
          weightModifier = this.clamp(weightModifier + 0.04);
          abdomenModifier = this.clamp(abdomenModifier + 0.05);
          postureModifier = this.clamp(postureModifier + 0.05);
          break;
        case 'light':
          postureModifier = this.clamp(postureModifier + 0.02);
          break;
        case 'active':
          weightModifier = this.clamp(weightModifier - 0.02);
          abdomenModifier = this.clamp(abdomenModifier - 0.03);
          postureModifier = this.clamp(postureModifier - 0.02);
          break;
        case 'very_active':
          weightModifier = this.clamp(weightModifier - 0.04);
          abdomenModifier = this.clamp(abdomenModifier - 0.05);
          postureModifier = this.clamp(postureModifier - 0.04);
          break;
      }
    }

    // === EFEITOS DE DOENÇAS (sutis) ===
    let diabetesEffect = 0;
    let heartDiseaseEffect = 0;
    let hypertensionEffect = 0;

    for (const code of input.diseaseCodes) {
      switch (code) {
        case 'E11': // Diabetes Type 2
          diabetesEffect = 0.4;
          // Se não usou bioimpedância, ajustar estimativas
          if (!input.bioImpedanceVisceral) abdomenModifier = Math.min(1, abdomenModifier + 0.1);
          if (!input.bioImpedanceFat) weightModifier = Math.min(1, weightModifier + 0.05);
          break;
        case 'I10': // Hipertensão
          hypertensionEffect = 0.35;
          if (!input.bioImpedanceFat) weightModifier = Math.min(1, weightModifier + 0.04);
          break;
        case 'I25': // Doença cardíaca
          heartDiseaseEffect = 0.4;
          postureModifier = Math.min(1, postureModifier + 0.15);
          if (!input.bioImpedanceMuscle) muscleModifier = Math.max(0, muscleModifier - 0.08);
          break;
      }
    }

    // === RESULTADO FINAL ===
    // Aplicar limite de segurança para evitar que o modelo "quebre" nas costuras (pescoço, pulsos, cintura)
    // Modelos modulares tendem a separar vértices se os morph targets passarem de 0.8 ou 0.9
    const SAFETY_CAP = 0.85;

    return {
      Weight: this.clamp(weightModifier * SAFETY_CAP), // Limita a 85% para evitar gaps
      AbdomenGirth: this.clamp(abdomenModifier * SAFETY_CAP),
      MuscleMass: this.clamp(muscleModifier), // Músculo geralmente deforma menos, pode manter
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
