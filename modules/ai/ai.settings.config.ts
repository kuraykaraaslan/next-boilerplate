import { faRobot } from '@fortawesome/free-solid-svg-icons';
import { SettingsTabEntry, registerModule } from '@/modules/setting/settings.registry';
import { AI_KEYS } from './ai.setting.keys';
import AISettings from './ui/ai.settings';

export const SETTINGS_TABS: SettingsTabEntry[] = [
  {
    id: 'ai',
    label: 'AI',
    icon: faRobot,
    keys: AI_KEYS,
    component: AISettings,
    order: 50,
    type: 'system',
  },
];

registerModule({ settingsTabs: SETTINGS_TABS });
