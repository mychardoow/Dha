export interface VerificationSession {
  id: string;
  sessionId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'active' | 'expired';
  currentVerifications: number;
  lastActivity: Date;
  createdAt: Date;
}

export interface InsertVerificationSession {
  sessionId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'active' | 'expired';
  currentVerifications?: number;
}