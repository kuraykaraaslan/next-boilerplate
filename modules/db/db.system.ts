import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '@/modules/env';
import { parseDbUrl } from './db.utils';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '@/modules/user_profile/entities/user_profile.entity';
import { UserSecurity } from '@/modules/user_security/entities/user_security.entity';
import { UserPreferences } from '@/modules/user_preferences/entities/user_preferences.entity';
import { UserSession } from '@/modules/user_session/entities/user_session.entity';
import { UserSocialAccount } from '@/modules/user_social_account/entities/user_social_account.entity';
import { PushSubscription } from '@/modules/notification_push/entities/push_subscription.entity';
import { Setting } from '@/modules/setting/entities/setting.entity';
import { SubscriptionPlan } from '@/modules/payment/entities/subscription_plan.entity';
import { PlanFeature } from '@/modules/payment/entities/plan_feature.entity';
import { AuditLog } from '@/modules/audit_log/entities/audit_log.entity';
import { Coupon } from '@/modules/coupon/entities/coupon.entity';
import { SystemWebhook } from '@/modules/webhook/entities/system_webhook.entity';
import { SystemWebhookDelivery } from '@/modules/webhook/entities/system_webhook_delivery.entity';
import { TenantDatabase } from './entities/tenant_database.entity';

const SYSTEM_ENTITIES = [
  User,
  UserProfile,
  UserSecurity,
  UserPreferences,
  UserSession,
  UserSocialAccount,
  PushSubscription,
  Setting,
  SubscriptionPlan,
  PlanFeature,
  AuditLog,
  Coupon,
  SystemWebhook,
  SystemWebhookDelivery,
  TenantDatabase,
];

const { url: SYSTEM_DB_URL, schema: SYSTEM_SCHEMA } = parseDbUrl(env.SYSTEM_DATABASE_URL);

export const SystemDataSource = new DataSource({
  type: 'postgres',
  url: SYSTEM_DB_URL,
  schema: SYSTEM_SCHEMA,
  synchronize: false,
  logging: env.NODE_ENV === 'development',
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
