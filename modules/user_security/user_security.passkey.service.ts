import 'reflect-metadata';
import { env } from '@/modules/env';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

import { getDataSource } from '@/modules/db';
import { User as UserEntity } from '../user/entities/user.entity';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import redis from '@/modules/redis';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserSecurityService from './user_security.service';
import PasskeyMessages from './user_security.passkey.messages';
import {
  PASSKEY_REG_CHALLENGE_KEY,
  PASSKEY_AUTH_CHALLENGE_KEY,
  PASSKEY_EMAIL_CHALLENGE_KEY,
  PASSKEY_CHALLENGE_TTL_SECONDS,
  PASSKEY_MAX_PER_USER,
} from './user_security.passkey.constants';
import { StoredPasskey } from './user_security.types';
import { SafeUser, SafeUserSchema } from '../user/user.types';

const isDev = env.NODE_ENV === 'development';

function parseHost(raw: string): { hostname: string; origin: string } {
  const withProto = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProto);
  return { hostname: u.hostname, origin: u.origin };
}

const { hostname: APPLICATION_HOSTNAME, origin: APPLICATION_ORIGIN } = parseHost(
  env.NEXT_PUBLIC_APPLICATION_HOST ?? (isDev ? `http://localhost:${env.PORT ?? 3000}` : 'localhost'),
);

const RP_NAME = env.NEXT_PUBLIC_APPLICATION_NAME!;
const RP_ID = env.WEBAUTHN_RP_ID || APPLICATION_HOSTNAME;
const ORIGIN = env.WEBAUTHN_ORIGIN ?? APPLICATION_ORIGIN;

export default class UserSecurityPasskeyService {

  static async generateRegistrationOptions(user: SafeUser): Promise<Record<string, unknown>> {
    const userSecurity = await UserSecurityService.getByUserId(user.userId);

    if (userSecurity.passkeys.length >= PASSKEY_MAX_PER_USER) {
      throw new AppError(PasskeyMessages.PASSKEY_LIMIT_REACHED, 409, ErrorCode.CONFLICT);
    }

    const excludeCredentials = userSecurity.passkeys.map((pk) => ({
      id: pk.credentialId,
      transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
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

  static async verifyRegistration({
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
    await UserSecurityService['clearCache'](user.userId);

    return { credentialId };
  }

  static async generateAuthenticationOptions(email?: string): Promise<Record<string, unknown>> {
    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];
    let cacheKey: string;

    if (email) {
      const ds = await getDataSource();
      const user = await ds.getRepository(UserEntity).findOne({ where: { email: email.toLowerCase() } });
      if (!user) throw new AppError(PasskeyMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const userSecurity = await UserSecurityService.getByUserId(user.userId);

      if (!userSecurity.passkeyEnabled || userSecurity.passkeys.length === 0) {
        throw new AppError(PasskeyMessages.PASSKEY_NOT_REGISTERED, 404, ErrorCode.NOT_FOUND);
      }

      allowCredentials = userSecurity.passkeys.map((pk) => ({
        id: pk.credentialId,
        transports: (pk.transports ?? []) as AuthenticatorTransportFuture[],
      }));

      cacheKey = PASSKEY_AUTH_CHALLENGE_KEY(user.userId);
    } else {
      cacheKey = PASSKEY_EMAIL_CHALLENGE_KEY('_resident_');
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials,
    });

    await redis.set(cacheKey, options.challenge, 'EX', PASSKEY_CHALLENGE_TTL_SECONDS);

    return options as unknown as Record<string, unknown>;
  }

  static async verifyAuthentication({
    response,
    email,
  }: {
    response: AuthenticationResponseJSON;
    email?: string;
  }): Promise<SafeUser> {
    const ds = await getDataSource();

    const securityRow = await ds
      .getRepository(UserSecurityEntity)
      .createQueryBuilder('us')
      .select('us.userId')
      .where(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(us.passkeys) elem WHERE elem->>'credentialId' = :credId)`,
        { credId: response.id },
      )
      .limit(1)
      .getRawOne<{ us_userId: string }>();

    let matchedUser = securityRow
      ? await ds.getRepository(UserEntity).findOne({ where: { userId: securityRow.us_userId } })
      : null;

    if (!matchedUser && email) {
      matchedUser = await ds.getRepository(UserEntity).findOne({ where: { email: email.toLowerCase() } });
    }

    if (!matchedUser) throw new AppError(PasskeyMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const userSecurity = await UserSecurityService.getByUserId(matchedUser.userId);

    const storedPasskey = userSecurity.passkeys.find((pk) => pk.credentialId === response.id);
    if (!storedPasskey) throw new AppError(PasskeyMessages.PASSKEY_NOT_REGISTERED, 404, ErrorCode.NOT_FOUND);

    const userChallengeKey = PASSKEY_AUTH_CHALLENGE_KEY(matchedUser.userId);
    const residentChallengeKey = PASSKEY_EMAIL_CHALLENGE_KEY('_resident_');

    let challenge = await redis.get(userChallengeKey);
    let usedKey = userChallengeKey;

    if (!challenge) {
      challenge = await redis.get(residentChallengeKey);
      usedKey = residentChallengeKey;
    }

    if (!challenge) throw new AppError(PasskeyMessages.PASSKEY_CHALLENGE_EXPIRED, 400, ErrorCode.VALIDATION_ERROR);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedPasskey.credentialId,
        publicKey: Buffer.from(storedPasskey.publicKey, 'base64url'),
        counter: storedPasskey.counter,
        transports: (storedPasskey.transports ?? []) as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) throw new AppError(PasskeyMessages.PASSKEY_AUTHENTICATION_FAILED, 400, ErrorCode.VALIDATION_ERROR);

    const updatedPasskeys = userSecurity.passkeys.map((pk) =>
      pk.credentialId === storedPasskey.credentialId
        ? {
            ...pk,
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date().toISOString(),
          }
        : pk
    );

    await UserSecurityService.updateUserSecurity(matchedUser.userId, { passkeys: updatedPasskeys });
    await redis.del(usedKey);

    return SafeUserSchema.parse(matchedUser);
  }

  static async deletePasskey(user: SafeUser, credentialId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(UserSecurityEntity);
      const security = await repo.findOne({ where: { userId: user.userId } });
      const currentPasskeys = (security?.passkeys ?? []) as StoredPasskey[];

      const exists = currentPasskeys.some((pk) => pk.credentialId === credentialId);
      if (!exists) throw new AppError(PasskeyMessages.PASSKEY_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const remaining = currentPasskeys.filter((pk) => pk.credentialId !== credentialId);
      await repo.update({ userId: user.userId }, {
        passkeys: remaining as any,
        passkeyEnabled: remaining.length > 0,
      });
    });
    await UserSecurityService['clearCache'](user.userId);
  }

  static async listPasskeys(
    userId: string
  ): Promise<{ credentialId: string; label?: string; createdAt: string; lastUsedAt?: string | null; transports?: string[] }[]> {
    const userSecurity = await UserSecurityService.getByUserId(userId);

    return userSecurity.passkeys.map(({ credentialId, label, createdAt, lastUsedAt, transports }) => ({
      credentialId,
      label,
      createdAt,
      lastUsedAt,
      transports,
    }));
  }
}
