import { DashboardLayout } from '@/components/layout';

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      userRole="paciente"
      userName="Alice Martins"
      userEmail="alice@thinkingtools.health"
    >
      {children}
    </DashboardLayout>
  );
}
