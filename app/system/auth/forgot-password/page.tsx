import AuthForgotPassword from '@/modules/auth/ui/auth.forgot-password';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
    return <AuthForgotPassword />;
}
