import { z } from 'zod';
import { normalizeSubnet, isValidSubnet } from './network.ip';

// A single subnet in CIDR form. A bare address is accepted and canonicalised to
// a host route (`/32` for IPv4, `/128` for IPv6); anything that is not a valid
// address / CIDR block is rejected. The runtime matcher (`ipMatchesAllowlist`)
// consumes the canonical form.
export const SubnetSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((v) => normalizeSubnet(v) ?? v)
  .refine(isValidSubnet, { message: 'Invalid subnet — expected CIDR like 192.168.1.182/32 or 10.0.0.0/8.' });
export type Subnet = z.infer<typeof SubnetSchema>;

/** A list of subnets (capped). Empty array = no restriction. */
export const SubnetListSchema = z.array(SubnetSchema).max(64);
export type SubnetList = z.infer<typeof SubnetListSchema>;
