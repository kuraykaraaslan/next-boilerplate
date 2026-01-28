import AuthLogin from '@/modules/auth/ui/auth.login';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
};

export default function LoginPage() {
    return <AuthLogin />;
}
