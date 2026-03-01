import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/body-metrics - Save body measurements
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    const payload = await verifyAuthToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      patientId, 
      weight, 
      height, 
      waistCircumference,
      muscleMass, 
      bodyFat, 
      waterPercentage, 
      visceralFat,
      boneMass,
      metabolicAge 
    } = body;

    if (!patientId || !weight || !height) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patientId, weight, height' }, 
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const bmi = weight / Math.pow(height / 100, 2);

    // Check if record for current year exists
    const existingRecord = await prisma.clinicalRecord.findFirst({
      where: {
        patientId,
        year: currentYear,
      },
    });

    let record;
    if (existingRecord) {
      // Update existing record
      record = await prisma.clinicalRecord.update({
        where: { id: existingRecord.id },
        data: {
          weightKg: weight,
          heightCm: height,
          waistCm: waistCircumference,
          bioImpedanceMuscle: muscleMass,
          bioImpedanceFat: bodyFat,
          bioImpedanceWater: waterPercentage,
          bioImpedanceVisceral: visceralFat,
          bioImpedanceBone: boneMass,
          bioImpedanceMetabolicAge: metabolicAge,
          bmi,
          visitDate: new Date(),
        },
      });
    } else {
      // Create new record
      record = await prisma.clinicalRecord.create({
        data: {
          patientId,
          year: currentYear,
          visitDate: new Date(),
          weightKg: weight,
          heightCm: height,
          waistCm: waistCircumference,
          bioImpedanceMuscle: muscleMass,
          bioImpedanceFat: bodyFat,
          bioImpedanceWater: waterPercentage,
          bioImpedanceVisceral: visceralFat,
          bioImpedanceBone: boneMass,
          bioImpedanceMetabolicAge: metabolicAge,
          bmi,
          diseaseCodes: '[]',
        },
      });
    }

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error('Error saving body metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar medições' },
      { status: 500 }
    );
  }
}
