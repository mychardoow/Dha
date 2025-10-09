import type { InferModel } from 'drizzle-orm';
import { verificationSessions } from './tables.js';

export type VerificationSession = InferModel<typeof verificationSessions>;
export type InsertVerificationSession = InferModel<typeof verificationSessions, 'insert'>;