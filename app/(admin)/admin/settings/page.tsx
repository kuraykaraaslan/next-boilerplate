'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Tabs from '@/components/common/Layout/Tabs';
import {
    GeneralTab,
    AuthTab,
    EmailTab,
    SmsTab,
    StorageTab,
    AITab,
    SecurityTab,
    IntegrationsTab,
    AnalyticsTab,
    SeoTab,
    SocialTab,
    PaymentTab,
    NotificationTab,
    LocalizationTab
} from '@/components/admin/Settings/Tabs';
import axios from '@/libs/axios';
import {
    GENERAL_KEYS, AUTH_KEYS, EMAIL_KEYS, SMS_KEYS, STORAGE_KEYS, AI_KEYS, SECURITY_KEYS,
    INTEGRATIONS_KEYS, ANALYTICS_KEYS, SEO_KEYS, SOCIAL_KEYS,
    PAYMENT_KEYS, NOTIFICATION_KEYS, LOCALIZATION_KEYS,
    SettingsState, SettingsTabProps
} from '@/types/common/SettingTypes';
import {
    faCog,
    faUserShield,
    faEnvelope,
    faComment,
    faDatabase,
    faRobot,
    faShield,
    faSpinner,
    faCheck,
    faRotateRight,
    faPlug,
    faChartLine,
    faSearch,
    faShareNodes,
    faCreditCard,
    faBell,
    faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ALL_KEYS = [
    ...GENERAL_KEYS,
    ...AUTH_KEYS,
    ...EMAIL_KEYS,
    ...SMS_KEYS,
    ...STORAGE_KEYS,
    ...AI_KEYS,
    ...SECURITY_KEYS,
    ...INTEGRATIONS_KEYS,
    ...ANALYTICS_KEYS,
    ...SEO_KEYS,
    ...SOCIAL_KEYS,
    ...PAYMENT_KEYS,
    ...NOTIFICATION_KEYS,
    ...LOCALIZATION_KEYS,
];

const Page = () => {
    const [settings, setSettings] = useState<SettingsState>({});
    const [initialSettings, setInitialSettings] = useState<SettingsState>({});
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
            const res = await axios.put('/api/settings', { keys: keysRef.current });
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
    }, []);

    const saveSettings = useCallback(async () => {
        if (!isDirty) return;

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await axios.post('/api/settings', { settings });
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
    }, [settings, isDirty]);

    const resetSettings = useCallback(() => {
        setSettings(initialSettings);
        setError(null);
    }, [initialSettings]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const tabProps: SettingsTabProps = useMemo(() => ({
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
            id: 'auth',
            label: 'Authentication',
            icon: faUserShield,
            content: <AuthTab {...tabProps} />
        },
        {
            id: 'email',
            label: 'Email',
            icon: faEnvelope,
            content: <EmailTab {...tabProps} />
        },
        {
            id: 'sms',
            label: 'SMS',
            icon: faComment,
            content: <SmsTab {...tabProps} />
        },
        {
            id: 'storage',
            label: 'Storage',
            icon: faDatabase,
            content: <StorageTab {...tabProps} />
        },
        {
            id: 'ai',
            label: 'AI',
            icon: faRobot,
            content: <AITab {...tabProps} />
        },
        {
            id: 'security',
            label: 'Security',
            icon: faShield,
            content: <SecurityTab {...tabProps} />
        },
        {
            id: 'integrations',
            label: 'Integrations',
            icon: faPlug,
            content: <IntegrationsTab {...tabProps} />
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: faChartLine,
            content: <AnalyticsTab {...tabProps} />
        },
        {
            id: 'seo',
            label: 'SEO',
            icon: faSearch,
            content: <SeoTab {...tabProps} />
        },
        {
            id: 'social',
            label: 'Social',
            icon: faShareNodes,
            content: <SocialTab {...tabProps} />
        },
        {
            id: 'payment',
            label: 'Payment',
            icon: faCreditCard,
            content: <PaymentTab {...tabProps} />
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: faBell,
            content: <NotificationTab {...tabProps} />
        },
        {
            id: 'localization',
            label: 'Localization',
            icon: faGlobe,
            content: <LocalizationTab {...tabProps} />
        }
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
                <h1 className="text-3xl font-bold h-16 flex items-center">Settings</h1>
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
