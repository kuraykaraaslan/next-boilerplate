import type { Dispatch, SetStateAction } from 'react';
import type { SettingsState } from '@/modules/setting/setting.types';

export type { SettingsState };

export interface SettingsTabProps {
  settings: SettingsState;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  saveSettings: () => Promise<void>;
}
