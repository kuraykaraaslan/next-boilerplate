import { getDataSource } from '@/modules/db';
import { UserSecurity as UserSecurityEntity } from './entities/user_security.entity';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import UserSecurityService from './user_security.service';
import PasskeyMessages from './user_security.passkey.messages';
import { StoredPasskey } from './user_security.types';
import { SafeUser } from '../user/user.types';

export default class UserSecurityPasskeyCrudService {

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
