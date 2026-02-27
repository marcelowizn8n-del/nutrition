'use client';

import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface ClinicalRecord {
  id: string;
  year: number;
  heightCm: number;
  weightKg: number;
  diseaseCodes: string[];
  notes?: string | null;
}

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  currentYear: number;
  onChange: (year: number) => void;
  records?: ClinicalRecord[];
}

const diseaseColors: Record<string, string> = {
  'E11': 'bg-amber-500', // Diabetes
  'I10': 'bg-red-500',   // Hipertensão
  'I25': 'bg-purple-500', // Doença Cardíaca
};

const diseaseNames: Record<string, string> = {
  'E11': 'Diabetes',
  'I10': 'Hipertensão',
  'I25': 'Cardiopatia',
};

export default function TimelineSlider({
  minYear,
  maxYear,
  currentYear,
  onChange,
  records = [],
}: TimelineSliderProps) {
  const range = maxYear - minYear || 1;
  const progress = ((currentYear - minYear) / range) * 100;

  // Gerar anos para mostrar na timeline
  const years = [];
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }

  // Encontrar eventos (novos diagnósticos)
  const events: { year: number; codes: string[] }[] = [];
  let previousCodes: string[] = [];
  
  records.forEach((record) => {
    const newCodes = record.diseaseCodes.filter(c => !previousCodes.includes(c));
    if (newCodes.length > 0) {
      events.push({ year: record.year, codes: newCodes });
    }
    previousCodes = [...record.diseaseCodes];
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-3xl font-bold text-blue-600">{Math.round(currentYear)}</span>
        <span className="flex items-center gap-1 text-sm text-slate-500">
          <TrendingUp className="w-4 h-4" />
          Arraste para navegar
        </span>
      </div>

      <div className="relative pt-6 pb-2">
        {/* Marcadores de eventos */}
        {events.map((event, idx) => {
          const position = ((event.year - minYear) / range) * 100;
          return (
            <div
              key={idx}
              className="absolute -top-1 transform -translate-x-1/2 group"
              style={{ left: `${position}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="relative">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      {event.year}: {event.codes.map(c => diseaseNames[c] || c).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Barra de progresso */}
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          
          {/* Marcadores de registros */}
          {records.map((record, idx) => {
            const position = ((record.year - minYear) / range) * 100;
            return (
              <div
                key={idx}
                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full cursor-pointer hover:scale-125 transition-transform"
                style={{ left: `${position}%` }}
                onClick={() => onChange(record.year)}
                title={`${record.year} - ${record.weightKg}kg`}
              />
            );
          })}
        </div>
        
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={0.1}
          value={currentYear}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer mt-6"
        />
      </div>

      {/* Anos */}
      <div className="flex justify-between text-xs text-slate-500">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onChange(year)}
            className={`px-2 py-1 rounded transition-colors ${
              Math.round(currentYear) === year 
                ? 'bg-blue-100 text-blue-700 font-semibold' 
                : 'hover:bg-gray-100'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Legenda de eventos */}
      {events.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-gray-500">Eventos:</span>
          {events.map((event, idx) => (
            <span key={idx} className="text-xs">
              <span className="font-semibold">{event.year}:</span>{' '}
              {event.codes.map((code, cIdx) => (
                <span
                  key={cIdx}
                  className={`inline-block px-1.5 py-0.5 rounded text-white text-xs mr-1 ${diseaseColors[code] || 'bg-gray-500'}`}
                >
                  {diseaseNames[code] || code}
                </span>
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
