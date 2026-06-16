import { Setting as SettingEntity } from './entities/setting.entity';
import { Setting, SettingSchema } from './setting.types';
import { encryptFieldOpt, decryptFieldOpt, isEncryptedField } from '@nb/common/server/field-encryption';
import { SENSITIVE_KEYS } from './setting.validation';

export function encryptValue(key: string, value: string): string {
  return SENSITIVE_KEYS.has(key) ? encryptFieldOpt(value) : value;
}

export function decryptValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.has(key)) return value;
  return (decryptFieldOpt(value) ?? value) as string;
}

const MASK = '***SET***';

function maskValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.has(key)) return value;
  return isEncryptedField(value) || value ? MASK : value;
}

export function parseRow(row: SettingEntity, masked = false): Setting {
  const decrypted = decryptValue(row.key, row.value);
  return SettingSchema.parse({ ...row, value: masked ? maskValue(row.key, decrypted) : decrypted });
}
