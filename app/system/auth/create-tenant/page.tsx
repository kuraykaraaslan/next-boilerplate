import TenantCreate from '@/modules/tenant/ui/tenant.create';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Organization',
};

export default function CreateTenantPage() {
    return <TenantCreate />;
}
