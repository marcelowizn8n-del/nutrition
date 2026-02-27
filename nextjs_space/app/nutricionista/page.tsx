'use client';

import { useState, useEffect } from 'react';
import { usePatientData } from '@/hooks';
import { Users, Utensils, Apple, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NutricionistaDashboard() {
  const { patients, loading } = usePatientData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Pacientes Ativos', value: patients.length, icon: Users, color: 'blue' },
    { label: 'Cardápios Ativos', value: 12, icon: Utensils, color: 'green' },
    { label: 'Receitas Cadastradas', value: 48, icon: Apple, color: 'orange' },
    { label: 'Consultas Hoje', value: 4, icon: Calendar, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard da Nutricionista</h1>
        <p className="text-gray-500">Visão geral dos seus pacientes e cardápios</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Cardápios</CardTitle>
            <CardDescription>Crie e gerencie cardápios personalizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Acesse a área de cardápios para criar planos nutricionais personalizados
              para cada paciente, considerando suas necessidades e preferências.
            </p>
            <Button asChild>
              <Link href="/nutricionista/cardapios">
                Acessar Cardápios <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biblioteca de Receitas</CardTitle>
            <CardDescription>Receitas saudáveis e balanceadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Explore e adicione novas receitas à sua biblioteca. Organize por tipo de
              refeição, restrições alimentares e perfil nutricional.
            </p>
            <Button asChild variant="outline">
              <Link href="/nutricionista/receitas">
                Ver Receitas <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes Recentes</CardTitle>
          <CardDescription>Últimos pacientes acessados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patients.slice(0, 5).map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-medium">
                      {patient.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-gray-500">
                      {patient.sex === 'M' ? 'Masculino' : 'Feminino'} •{' '}
                      {new Date().getFullYear() - patient.birthYear} anos
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/nutricionista/pacientes/${patient.id}`}>
                    Ver detalhes
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
