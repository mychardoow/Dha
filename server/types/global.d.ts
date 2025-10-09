import type { AuthenticatedUser } from "../middleware/auth.js";

declare module 'ws';

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

export {};