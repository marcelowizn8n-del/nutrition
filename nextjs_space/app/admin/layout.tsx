import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { DashboardLayout } from '@/components/layout';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/entrar?redirect=/admin');
  }
  
  if (session.user.role !== 'ADMIN') {
    redirect('/entrar');
  }

  return (
    <DashboardLayout
      userRole="admin"
      userName={session.user.name}
      userEmail={session.user.email}
      userAvatar={session.user.avatarUrl || ''}
    >
      {children}
    </DashboardLayout>
  );
}
