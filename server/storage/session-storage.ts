import { eq, lt, gt, sql } from "drizzle-orm";
import type { PostgreSQLStorage } from "../postgresql-storage.js";
import { verificationSessions } from "../schema/tables.js";
import type { VerificationSession, InsertVerificationSession } from "../schema/types.js";
import { DatabaseError } from "../errors/database-error.js";

export interface SessionStorageExtension {
  createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession>;
  getVerificationSession(sessionId: string): Promise<VerificationSession | null>;
  updateVerificationSession(sessionId: string, updates: Partial<VerificationSession>): Promise<VerificationSession>;
  deleteVerificationSession(sessionId: string): Promise<void>;
  cleanupExpiredSessions(before: Date): Promise<void>;
  incrementSessionVerificationCount(sessionId: string): Promise<void>;
}

export function extendWithSessionStorage(storage: PostgreSQLStorage): SessionStorageExtension {
  return {
    async createVerificationSession(session: InsertVerificationSession): Promise<VerificationSession> {
      try {
        const [newSession] = await storage.query
          .insert(verificationSessions)
          .values(session)
          .returning();
        return newSession;
      } catch (error) {
        throw new DatabaseError(
          `Failed to create verification session: ${error.message}`,
          'createVerificationSession',
          error
        );
      }
    },

    async getVerificationSession(sessionId: string): Promise<VerificationSession | null> {
      try {
        const [session] = await storage.query
          .select()
          .from(verificationSessions)
          .where(eq(verificationSessions.sessionId, sessionId));
        return session || null;
      } catch (error) {
        throw new DatabaseError(
          `Failed to get verification session: ${error.message}`,
          'getVerificationSession',
          error
        );
      }
    },

    async updateVerificationSession(
      sessionId: string, 
      updates: Partial<VerificationSession>
    ): Promise<VerificationSession> {
      try {
        const [updated] = await storage.query
          .update(verificationSessions)
          .set({
            ...updates,
            lastActivity: new Date()
          })
          .where(eq(verificationSessions.sessionId, sessionId))
          .returning();
          
        if (!updated) {
          throw new DatabaseError(
            `Session not found: ${sessionId}`,
            'updateVerificationSession'
          );
        }
        
        return updated;
      } catch (error: unknown) {
        throw new DatabaseError(
          `Failed to update verification session: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'updateVerificationSession',
          error instanceof Error ? error : undefined
        );
      }
    },

    async deleteVerificationSession(sessionId: string): Promise<void> {
      try {
        await storage.query
          .delete(verificationSessions)
          .where(eq(verificationSessions.sessionId, sessionId));
      } catch (error: unknown) {
        throw new DatabaseError(
          `Failed to delete verification session: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'deleteVerificationSession',
          error instanceof Error ? error : undefined
        );
      }
    },

    async cleanupExpiredSessions(before: Date): Promise<void> {
      try {
        await storage.query
          .delete(verificationSessions)
          .where(lt(verificationSessions.lastActivity, before));
      } catch (error: unknown) {
        throw new DatabaseError(
          `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'cleanupExpiredSessions',
          error instanceof Error ? error : undefined
        );
      }
    },

    async incrementSessionVerificationCount(sessionId: string): Promise<void> {
      try {
        await storage.query
          .update(verificationSessions)
          .set({
            currentVerifications: sql`${verificationSessions.currentVerifications} + 1`,
            lastActivity: new Date()
          })
          .where(eq(verificationSessions.sessionId, sessionId));
      } catch (error: unknown) {
        throw new DatabaseError(
          `Failed to increment verification count: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'incrementSessionVerificationCount',
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}