import 'reflect-metadata';
import { generateAuthenticationOptions as genAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { getDataSource } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import redis from '@nb/redis';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import UserSecurityService from './user_security.service';
import PasskeyMessages from './user_security.passkey.messages';
import {
  PASSKEY_AUTH_CHALLENGE_KEY,
  PASSKEY_EMAIL_CHALLENGE_KEY,
  PASSKEY_CHALLENGE_TTL_SECONDS,
} from './user_security.passkey.constants';
import { SafeUser, SafeUserSchema } from '@nb/user/server/user.types';
import { RP_ID, ORIGIN } from './user_security.passkey.config';

export async function generateAuthenticationOptions(email?: string): Promise<Record<string, unknown>> {
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

  const options = await genAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials,
  });

  await redis.set(cacheKey, options.challenge, 'EX', PASSKEY_CHALLENGE_TTL_SECONDS);

  return options as unknown as Record<string, unknown>;
}

export async function verifyAuthentication({
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
