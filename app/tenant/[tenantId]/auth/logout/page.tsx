import AuthLogout from '@/modules/auth/ui/auth.logout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Logout',
};

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantLogoutPage({ params }: PageProps) {
    const { tenantId } = await params;
    const basePath = `/tenant/${tenantId}/auth`;

    return <AuthLogout basePath={basePath} tenantId={tenantId} />;
}
