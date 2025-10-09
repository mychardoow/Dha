import { db } from "./db.js";
import {
  type DhaDocumentVerification,
  type InsertDhaDocumentVerification,
  type VerificationSession,
  type InsertVerificationSession,
  type ApiAccess,
  type InsertApiAccess,
  type VerificationHistory,
  type InsertVerificationHistory,
  dhaDocumentVerifications,
  verificationSessions,
  apiAccess,
  verificationHistory
} from "../shared/schema.js";
import { eq, desc, and, gte, sql, or, isNull } from "drizzle-orm";

export class PostgreSQLStorage {
  // Document Verification Methods
  async getDhaDocumentVerification(id: string): Promise<DhaDocumentVerification | undefined> {
    const result = await db
      .select()
      .from(dhaDocumentVerifications)
      .where(eq(dhaDocumentVerifications.id, id))
      .limit(1);
    return result[0];
  }

  async getDhaDocumentVerificationByCode(code: string): Promise<DhaDocumentVerification | undefined> {
    const result = await db
      .select()
      .from(dhaDocumentVerifications)
      .where(eq(dhaDocumentVerifications.verificationCode, code))
      .limit(1);
    return result[0];
  }

  async createDhaDocumentVerification(data: InsertDhaDocumentVerification): Promise<DhaDocumentVerification> {
    const result = await db
      .insert(dhaDocumentVerifications)
      .values(data)
      .returning();
    return result[0];
  }

  async updateDhaDocumentVerification(
    id: string,
    updates: Partial<DhaDocumentVerification>
  ): Promise<DhaDocumentVerification | undefined> {
    const result = await db
      .update(dhaDocumentVerifications)
      .set(updates)
      .where(eq(dhaDocumentVerifications.id, id))
      .returning();
    return result[0];
  }

  // Verification Session Methods
  async getVerificationSession(id: string): Promise<VerificationSession | undefined> {
    const result = await db
      .select()
      .from(verificationSessions)
      .where(eq(verificationSessions.id, id))
      .limit(1);
    return result[0];
  }

  async createVerificationSession(data: InsertVerificationSession): Promise<VerificationSession> {
    const result = await db
      .insert(verificationSessions)
      .values(data)
      .returning();
    return result[0];
  }

  async updateVerificationSession(
    id: string,
    updates: Partial<VerificationSession>
  ): Promise<VerificationSession | undefined> {
    const result = await db
      .update(verificationSessions)
      .set(updates)
      .where(eq(verificationSessions.id, id))
      .returning();
    return result[0];
  }

  async expireVerificationSession(expiryTime: string): Promise<void> {
    await db
      .update(verificationSessions)
      .set({ isActive: false })
      .where(and(
        eq(verificationSessions.isActive, true),
        sql`${verificationSessions.expiresAt} <= ${expiryTime}`
      ));
  }

  // API Access Methods
  async getApiAccess(apiKeyId: string): Promise<ApiAccess | undefined> {
    const result = await db
      .select()
      .from(apiAccess)
      .where(eq(apiAccess.apiKeyId, apiKeyId))
      .limit(1);
    return result[0];
  }

  async updateApiAccess(
    apiKeyId: string,
    updates: Partial<ApiAccess>
  ): Promise<ApiAccess | undefined> {
    const result = await db
      .update(apiAccess)
      .set(updates)
      .where(eq(apiAccess.apiKeyId, apiKeyId))
      .returning();
    return result[0];
  }

  async incrementApiUsage(apiKeyId: string, successful: boolean): Promise<void> {
    await db
      .update(apiAccess)
      .set({
        currentHourlyUsage: sql`${apiAccess.currentHourlyUsage} + 1`
      })
      .where(eq(apiAccess.apiKeyId, apiKeyId));
  }

  // Verification History Methods
  async createVerificationHistory(data: InsertVerificationHistory): Promise<VerificationHistory> {
    const result = await db
      .insert(verificationHistory)
      .values(data)
      .returning();
    return result[0];
  }

  async getVerificationHistory(verificationId: string): Promise<VerificationHistory[]> {
    return await db
      .select()
      .from(verificationHistory)
      .where(eq(verificationHistory.verificationId, verificationId))
      .orderBy(desc(verificationHistory.createdAt));
  }

  // Additional Query Methods
  async getDhaDocumentVerifications(): Promise<DhaDocumentVerification[]> {
    return await db
      .select()
      .from(dhaDocumentVerifications)
      .orderBy(desc(dhaDocumentVerifications.createdAt));
  }

  async getDocumentVerificationsByNumber(documentNumber: string): Promise<DhaDocumentVerification[]> {
    return await db
      .select()
      .from(dhaDocumentVerifications)
      .where(eq(dhaDocumentVerifications.documentNumber, documentNumber))
      .orderBy(desc(dhaDocumentVerifications.createdAt));
  }
}