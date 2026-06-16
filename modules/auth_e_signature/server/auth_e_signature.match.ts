import { getDataSource } from '@nb/db';
import { User as UserEntity } from '@nb/user/server/entities/user.entity';
import type { CountryCode } from '@nb/e_signature/server/e_signature.types';

/**
 * Best-effort fallback user matching for e-signature LOGIN when the presented
 * certificate is not yet bound to any account. Currently only Turkey (match by
 * verified phone). National-id-hash matching is intentionally not implemented
 * yet (the digest is passed through for a future lookup).
 */
export async function findUserByCountryFallback({
  country,
  identifier,
  nationalIdHash,
}: {
  country: CountryCode;
  identifier: string;
  nationalIdHash: string | null;
}): Promise<string | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository(UserEntity);
  if (country === 'TR') {
    const byPhone = await repo.findOne({ where: { phone: identifier } });
    if (byPhone) return byPhone.userId;
  }
  void nationalIdHash;
  return null;
}
