import AuthCallback from '@/modules/auth/ui/auth.callback';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Auth Callback',
};

export default function CallbackPage() {
    return <AuthCallback />;
}