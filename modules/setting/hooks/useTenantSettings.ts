'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from '@/libs/axios';
import { TenantSettingsState } from '../settings.loader';

interface UseTenantSettingsReturn {
  settings: TenantSettingsState;
  setSettings: React.Dispatch<React.SetStateAction<TenantSettingsState>>;
  initialSettings: TenantSettingsState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  isDirty: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

export function useTenantSettings(
  keys: string[],
  tenantId: string,
  tenantBase: string
): UseTenantSettingsReturn {
  const [settings, setSettings] = useState<TenantSettingsState>({});
  const [initialSettings, setInitialSettings] = useState<TenantSettingsState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const keysRef = useRef(keys);

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
  }, [tenantBase]);

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
  }, [tenantBase, settings, isDirty]);

  const resetSettings = useCallback(() => {
    setSettings(initialSettings);
    setError(null);
  }, [initialSettings]);

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [fetchSettings, tenantId]);

  return {
    settings,
    setSettings,
    initialSettings,
    loading,
    saving,
    error,
    success,
    isDirty,
    fetchSettings,
    saveSettings,
    resetSettings,
  };
}

export default useTenantSettings;
