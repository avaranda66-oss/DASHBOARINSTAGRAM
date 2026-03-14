import { DashboardShell } from '@/design-system/organisms/DashboardShell';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardShell>{children}</DashboardShell>;
}
