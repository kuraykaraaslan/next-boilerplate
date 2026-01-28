import AuthForgotPassword from '@/modules/auth/ui/auth.forgot-password';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Forgot Password',
};

interface PageProps {
    params: Promise<{ tenantId: string }>;
}

export default async function TenantForgotPasswordPage({ params }: PageProps) {
    const { tenantId } = await params;
    const basePath = `/tenant/${tenantId}/auth`;

    return <AuthForgotPassword basePath={basePath} tenantId={tenantId} />;
}
