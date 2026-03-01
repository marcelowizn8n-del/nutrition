'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, User, Video, Plus, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: 'presencial' | 'online';
  professional: string;
  specialty: string;
  status: 'agendada' | 'confirmada' | 'concluida' | 'cancelada';
  location?: string;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    date: '2026-03-15',
    time: '14:00',
    type: 'presencial',
    professional: 'Dra. Ana Silva',
    specialty: 'Nutricionista',
    status: 'confirmada',
    location: 'Clínica Nutrition - Sala 203',
  },
  {
    id: '2',
    date: '2026-03-22',
    time: '10:30',
    type: 'online',
    professional: 'Dr. Carlos Santos',
    specialty: 'Médico',
    status: 'agendada',
  },
  {
    id: '3',
    date: '2026-02-20',
    time: '15:00',
    type: 'presencial',
    professional: 'Dra. Ana Silva',
    specialty: 'Nutricionista',
    status: 'concluida',
    location: 'Clínica Nutrition - Sala 203',
  },
];

export default function PacienteAgendaPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'proximas' | 'passadas'>('proximas');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const today = new Date();
  const filteredAppointments = mockAppointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    if (filter === 'proximas') return aptDate >= today;
    if (filter === 'passadas') return aptDate < today;
    return true;
  });

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmada':
        return <Badge className="bg-green-100 text-green-700">Confirmada</Badge>;
      case 'agendada':
        return <Badge className="bg-blue-100 text-blue-700">Agendada</Badge>;
      case 'concluida':
        return <Badge className="bg-gray-100 text-gray-700">Concluída</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-100 text-red-700">Cancelada</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const nextAppointment = mockAppointments.find(
    (apt) => new Date(apt.date) >= today && apt.status !== 'cancelada'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/paciente">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Agenda</h1>
        <p className="text-gray-500">Gerencie suas consultas e compromissos</p>
      </div>

      {/* Próxima Consulta Destacada */}
      {nextAppointment && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-blue-800">Próxima Consulta</CardTitle>
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-medium capitalize">{formatDate(nextAppointment.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>{nextAppointment.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>{nextAppointment.professional} - {nextAppointment.specialty}</span>
                </div>
                {nextAppointment.type === 'presencial' && nextAppointment.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">{nextAppointment.location}</span>
                  </div>
                )}
                {nextAppointment.type === 'online' && (
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">Consulta Online</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {getStatusBadge(nextAppointment.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'proximas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('proximas')}
        >
          Próximas
        </Button>
        <Button
          variant={filter === 'passadas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('passadas')}
        >
          Passadas
        </Button>
        <Button
          variant={filter === 'todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todas')}
        >
          Todas
        </Button>
      </div>

      {/* Lista de Consultas */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma consulta encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium capitalize">{formatDate(appointment.date)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{appointment.time}</span>
                      {getStatusBadge(appointment.status)}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{appointment.professional} - {appointment.specialty}</span>
                    </div>
                    {appointment.type === 'presencial' && appointment.location && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{appointment.location}</span>
                      </div>
                    )}
                    {appointment.type === 'online' && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Video className="w-4 h-4" />
                        <span>Consulta Online</span>
                      </div>
                    )}
                  </div>
                  {appointment.status !== 'concluida' && appointment.status !== 'cancelada' && (
                    <div className="flex gap-2">
                      {appointment.type === 'online' && (
                        <Button size="sm">
                          <Video className="w-4 h-4 mr-1" /> Entrar
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        Reagendar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Botão Agendar */}
      <Card>
        <CardContent className="pt-6">
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Agendar Nova Consulta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
