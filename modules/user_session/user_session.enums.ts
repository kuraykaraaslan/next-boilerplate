import { z } from "zod";

export const SessionStatusEnum = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);

export type SessionStatus = z.infer<typeof SessionStatusEnum>;
