import { z } from 'zod';

// IP protocol version of an address or subnet.
export const IpVersionEnum = z.enum(['v4', 'v6']);
export type IpVersion = z.infer<typeof IpVersionEnum>;
