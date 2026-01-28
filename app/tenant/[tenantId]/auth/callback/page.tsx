import AuthCallback from '@/modules/auth/ui/auth.callback';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Auth Callback',
};

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantCallbackPage({ params }: PageProps) {
    const { tenantId } = await params;
    const basePath = `/tenant/${tenantId}/auth`;

    return <AuthCallback basePath={basePath} tenantId={tenantId} />;
}
