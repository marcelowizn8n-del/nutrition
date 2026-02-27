'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from '@/components/navigation';
import { AppHeader } from '@/components/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: 'medico' | 'nutricionista' | 'paciente';
  userName?: string;
  userEmail?: string;
}

export default function DashboardLayout({
  children,
  userRole,
  userName,
  userEmail,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />

      {/* Main Content */}
      <div className="lg:pl-64 pl-16 transition-all duration-300">
        <AppHeader
          showSearch={userRole !== 'paciente'}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
