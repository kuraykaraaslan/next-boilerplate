import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { parseDbUrl, typeormLogging } from './db.utils';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user_profile/entities/user_profile.entity';
import { UserSecurity } from '@/modules/user_security/entities/user_security.entity';
import { UserPreferences } from '@/modules/user_preferences/entities/user_preferences.entity';
import { UserSession } from '@/modules/user_session/entities/user_session.entity';
import { UserSocialAccount } from '@/modules/user_social_account/entities/user_social_account.entity';
import { SigningCertificate } from '@/modules/e_signature/entities/signing_certificate.entity';
import { TrustListEntry } from '@/modules/e_signature/entities/trust_list_entry.entity';
import { TenantDatabase } from './entities/tenant_database.entity';

const SYSTEM_ENTITIES = [
  User,
  UserProfile,
  UserSecurity,
  UserPreferences,
  UserSession,
  UserSocialAccount,
  SigningCertificate,
  TrustListEntry,
  TenantDatabase,
];

const { url: SYSTEM_DB_URL, schema: SYSTEM_SCHEMA } = parseDbUrl(env.SYSTEM_DATABASE_URL);

export const SystemDataSource = new DataSource({
  type: 'postgres',
  url: SYSTEM_DB_URL,
  schema: SYSTEM_SCHEMA,
  synchronize: env.NODE_ENV === 'development',
  logging: typeormLogging(env.NODE_ENV),
  entities: SYSTEM_ENTITIES,
  migrations: [],
});

let initialized = false;

export async function getSystemDataSource(): Promise<DataSource> {
  if (!initialized) {
    await SystemDataSource.initialize();
    initialized = true;
  }
  return SystemDataSource;
}
