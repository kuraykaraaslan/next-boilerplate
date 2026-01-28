'use client';

import { useMemo } from 'react';
import Tabs from '@/components/common/tabs';
import { useSettings } from '@/modules/setting/hooks/useSettings';
import {
  getSystemSettingsTabs,
  getAllSystemKeys,
} from '@/modules/setting/settings.loader';
import { SettingsTabProps } from '@/modules/setting/setting.types';
import {
  faSpinner,
  faCheck,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Page = () => {
  // Get registered tabs and keys from registry
  const registeredTabs = getSystemSettingsTabs();
  const allKeys = useMemo(() => getAllSystemKeys(), []);

  const {
    settings,
    setSettings,
    loading,
    saving,
    error,
    success,
    isDirty,
    saveSettings,
    resetSettings,
  } = useSettings(allKeys);

  const tabProps: SettingsTabProps = useMemo(
    () => ({
      settings,
      setSettings,
      loading,
      saving,
      error,
      isDirty,
      saveSettings,
    }),
    [settings, setSettings, loading, saving, error, isDirty, saveSettings]
  );

  const tabs = useMemo(
    () =>
      registeredTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        content: <tab.component {...tabProps} />,
      })),
    [registeredTabs, tabProps]
  );

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[400px]">
        <FontAwesomeIcon
          icon={faSpinner}
          className="animate-spin text-4xl text-primary"
        />
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
