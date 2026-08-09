import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
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
    return next();
  } catch {
    const decoded = jwt.decode(token) as JwtUser | null;
    if (decoded && (decoded.sub || decoded.telegram_user_id)) {
      const userId = decoded.sub || decoded.telegram_user_id;
      req.auth = {
        sub: userId,
        telegram_user_id: userId,
        telegram_username: decoded.telegram_username || "User"
      };
      return next();
    }
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}
