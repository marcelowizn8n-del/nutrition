export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClinicalToBodyMapper, MorphTargets } from '@/lib/clinical-mapper';

interface ClinicalRecord {
  id: string;
  year: number;
  heightCm: number;
  weightKg: number;
  diseaseCodes: string[];
  notes: string | null;
  morphTargets?: MorphTargets;
  // Campos metabólicos
  bmi?: number | null;
  waistCm?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  triglyceridesMgDl?: number | null;
  hdlMgDl?: number | null;
  ldlMgDl?: number | null;
  totalCholesterolMgDl?: number | null;
  fastingGlucoseMgDl?: number | null;
  hasMetabolicSyndrome?: boolean | null;
  physicalActivityLevel?: string | null;
  smokingStatus?: string | null;
  isOnAntihypertensive?: boolean | null;
  isOnAntidiabetic?: boolean | null;
  isOnLipidLowering?: boolean | null;
}

interface Patient {
  id: string;
  name: string;
  sex: string;
  birthYear: number;
  records: ClinicalRecord[];
}

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        records: {
          orderBy: { year: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate morph targets for each record
    const patientsWithMorphs: Patient[] = patients.map((patient: any) => ({
      ...patient,
      records: patient.records.map((record: any) => {
        const currentYear = new Date().getFullYear();
        const age = currentYear - patient.birthYear;
        const morphTargets = ClinicalToBodyMapper.calculate({
          heightCm: record.heightCm,
          weightKg: record.weightKg,
          age,
          sex: patient.sex as 'M' | 'F',
          diseaseCodes: record.diseaseCodes || [],
        });
        return { 
          ...record, 
          morphTargets,
          // Garantir que os campos metabólicos estão incluídos
          bmi: record.bmi,
          waistCm: record.waistCm,
          systolicBp: record.systolicBp,
          diastolicBp: record.diastolicBp,
          triglyceridesMgDl: record.triglyceridesMgDl,
          hdlMgDl: record.hdlMgDl,
          ldlMgDl: record.ldlMgDl,
          totalCholesterolMgDl: record.totalCholesterolMgDl,
          fastingGlucoseMgDl: record.fastingGlucoseMgDl,
          hasMetabolicSyndrome: record.hasMetabolicSyndrome,
          physicalActivityLevel: record.physicalActivityLevel,
          smokingStatus: record.smokingStatus,
          isOnAntihypertensive: record.isOnAntihypertensive,
          isOnAntidiabetic: record.isOnAntidiabetic,
          isOnLipidLowering: record.isOnLipidLowering,
        };
      }),
    }));

    return NextResponse.json({ success: true, patients: patientsWithMorphs });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}
