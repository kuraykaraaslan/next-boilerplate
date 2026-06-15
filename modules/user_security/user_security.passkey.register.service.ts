import 'reflect-metadata';
import { generateRegistrationOptions as genRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { getDataSource } from '@/modules/db';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import redis from '@/modules/redis';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserSecurityService from './user_security.service';
import { clearCache } from './user_security.helpers';
import PasskeyMessages from './user_security.passkey.messages';
import {
  PASSKEY_REG_CHALLENGE_KEY,
  PASSKEY_CHALLENGE_TTL_SECONDS,
  PASSKEY_MAX_PER_USER,
} from './user_security.passkey.constants';
import { StoredPasskey } from './user_security.types';
import { SafeUser } from '../user/user.types';
import { RP_NAME, RP_ID, ORIGIN } from './user_security.passkey.config';

export async function generateRegistrationOptions(user: SafeUser): Promise<Record<string, unknown>> {
  const userSecurity = await UserSecurityService.getByUserId(user.userId);

  if (userSecurity.passkeys.length >= PASSKEY_MAX_PER_USER) {
    throw new AppError(PasskeyMessages.PASSKEY_LIMIT_REACHED, 409, ErrorCode.CONFLICT);
  }

  const excludeCredentials = userSecurity.passkeys.map((pk) => ({
    id: pk.credentialId,
    transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await genRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: (user as any).name ?? user.email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await redis.set(
    PASSKEY_REG_CHALLENGE_KEY(user.userId),
    options.challenge,
    'EX',
    PASSKEY_CHALLENGE_TTL_SECONDS
  );

  return options as unknown as Record<string, unknown>;
}

export async function verifyRegistration({
  user,
  response,
  label,
}: {
  user: SafeUser;
  response: RegistrationResponseJSON;
  label?: string;
}): Promise<{ credentialId: string }> {
  const challenge = await redis.get(PASSKEY_REG_CHALLENGE_KEY(user.userId));
  if (!challenge) throw new AppError(PasskeyMessages.PASSKEY_CHALLENGE_EXPIRED, 400, ErrorCode.VALIDATION_ERROR);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new AppError(PasskeyMessages.PASSKEY_REGISTRATION_FAILED, 400, ErrorCode.VALIDATION_ERROR);
  }

  const { credential, aaguid } = verification.registrationInfo;
  const credentialId = credential.id;
  const publicKey = Buffer.from(credential.publicKey).toString('base64url');

  const newPasskey: StoredPasskey = {
    credentialId,
    publicKey,
    counter: credential.counter,
    aaguid,
    label: label ?? `Passkey ${new Date().toLocaleDateString()}`,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    transports: (credential.transports ?? []) as string[],
  };

  const ds = await getDataSource();
  await ds.transaction(async (manager) => {
    const repo = manager.getRepository(UserSecurityEntity);
    const security = await repo.findOne({ where: { userId: user.userId } });
    const currentPasskeys = (security?.passkeys ?? []) as StoredPasskey[];
    await repo.update({ userId: user.userId }, {
      passkeyEnabled: true,
      passkeys: [...currentPasskeys, newPasskey] as any,
    });
  });

  await redis.del(PASSKEY_REG_CHALLENGE_KEY(user.userId));
  await clearCache(user.userId);

  return { credentialId };
}
