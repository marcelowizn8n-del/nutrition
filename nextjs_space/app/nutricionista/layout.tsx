import { DashboardLayout } from '@/components/layout';

export default function NutricionistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      userRole="nutricionista"
      userName="Dra. Ana"
      userEmail="nutri@thinkingtools.health"
    >
      {children}
    </DashboardLayout>
  );
}
