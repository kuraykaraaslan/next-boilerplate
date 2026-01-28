import AuthRegister from '@/modules/auth/ui/auth.register';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Register',
};

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantRegisterPage({ params }: PageProps) {
    const { tenantId } = await params;
    const basePath = `/tenant/${tenantId}/auth`;

    return <AuthRegister basePath={basePath} tenantId={tenantId} />;
}
