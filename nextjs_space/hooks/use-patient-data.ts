'use client';

import { useState, useEffect, useMemo } from 'react';
import { Patient, ClinicalRecord, defaultMorphTargets, MorphTargets } from '@/lib/types';
import { ClinicalToBodyMapper } from '@/lib/clinical-mapper';

function interpolateNumber(a: number, b: number, t: number): number {
  if (isNaN(a) || isNaN(b) || isNaN(t)) return a || 0;
  return a + (b - a) * t;
}

export function usePatientData() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        if (data?.success && data?.patients) {
          const patientsWithMorphTargets = data.patients.map((patient: Patient) => {
            try {
              return {
                ...patient,
                records: patient.records.map((record: ClinicalRecord) => {
                  try {
                    return {
                      ...record,
                      morphTargets: ClinicalToBodyMapper.calculate({
                        heightCm: record.heightCm || 170,
                        weightKg: record.weightKg || 70,
                        age: patient.birthYear ? (record.year || new Date().getFullYear()) - patient.birthYear : 40,
                        sex: (patient.sex === 'M' || patient.sex === 'F') ? patient.sex : 'M',
                        diseaseCodes: Array.isArray(record.diseaseCodes) ? record.diseaseCodes : [],
                        waistCm: record.waistCm,
                        physicalActivityLevel: record.physicalActivityLevel,
                      }),
                    };
                  } catch (innerErr) {
                    console.error('Error mapping record:', innerErr);
                    return { ...record, morphTargets: defaultMorphTargets };
                  }
                }),
              };
            } catch (err) {
              console.error('Error mapping patient:', err);
              return patient;
            }
          });
          setPatients(patientsWithMorphTargets);
          if (patientsWithMorphTargets.length > 0) {
            setSelectedPatientId(patientsWithMorphTargets[0].id);
          }
        } else {
          setError(`Erro: ${data.error || 'Falha ao carregar pacientes'}`);
        }
      } catch (err: any) {
        setError(`Erro de conexão: ${err.message || 'Desconhecido'}`);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, []);

  const selectedPatient = useMemo(
    () => patients?.find((p) => p?.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  return {
    patients,
    selectedPatient,
    selectedPatientId,
    setSelectedPatientId,
    loading,
    error,
  };
}

export function useClinicalMetrics(selectedPatient: Patient | undefined, currentYear: number) {
  const { minYear, maxYear } = useMemo(() => {
    const records = selectedPatient?.records ?? [];
    if (records.length === 0) return { minYear: 2019, maxYear: 2024 };
    const years = records.map((r) => r?.year ?? 2024);
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [selectedPatient]);

  const currentRecordData = useMemo(() => {
    const records = selectedPatient?.records ?? [];
    if (records.length === 0) return null;

    if (records.length === 1) return records[0];

    let startRecord = records[0];
    let endRecord = records[records.length - 1];

    for (let i = 0; i < records.length - 1; i++) {
      if (records[i]?.year <= currentYear && records[i + 1]?.year >= currentYear) {
        startRecord = records[i];
        endRecord = records[i + 1];
        break;
      }
    }

    if (currentYear <= startRecord.year) return startRecord;
    if (currentYear >= endRecord.year) return endRecord;

    const t = (currentYear - startRecord.year) / (endRecord.year - startRecord.year);

    return {
      ...startRecord,
      year: currentYear,
      heightCm: interpolateNumber(startRecord.heightCm, endRecord.heightCm, t),
      weightKg: interpolateNumber(startRecord.weightKg, endRecord.weightKg, t),
      diseaseCodes: t < 0.5 ? startRecord.diseaseCodes : endRecord.diseaseCodes,
      morphTargets: ClinicalToBodyMapper.interpolate(
        startRecord.morphTargets ?? defaultMorphTargets,
        endRecord.morphTargets ?? defaultMorphTargets,
        t
      ),
    };
  }, [selectedPatient, currentYear]);

  const baselineRecord = useMemo(() => {
    return selectedPatient?.records?.[0] ?? null;
  }, [selectedPatient]);

  const changeFromBaseline = useMemo(() => {
    if (!baselineRecord || !currentRecordData) return null;

    const weightChange = currentRecordData.weightKg - baselineRecord.weightKg;
    const weightPct = (weightChange / baselineRecord.weightKg) * 100;

    return {
      weightKg: weightChange,
      weightPct,
    };
  }, [baselineRecord, currentRecordData]);

  return {
    minYear,
    maxYear,
    currentRecordData,
    baselineRecord,
    changeFromBaseline,
  };
}
