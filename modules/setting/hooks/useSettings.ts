'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from '@/libs/axios';
import { SettingsState } from '../setting.types';

interface UseSettingsOptions {
  apiEndpoint?: string;
}

interface UseSettingsReturn {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  initialSettings: SettingsState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  isDirty: boolean;
  fetchSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

export function useSettings(
  keys: string[],
  options: UseSettingsOptions = {}
): UseSettingsReturn {
  const { apiEndpoint = '/api/settings' } = options;

  const [settings, setSettings] = useState<SettingsState>({});
  const [initialSettings, setInitialSettings] = useState<SettingsState>({});
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
      const res = await axios.put(apiEndpoint, { keys: keysRef.current });
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
  }, [apiEndpoint]);

  const saveSettings = useCallback(async () => {
    if (!isDirty) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post(apiEndpoint, { settings });
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
  }, [apiEndpoint, settings, isDirty]);

  const resetSettings = useCallback(() => {
    setSettings(initialSettings);
    setError(null);
  }, [initialSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

export default useSettings;
