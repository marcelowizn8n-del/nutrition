export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClinicalToBodyMapper, MorphTargets } from '@/lib/clinical-mapper';

// Database record type (Prisma)
interface DBClinicalRecord {
  id: string;
  year: number;
  heightCm: number;
  weightKg: number;
  diseaseCodes: string; // Stored as CSV string in SQLite
  notes: string | null;
  [key: string]: any;
}

// Frontend/API record type
interface APIClinicalRecord extends Omit<DBClinicalRecord, 'diseaseCodes'> {
  diseaseCodes: string[];
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

    // Map DB records to API records
    const recordsWithMorphs: APIClinicalRecord[] = patient.records.map((record: any) => {
      // Parse disease codes from string to array if needed
      let diseaseCodesArray: string[] = [];
      try {
        if (typeof record.diseaseCodes === 'string') {
          // Check if it looks like a JSON array
          if (record.diseaseCodes.startsWith('[')) {
            diseaseCodesArray = JSON.parse(record.diseaseCodes);
          } else {
            // Fallback for comma separated just in case
            diseaseCodesArray = record.diseaseCodes.split(',').filter((c: string) => c.length > 0);
          }
        } else if (Array.isArray(record.diseaseCodes)) {
          diseaseCodesArray = record.diseaseCodes;
        }
      } catch (e) {
        diseaseCodesArray = [];
      }

      const morphTargets = ClinicalToBodyMapper.calculate({
        heightCm: record.heightCm,
        weightKg: record.weightKg,
        age,
        sex: patient.sex as 'M' | 'F',
        diseaseCodes: diseaseCodesArray,
      });

      return {
        ...record,
        diseaseCodes: diseaseCodesArray,
        morphTargets
      };
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
