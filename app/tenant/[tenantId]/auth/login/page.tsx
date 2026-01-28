import AuthLogin from '@/modules/auth/ui/auth.login';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
};

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantLoginPage({ params }: PageProps) {
    const { tenantId } = await params;
    const basePath = `/tenant/${tenantId}/auth`;

    return <AuthLogin basePath={basePath} tenantId={tenantId} />;
}
