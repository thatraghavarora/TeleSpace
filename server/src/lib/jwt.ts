import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type JwtUser = {
  sub: string;
  telegram_user_id: string;
  telegram_username: string;
};

export function signSession(user: JwtUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export function verifySession(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtUser;
}
