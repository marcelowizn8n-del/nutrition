import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to verify authentication
async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  const payload = await verifyAuthToken(token);
  return payload;
}

// GET /api/patients/[id] - Get single patient with records
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        records: {
          orderBy: { year: 'desc' },
        },
        mealPlans: {
          include: {
            recipes: {
              include: {
                recipe: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json({ error: 'Erro ao buscar paciente' }, { status: 500 });
  }
}

// PUT /api/patients/[id] - Update patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      sex,
      birthDate,
      phone,
      cpf,
      height,
      weight,
      muscleMass,
      bodyFat,
      waterPercentage,
      visceralFat,
      waistCircumference,
    } = body;

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      include: { records: { orderBy: { year: 'desc' }, take: 1 } },
    });

    if (!existingPatient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // Update patient data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (sex) updateData.sex = sex;
    if (birthDate) {
      updateData.birthDate = new Date(birthDate);
      updateData.birthYear = new Date(birthDate).getFullYear();
    }

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });

    // Update or create clinical record for current year
    const currentYear = new Date().getFullYear();
    const existingRecord = existingPatient.records[0];

    if (height || weight || muscleMass || bodyFat || waterPercentage || visceralFat || waistCircumference) {
      const recordData: any = {};
      if (height) recordData.heightCm = parseFloat(height);
      if (weight) recordData.weightKg = parseFloat(weight);
      if (waistCircumference) recordData.waistCm = parseFloat(waistCircumference);
      if (muscleMass) recordData.bioImpedanceMuscle = parseFloat(muscleMass);
      if (bodyFat) recordData.bioImpedanceFat = parseFloat(bodyFat);
      if (waterPercentage) recordData.bioImpedanceWater = parseFloat(waterPercentage);
      if (visceralFat) recordData.bioImpedanceVisceral = parseFloat(visceralFat);

      // Calculate BMI if weight and height are provided
      const finalWeight = weight ? parseFloat(weight) : existingRecord?.weightKg;
      const finalHeight = height ? parseFloat(height) : existingRecord?.heightCm;
      if (finalWeight && finalHeight) {
        recordData.bmi = finalWeight / Math.pow(finalHeight / 100, 2);
      }

      if (existingRecord && existingRecord.year === currentYear) {
        // Update existing record
        await prisma.clinicalRecord.update({
          where: { id: existingRecord.id },
          data: recordData,
        });
      } else {
        // Create new record for current year
        await prisma.clinicalRecord.create({
          data: {
            patientId: id,
            year: currentYear,
            heightCm: finalHeight || 170,
            weightKg: finalWeight || 70,
            diseaseCodes: '[]',
            ...recordData,
          },
        });
      }
    }

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 });
  }
}

// DELETE /api/patients/[id] - Delete patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // Delete patient (cascade will delete related records)
    await prisma.patient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Erro ao excluir paciente' }, { status: 500 });
  }
}
