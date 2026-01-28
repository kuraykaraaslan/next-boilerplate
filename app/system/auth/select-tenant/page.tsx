import TenantSelect from '@/modules/tenant/ui/tenant.select';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Select Organization',
};

export default function SelectTenantPage() {
    return <TenantSelect />;
}
