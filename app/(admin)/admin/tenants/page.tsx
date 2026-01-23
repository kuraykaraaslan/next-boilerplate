'use client'
import Table, {
    TableProvider,
    TableHeader,
    TableBody,
    TableFooter,
    ColumnDef,
    ActionButton
} from '@/components/common/forms/DynamicTable';
import { SafeTenant } from '@/modules/tenant/tenant.types';
import axiosInstance from '@/libs/axios';
import { useTranslation } from 'react-i18next';

const TenantsPage = () => {
    const { t } = useTranslation();

    const columns: ColumnDef<SafeTenant>[] = [
        { key: 'name', header: 'Name', accessor: (tenant) => tenant.name },
        { key: 'description', header: 'Description', accessor: (tenant) => tenant.description || '-' },
        { key: 'status', header: 'Status', accessor: (tenant) => (
            <span className={`badge ${tenant.tenantStatus === 'ACTIVE' ? 'badge-success' : 'badge-ghost'}`}>
                {tenant.tenantStatus}
            </span>
        )},
        { key: 'createdAt', header: 'Created At', accessor: (tenant) => (
            tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '-'
        )},
    ];

    const actions: ActionButton<SafeTenant>[] = [
        { 
            label: 'Members', 
            href: (tenant) => `/admin/tenants/${tenant.tenantId}/members`, 
            className: 'btn-secondary' 
        },
        { 
            label: 'Edit', 
            href: (tenant) => `/admin/tenants/${tenant.tenantId}`, 
            className: 'btn-primary' 
        },
        { 
            label: 'Delete', 
            onClick: async (tenant) => {
                if (!confirm(`Are you sure you want to delete ${tenant.name}?`)) return;
                await axiosInstance.delete(`/api/tenants/${tenant.tenantId}`);
            },
            className: 'text-danger',
            hideOnMobile: true,
        },
    ];

    return (
        <TableProvider<SafeTenant>
            apiEndpoint="/api/tenants"
            dataKey="tenants"
            idKey="tenantId"
            columns={columns}
            actions={actions}
        >
            <Table>
                <TableHeader
                    title="Tenants"
                    searchPlaceholder="Search tenants..."
                    buttonText="Create Tenant"
                    buttonLink="/admin/tenants/create"
                />
                <TableBody />
                <TableFooter
                    showingText="Showing"
                    previousText="Previous"
                    nextText="Next"
                />
            </Table>
        </TableProvider>
    );
}

export default TenantsPage;
