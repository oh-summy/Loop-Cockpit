// apps/host/src/db/nanoid.ts
import { customAlphabet } from 'nanoid';

// Lowercase + digits only (safe for filenames, URLs, DB keys)
const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

const baseGenerate = customAlphabet(alphabet, 21);

/** Generate a raw nanoid (21 chars, lowercase + digits) */
export function nanoid(): string {
  return baseGenerate();
}

/** Prefix: blueprint ID (bp_xxx) */
export function bpId(): string {
  return 'bp_' + baseGenerate();
}

/** Prefix: run ID (r_xxx) */
export function runId(): string {
  return 'r_' + baseGenerate();
}

/** Prefix: audit event ID (ae_xxx) */
export function auditId(): string {
  return 'ae_' + baseGenerate();
}

/** Prefix: session ID */
export function sessionId(): string {
  return 's_' + baseGenerate();
}

/** Prefix: gate ID */
export function gateId(): string {
  return 'g_' + baseGenerate();
}

/** Prefix: memory ID */
export function memoryId(): string {
  return 'm_' + baseGenerate();
}

/** Prefix: notification ID */
export function notificationId(): string {
  return 'n_' + baseGenerate();
}
