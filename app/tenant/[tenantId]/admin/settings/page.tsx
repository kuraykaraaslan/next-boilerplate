'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Tabs from '@/components/common/tabs';
import {
    GeneralTab,
    BrandingTab,
    FeatureTab,
    NotificationTab,
    SecurityTab,
    BillingTab,
    IntegrationTab,
    DomainsTab,
} from '@/components/tenant/settings/Tabs';
import axios from '@/libs/axios';
import {
    TENANT_GENERAL_KEYS,
    TENANT_BRANDING_KEYS,
    TENANT_FEATURE_KEYS,
    TENANT_NOTIFICATION_KEYS,
    TENANT_SECURITY_KEYS,
    TENANT_BILLING_KEYS,
    TENANT_INTEGRATION_KEYS,
    TenantSettingsState,
} from '@/modules/tenant_setting/tenant_setting.types';
import {
    faCog,
    faPalette,
    faToggleOn,
    faBell,
    faShield,
    faCreditCard,
    faPlug,
    faSpinner,
    faCheck,
    faRotateRight,
    faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { TenantSettingsTabProps } from '@/modules/tenant_setting/tenant_setting.types';

const ALL_KEYS = [
    ...TENANT_GENERAL_KEYS,
    ...TENANT_BRANDING_KEYS,
    ...TENANT_FEATURE_KEYS,
    ...TENANT_NOTIFICATION_KEYS,
    ...TENANT_SECURITY_KEYS,
    ...TENANT_BILLING_KEYS,
    ...TENANT_INTEGRATION_KEYS,
];


const Page = () => {
    const params = useParams();
    const tenantId = params.tenantId as string;

    // If the path doesn't start with /tenant/, base is empty (we are on a custom domain)
    const isProxied = typeof window !== 'undefined' && !window.location.pathname.startsWith('/tenant/');
    const tenantBase = isProxied ? '' : `/tenant/${tenantId}`;

    const [settings, setSettings] = useState<TenantSettingsState>({});
    const [initialSettings, setInitialSettings] = useState<TenantSettingsState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const keysRef = useRef(ALL_KEYS);

    const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.put(`${tenantBase}/api/settings`, { keys: keysRef.current });
            if (res.data.success) {
                setSettings(res.data.settings);
                setInitialSettings(res.data.settings);
            } else {
                setError(res.data.message || 'Failed to fetch settings');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }, [tenantId, tenantBase]);

    const saveSettings = useCallback(async () => {
        if (!isDirty) return;

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await axios.post(`${tenantBase}/api/settings`, { settings });
            if (res.data.success) {
                setSettings(res.data.settings);
                setInitialSettings(res.data.settings);
                setSuccess('Settings saved successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(res.data.message || 'Failed to save settings');
            }
        } catch (e: any) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setSaving(false);
        }
    }, [tenantId, settings, isDirty, tenantBase]);

    const resetSettings = useCallback(() => {
        setSettings(initialSettings);
        setError(null);
    }, [initialSettings]);

    useEffect(() => {
        if (tenantId) {
            fetchSettings();
        }
    }, [fetchSettings, tenantId]);

    const tabProps: TenantSettingsTabProps = useMemo(() => ({
        settings,
        setSettings,
        loading,
        saving,
        error,
        isDirty,
        saveSettings,
    }), [settings, setSettings, loading, saving, error, isDirty, saveSettings]);

    const tabs = useMemo(() => [
        {
            id: 'general',
            label: 'General',
            icon: faCog,
            content: <GeneralTab {...tabProps} />
        },
        {
            id: 'domains',
            label: 'Domains',
            icon: faGlobe,
            content: <DomainsTab {...tabProps} />
        },
        {
            id: 'branding',
            label: 'Branding',
            icon: faPalette,
            content: <BrandingTab {...tabProps} />
        },
        {
            id: 'features',
            label: 'Features',
            icon: faToggleOn,
            content: <FeatureTab {...tabProps} />
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: faBell,
            content: <NotificationTab {...tabProps} />
        },
        {
            id: 'security',
            label: 'Security',
            icon: faShield,
            content: <SecurityTab {...tabProps} />
        },
        {
            id: 'billing',
            label: 'Billing',
            icon: faCreditCard,
            content: <BillingTab {...tabProps} />
        },
        {
            id: 'integrations',
            label: 'Integrations',
            icon: faPlug,
            content: <IntegrationTab {...tabProps} />
        },
    ], [tabProps]);

    if (loading) {
        return (
            <div className="container mx-auto flex items-center justify-center min-h-[400px]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between md:items-center flex-col md:flex-row mb-6">
                <h1 className="text-3xl font-bold h-16 flex items-center">Tenant Settings</h1>
                <div className="flex gap-2 items-center">
                    {success && (
                        <span className="text-success flex items-center gap-1">
                            <FontAwesomeIcon icon={faCheck} />
                            {success}
                        </span>
                    )}
                    {isDirty && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={resetSettings}
                            disabled={saving}
                        >
                            <FontAwesomeIcon icon={faRotateRight} />
                            Reset
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={saveSettings}
                        disabled={saving || !isDirty}
                    >
                        {saving ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    <span>{error}</span>
                </div>
            )}

            <Tabs
                tabs={tabs}
                defaultTab="general"
                variant="boxed"
                size="md"
                showLabelsOnMobile={false}
            />
        </div>
    );
};

export default Page;
