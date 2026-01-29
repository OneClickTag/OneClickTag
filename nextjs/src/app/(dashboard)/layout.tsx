import { MainLayout } from '@/components/layout';
import { EarlyAccessGuard } from '@/components/guards/EarlyAccessGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EarlyAccessGuard>
      <MainLayout>{children}</MainLayout>
    </EarlyAccessGuard>
  );
}
