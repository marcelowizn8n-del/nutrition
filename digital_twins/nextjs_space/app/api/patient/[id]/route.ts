export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        records: {
          orderBy: { year: 'asc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Calculate morph targets for each record
    const currentYear = new Date().getFullYear();
    const age = currentYear - patient.birthYear;
    const recordsWithMorphs: ClinicalRecord[] = patient.records.map((record: ClinicalRecord) => {
      const morphTargets = ClinicalToBodyMapper.calculate({
        heightCm: record.heightCm,
        weightKg: record.weightKg,
        age,
        sex: patient.sex as 'M' | 'F',
        diseaseCodes: record.diseaseCodes,
      });
      return { ...record, morphTargets };
    });

    return NextResponse.json({
      success: true,
      patient: { ...patient, records: recordsWithMorphs },
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}
