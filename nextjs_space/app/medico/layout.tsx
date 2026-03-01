import { DashboardLayout } from '@/components/layout';
import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/entrar?redirect=/medico');
  }

  return (
    <DashboardLayout
      userRole="medico"
      userName={session.user.name}
      userEmail={session.user.email}
      userAvatar={session.user.avatarUrl || ''}
    >
      {children}
    </DashboardLayout>
  );
}
