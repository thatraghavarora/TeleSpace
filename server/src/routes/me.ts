import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { getUserById } from "../services/authService.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        username: `@${user.telegram_username}`,
        telegram_id: user.telegram_user_id,
        first_name: user.first_name,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});
