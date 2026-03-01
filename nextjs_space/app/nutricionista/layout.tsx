import { DashboardLayout } from '@/components/layout';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function NutricionistaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/entrar?redirect=/nutricionista');
  }

  return (
    <DashboardLayout
      userRole="nutricionista"
      userName={session.user.name}
      userEmail={session.user.email}
      userAvatar={session.user.avatarUrl || ''}
    >
      {children}
    </DashboardLayout>
  );
}
