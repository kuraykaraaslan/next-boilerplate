import AuthRegister from '@/modules/auth/ui/auth.register';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Register',
};

export default function RegisterPage() {
    return <AuthRegister />;
}
