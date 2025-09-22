import type { AuthenticatedUser } from "../middleware/auth";

declare module 'ws';

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

export {};