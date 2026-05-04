export interface TenantSettingsState {
  [key: string]: string | null;
}

export interface TenantSettingsTabProps {
  tenantId: string;
  settings: TenantSettingsState;
  onSave: (values: TenantSettingsState) => Promise<void>;
}
