interface TenantPageProps {
    params: {
        tenantId: string;
    };
}

export default async function TenantPage({ params }: TenantPageProps) {
    const { tenantId } = await params;

    return (
        <div>
            <h1>Tenant: {tenantId}</h1>
        </div>
    );
}