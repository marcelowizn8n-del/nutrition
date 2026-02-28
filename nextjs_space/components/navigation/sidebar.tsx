'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Utensils,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Stethoscope,
  Heart,
  Apple,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface SidebarProps {
  userRole: 'medico' | 'nutricionista' | 'paciente';
  userName?: string;
  userEmail?: string;
}

const navItemsByRole: Record<string, NavItem[]> = {
  medico: [
    { href: '/medico', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/medico/pacientes', label: 'Pacientes', icon: Users },
    { href: '/medico/analise', label: 'Análise Clínica', icon: Stethoscope },
    { href: '/dashboard', label: 'Performance ML', icon: Heart },
  ],
  nutricionista: [
    { href: '/nutricionista', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/nutricionista/pacientes', label: 'Pacientes', icon: Users },
    { href: '/nutricionista/cardapios', label: 'Cardápios', icon: Utensils },
    { href: '/nutricionista/receitas', label: 'Receitas', icon: Apple },
  ],
  paciente: [
    { href: '/paciente', label: 'Meu Painel', icon: LayoutDashboard },
    { href: '/paciente/evolucao', label: 'Minha Evolução', icon: Heart },
    { href: '/paciente/cardapio', label: 'Meu Cardápio', icon: Utensils },
    { href: '/paciente/agenda', label: 'Agenda', icon: Calendar },
  ],
};

const roleLabels: Record<string, string> = {
  medico: 'Médico',
  nutricionista: 'Nutricionista',
  paciente: 'Paciente',
};

export default function Sidebar({ userRole, userName = 'Usuário', userEmail = '' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navItems = navItemsByRole[userRole] || [];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/entrar');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-white dark:bg-gray-900 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">Nutrition</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Info */}
        <div className={cn('p-4 border-b', collapsed && 'px-2')}>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-medium truncate">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{roleLabels[userRole]}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            {loggingOut ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 shrink-0" />
            )}
            {!collapsed && <span>{loggingOut ? 'Saindo...' : 'Sair'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
