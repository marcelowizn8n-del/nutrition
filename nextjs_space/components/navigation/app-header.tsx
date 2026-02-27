'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  onMenuClick?: () => void;
}

const pathLabels: Record<string, string> = {
  medico: 'Médico',
  nutricionista: 'Nutricionista',
  paciente: 'Paciente',
  pacientes: 'Pacientes',
  cardapios: 'Cardápios',
  receitas: 'Receitas',
  analise: 'Análise Clínica',
  evolucao: 'Evolução',
  cardapio: 'Cardápio',
  agenda: 'Agenda',
  dashboard: 'Dashboard',
};

export default function AppHeader({ title, showSearch = false, onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);

  const breadcrumbs = pathParts.map((part, index) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/');
    const label = pathLabels[part] || part.charAt(0).toUpperCase() + part.slice(1);
    const isLast = index === pathParts.length - 1;
    return { href, label, isLast };
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 lg:px-6">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Breadcrumbs */}
      <div className="flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Início</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-1">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {title && <h1 className="text-lg font-semibold mt-1">{title}</h1>}
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Buscar..." className="pl-9" />
        </div>
      )}

      {/* Actions */}
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
          3
        </span>
      </Button>
    </header>
  );
}
