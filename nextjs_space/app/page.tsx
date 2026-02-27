'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Stethoscope, Apple, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const profiles = [
  {
    role: 'medico',
    title: 'Médico',
    description: 'Acesso completo à análise clínica, visualização 3D e predição de risco metabólico',
    icon: Stethoscope,
    color: 'blue',
    href: '/medico',
    features: ['Análise clínica detalhada', 'Visualização 3D de pacientes', 'Dashboard de performance ML'],
  },
  {
    role: 'nutricionista',
    title: 'Nutricionista',
    description: 'Gestão de cardápios, acompanhamento nutricional e biblioteca de receitas',
    icon: Apple,
    color: 'green',
    href: '/nutricionista',
    features: ['Gestão de cardápios', 'Biblioteca de receitas', 'Acompanhamento de pacientes'],
  },
  {
    role: 'paciente',
    title: 'Paciente',
    description: 'Acompanhe sua evolução, visualize seu avatar digital e acesse seu cardápio',
    icon: User,
    color: 'purple',
    href: '/paciente',
    features: ['Visualização do avatar 3D', 'Acompanhamento de evolução', 'Cardápio personalizado'],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-2">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Nutrition Logo"
                width={140}
                height={56}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-sm text-slate-500 hidden sm:block">
              Sistema de Visualização 3D de Pacientes
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao Nutrition
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sistema de nutrição, visualização 3D e acompanhamento clínico de pacientes.
            Selecione seu perfil para acessar o sistema.
          </p>
        </div>

        {/* Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {profiles.map((profile) => {
            const Icon = profile.icon;
            const colorClasses: Record<string, { bg: string; text: string; border: string; hover: string }> = {
              blue: {
                bg: 'bg-blue-100',
                text: 'text-blue-700',
                border: 'border-blue-200',
                hover: 'hover:border-blue-400',
              },
              green: {
                bg: 'bg-green-100',
                text: 'text-green-700',
                border: 'border-green-200',
                hover: 'hover:border-green-400',
              },
              purple: {
                bg: 'bg-purple-100',
                text: 'text-purple-700',
                border: 'border-purple-200',
                hover: 'hover:border-purple-400',
              },
            };
            const colors = colorClasses[profile.color];

            return (
              <Link key={profile.role} href={profile.href}>
                <Card
                  className={`h-full transition-all duration-300 cursor-pointer ${colors.border} ${colors.hover} hover:shadow-lg`}
                >
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-xl">{profile.title}</CardTitle>
                    <CardDescription>{profile.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {profile.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('100', '500')}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant="outline">
                      Acessar como {profile.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Access to Original View */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Ou acesse a visualização clássica (sem navegação por perfil)
          </p>
          <Link href="/visualizador">
            <Button variant="ghost" className="text-blue-600">
              Acessar Visualizador 3D Clássico
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
