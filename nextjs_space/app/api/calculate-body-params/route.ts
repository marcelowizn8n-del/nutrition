export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ClinicalToBodyMapper, PatientInput } from '@/lib/clinical-mapper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: PatientInput = {
      heightCm: body.heightCm ?? body.height_cm ?? 170,
      weightKg: body.weightKg ?? body.weight_kg ?? 70,
      age: body.age ?? 40,
      sex: body.sex ?? 'M',
      diseaseCodes: body.diseaseCodes ?? body.disease_codes ?? [],
    };

    const morphTargets = ClinicalToBodyMapper.calculate(input);

    return NextResponse.json({
      success: true,
      input,
      morphTargets,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
