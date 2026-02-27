import { DashboardLayout } from '@/components/layout';

export default function MedicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      userRole="medico"
      userName="Dr. Carlos"
      userEmail="carlos@thinkingtools.health"
    >
      {children}
    </DashboardLayout>
  );
}
