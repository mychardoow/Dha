import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "military-grade-jwt-secret-change-in-production";

// Type for authenticated user in request object (excludes sensitive fields)
export type AuthenticatedUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};


export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user: { id: string; username: string; email: string; role: string }): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please provide a valid Bearer token" 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: "Invalid token", 
        message: "Token has expired or is invalid" 
      });
    }

    const user = await storage.getUser(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: "User not found or inactive", 
        message: "User account is not active" 
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    // Log authentication event
    await storage.createSecurityEvent({
      userId: user.id,
      eventType: "authentication_success",
      severity: "low",
      details: { method: "jwt_token" },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    
    // Log failed authentication
    await storage.createSecurityEvent({
      eventType: "authentication_failed",
      severity: "medium",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    });

    res.status(500).json({ 
      error: "Authentication error", 
      message: "Internal server error during authentication" 
    });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Please authenticate first" 
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        message: `Role '${user.role}' does not have access to this resource` 
      });
    }

    next();
  };
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: "API key required",
        message: "Please provide a valid API key in X-API-Key header" 
      });
    }

    // Hash the provided API key to compare with stored hash
    const keyHash = await bcrypt.hash(apiKey, 12);
    const storedKey = await storage.getApiKeyByHash(keyHash);
    
    if (!storedKey) {
      return res.status(401).json({ 
        error: "Invalid API key",
        message: "API key is not valid or has been revoked" 
      });
    }

    if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
      return res.status(401).json({ 
        error: "API key expired",
        message: "API key has expired" 
      });
    }

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(storedKey.id);

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({ 
      error: "API key validation error",
      message: "Internal server error during API key validation" 
    });
  }
}
