'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import PatientForm from '@/components/patients/patient-form';

export default function NovoPacienteMedicoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erro ao criar paciente');
        return;
      }

      router.push('/medico/pacientes');
    } catch (err) {
      setError('Erro ao criar paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/medico/pacientes">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          Adicionar Paciente
        </h1>
        <p className="text-gray-500">Preencha os dados do novo paciente</p>
      </div>

      <PatientForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/medico/pacientes')}
        loading={loading}
        error={error}
        mode="create"
      />
    </div>
  );
}
