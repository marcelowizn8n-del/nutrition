export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClinicalToBodyMapper, MorphTargets } from '@/lib/clinical-mapper';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

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
        // Parse disease codes once
        let parsedDiseaseCodes: string[] = [];
        try {
          if (typeof record.diseaseCodes === 'string') {
            parsedDiseaseCodes = JSON.parse(record.diseaseCodes);
          } else {
            parsedDiseaseCodes = record.diseaseCodes || [];
          }
        } catch (e) {
          console.error('Error parsing disease codes:', e);
          parsedDiseaseCodes = [];
        }

        const morphTargets = ClinicalToBodyMapper.calculate({
          heightCm: record.heightCm,
          weightKg: record.weightKg,
          age,
          sex: patient.sex as 'M' | 'F',
          diseaseCodes: parsedDiseaseCodes,
          bioImpedanceFat: record.bioImpedanceFat,
          bioImpedanceMuscle: record.bioImpedanceMuscle,
          bioImpedanceVisceral: record.bioImpedanceVisceral,
        });

        return {
          ...record,
          morphTargets,
          diseaseCodes: parsedDiseaseCodes, // Explicitly return array to frontend
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
          // Bioimpedance
          bioImpedanceFat: record.bioImpedanceFat,
          bioImpedanceMuscle: record.bioImpedanceMuscle,
          bioImpedanceWater: record.bioImpedanceWater,
          bioImpedanceVisceral: record.bioImpedanceVisceral,
          bioImpedanceBone: record.bioImpedanceBone,
          bioImpedanceMetabolicAge: record.bioImpedanceMetabolicAge,
        };
      }),
    }));

    return NextResponse.json({ success: true, patients: patientsWithMorphs });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: JSON.stringify(error, Object.getOwnPropertyNames(error))
      },
      { status: 500 }
    );
  }
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = await verifyAuthToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, sex, birthDate, phone, cpf, height, weight, muscleMass, bodyFat, waterPercentage, visceralFat, waistCircumference } = body;

    // Validate required fields
    if (!name || !sex || !birthDate || !height || !weight) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, sexo, data de nascimento, altura e peso' }, { status: 400 });
    }

    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();

    // Get default organization
    let organization = await prisma.organization.findFirst({
      where: { slug: 'demo' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Demo Organization',
          slug: 'demo'
        }
      });
    }

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        name,
        sex,
        birthYear,
        birthDate: new Date(birthDate),
        organizationId: organization.id,
        records: {
          create: {
            year: currentYear,
            visitDate: new Date(),
            heightCm: parseFloat(height),
            weightKg: parseFloat(weight),
            diseaseCodes: '[]',
            waistCm: waistCircumference ? parseFloat(waistCircumference) : null,
            bioImpedanceFat: bodyFat ? parseFloat(bodyFat) : null,
            bioImpedanceMuscle: muscleMass ? parseFloat(muscleMass) : null,
            bioImpedanceWater: waterPercentage ? parseFloat(waterPercentage) : null,
            bioImpedanceVisceral: visceralFat ? parseFloat(visceralFat) : null,
            bmi: parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2),
          }
        }
      },
      include: {
        records: true
      }
    });

    return NextResponse.json({ success: true, patient }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar paciente' },
      { status: 500 }
    );
  }
}
