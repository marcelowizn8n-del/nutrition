// Tipos existentes (expenses)
export type Expense = {
  id: string
  amount: number
  category: string
  description: string
  date: Date
}

export type ExpenseFormData = Omit<Expense, 'id' | 'date'> & {
  date: string
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Housing',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Education',
  'Other'
] as const

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

// ===== TIPOS DE PACIENTES E CLÍNICOS =====

export interface MorphTargets {
  Weight: number;
  AbdomenGirth: number;
  MuscleMass: number;
  Posture: number;
  DiabetesEffect: number;
  HeartDiseaseEffect: number;
  HypertensionEffect: number;
}

export interface ClinicalRecord {
  id: string;
  year: number;
  heightCm: number;
  weightKg: number;
  diseaseCodes: string[];
  notes?: string | null;
  morphTargets: MorphTargets;
  // Campos metabólicos
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
  // Bioimpedância
  bioImpedanceFat?: number;
  bioImpedanceMuscle?: number;
  bioImpedanceWater?: number;
  bioImpedanceVisceral?: number;
  bioImpedanceBone?: number;
  bioImpedanceMetabolicAge?: number;
}

export interface Patient {
  id: string;
  name: string;
  sex: 'M' | 'F';
  birthYear: number;
  records: ClinicalRecord[];
}

export const defaultMorphTargets: MorphTargets = {
  Weight: 0.2,
  AbdomenGirth: 0.15,
  MuscleMass: 0.4,
  Posture: 0.1,
  DiabetesEffect: 0,
  HeartDiseaseEffect: 0,
  HypertensionEffect: 0,
};

export const diseaseNames: Record<string, string> = {
  'E11': 'Diabetes Tipo 2',
  'I10': 'Hipertensão',
  'I25': 'Doença Cardíaca',
};

export type UserRole = 'ADMIN' | 'NUTRITIONIST' | 'PATIENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
