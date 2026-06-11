# Network

Dependency-free leaf module providing **network primitives** shared across the
platform. Today it centralises subnet-based access control; it is the intended
home for future network-layer concerns (geo/ASN lookup, SSRF egress policy,
proxy header parsing, rate-limit keying by network, …).

Everything is modelled as a **subnet (CIDR)**: a single host is just a `/32`
(IPv4) or `/128` (IPv6). A bare address is canonicalised to its host route.

## Exports

Import from the barrel: `import { ipMatchesAllowlist, SubnetListSchema } from '@/modules/network';`

### Matching (`network.ip.ts`)
- `ipMatchesAllowlist(ip, subnets)` — `true` when `ip` is permitted. An empty
  list permits everything; a non-empty one **denies by default** and an
  `unknown`/missing IP **fails closed**. IPv4 CIDR uses real mask arithmetic;
  IPv6 matches by exact (normalised) address.
- `ipInSubnet(ip, subnet)` — whether a single IP falls inside one subnet.
- `parseSubnet(rule)` — `{ subnet, base, bits, version }` or `null` if invalid.
- `normalizeSubnet(rule)` — canonical CIDR form (bare IP → `/32` / `/128`) or `null`.
- `isValidSubnet(rule)` — boolean validity.
- `normalizeIp(ip)` — collapse an IPv4-mapped IPv6 address (`::ffff:1.2.3.4`) to plain IPv4.
- `parseSubnetString(value)` — split a comma/whitespace/newline-separated string into rules.

### Types (`network.types.ts`)
- `SubnetSchema` — Zod schema for a single subnet. Accepts a bare IP and
  canonicalises it to `/32` / `/128`; rejects anything that is not a valid
  address / CIDR block.
- `SubnetListSchema` — array of subnets (capped at 64).
- `Subnet`, `SubnetList`, `SubnetDescriptor` — inferred/structural types.

### Enums (`network.enums.ts`)
- `IpVersionEnum` — `'v4' | 'v6'`.

## Consumers
- **api_key** — per-key and tenant-default subnet allowlists are validated with
  `SubnetListSchema` and enforced at verify time via `ipMatchesAllowlist`.

> Candidate for consolidation: `webhook/webhook.ssrf.ts` also carries IP/CIDR
> logic and could migrate here.
