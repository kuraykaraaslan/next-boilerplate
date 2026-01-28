import AuthLogout from '@/modules/auth/ui/auth.logout';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Logout',
};

export default function LogoutPage() {
    return <AuthLogout />;
}
