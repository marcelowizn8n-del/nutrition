'use client';

import { ChevronDown, User } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  sex: string;
  birthYear: number;
  records: Array<{
    year: number;
    diseaseCodes: string[];
    notes?: string | null;
  }>;
}

interface PatientSelectorProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string) => void;
}

export default function PatientSelector({
  patients,
  selectedPatientId,
  onSelectPatient,
}: PatientSelectorProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-slate-700">
        <User className="w-5 h-5 text-blue-600" />
        <span className="font-medium">Paciente:</span>
      </div>
      <div className="relative flex-1 max-w-xs">
        <select
          value={selectedPatientId ?? ''}
          onChange={(e) => onSelectPatient(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
        >
          <option value="">Escolha um paciente...</option>
          {(patients ?? []).map((patient) => (
            <option key={patient?.id} value={patient?.id}>
              {patient?.name} ({patient?.sex === 'M' ? 'M' : 'F'}, {currentYear - (patient?.birthYear ?? 0)}a)
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
