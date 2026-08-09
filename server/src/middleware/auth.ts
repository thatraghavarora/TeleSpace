import type { NextFunction, Request, Response } from "express";
import { verifySession, type JwtUser } from "../lib/jwt.js";

export type AuthenticatedRequest = Request & {
  auth?: JwtUser;
};

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ success: false, message: "Missing bearer token." });
  }

  try {
    req.auth = verifySession(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}
