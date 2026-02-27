'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClinicalRecord, diseaseNames } from '@/lib/types';

interface ClinicalHistoryProps {
  records: ClinicalRecord[] | undefined;
  currentYear: number;
  onYearSelect: (year: number) => void;
}

export default function ClinicalHistory({
  records,
  currentYear,
  onYearSelect,
}: ClinicalHistoryProps) {
  if (!records || records.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Histórico Clínico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {records.map((record) => (
            <div
              key={record.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                record.year === currentYear
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => onYearSelect(record.year)}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{record.year}</span>
                <span className="text-sm text-gray-600">{record.weightKg} kg</span>
              </div>
              {record.diseaseCodes.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {record.diseaseCodes.map((code) => (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {diseaseNames[code] || code}
                    </Badge>
                  ))}
                </div>
              )}
              {record.notes && (
                <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
