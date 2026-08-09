import { Router } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { getUserById } from "../services/authService.js";
import {
  addFileToStore,
  createDriveInStore,
  createFolderInStore,
  deleteDriveInStore,
  deleteFolderInStore,
  getPaginatedUserFiles,
  getUserDrives,
  getUserFilesFromStore,
  getUserFolders
} from "../services/fileStore.js";
import { getTelegramBot } from "../telegram/bot.js";

export const filesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 }
});

// DRIVES ROUTES
filesRouter.get("/drives", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const drives = getUserDrives(user.telegram_user_id);
    return res.json({ success: true, drives });
  } catch (error) {
    next(error);
  }
});

filesRouter.post("/drives", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Drive name is required." });

    const newDrive = createDriveInStore({
      id: `drive-${Date.now()}`,
      telegram_user_id: user.telegram_user_id,
      name: name.trim(),
      created_at: new Date().toISOString()
    });
    return res.status(201).json({ success: true, drive: newDrive });
  } catch (error) {
    next(error);
  }
});

filesRouter.delete("/drives/:driveId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    deleteDriveInStore(req.params.driveId, user.telegram_user_id);
    return res.json({ success: true, message: "Drive deleted." });
  } catch (error) {
    next(error);
  }
});

// FOLDERS ROUTES
filesRouter.get("/folders", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const driveId = req.query.drive_id as string | undefined;
    const folders = getUserFolders(user.telegram_user_id, driveId);
    return res.json({ success: true, folders });
  } catch (error) {
    next(error);
  }
});

filesRouter.post("/folders", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const { name, drive_id, parent_id, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Folder name is required." });

    const newFolder = createFolderInStore({
      id: `f-${Date.now()}`,
      telegram_user_id: user.telegram_user_id,
      drive_id: drive_id || "drive-main",
      parent_id: parent_id || null,
      name: name.trim(),
      color: color || "#3B82F6",
      created_at: new Date().toISOString()
    });
    return res.status(201).json({ success: true, folder: newFolder });
  } catch (error) {
    next(error);
  }
});

filesRouter.delete("/folders/:folderId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    deleteFolderInStore(req.params.folderId, user.telegram_user_id);
    return res.json({ success: true, message: "Folder deleted." });
  } catch (error) {
    next(error);
  }
});

// PAGINATED FILES ROUTE (Point A & B implementation)
filesRouter.get("/list", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getUserById(req.auth!.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const drive_id = req.query.drive_id as string | undefined;
    const folder_id = req.query.folder_id === "null" ? null : (req.query.folder_id as string | undefined);
    const query = req.query.query as string | undefined;
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "50", 10);

    const result = getPaginatedUserFiles(user.telegram_user_id, {
      drive_id,
      folder_id,
      query,
      page,
      limit
    });

    const allUserFiles = getUserFilesFromStore(user.telegram_user_id);

    return res.json({
      success: true,
      ...result,
      allFiles: allUserFiles
    });
  } catch (error) {
    next(error);
  }
});

// FILE UPLOAD ROUTE
filesRouter.post("/upload", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a file to upload." });
    }

    const user = await getUserById(req.auth!.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const folderName = req.body.folder_name ? req.body.folder_name.trim() : null;
    const captionText = folderName ? `${folderName} > ${req.file.originalname}` : req.file.originalname;

    const sent = await getTelegramBot().sendDocument(
      user.telegram_user_id,
      req.file.buffer,
      { caption: captionText },
      { filename: req.file.originalname, contentType: req.file.mimetype }
    );

    const telegramFileId = sent.document?.file_id || (sent as any).audio?.file_id || (sent as any).video?.file_id || null;

    const baseURL = process.env.VITE_API_URL || "http://localhost:4000";

    const fileItem = {
      id: String(sent.message_id),
      telegram_file_id: telegramFileId || String(sent.message_id),
      telegram_user_id: user.telegram_user_id,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype || null,
      size_bytes: req.file.size,
      data_url: null,
      preview_url: telegramFileId ? `${baseURL}/files/preview/${telegramFileId}?mime=${encodeURIComponent(req.file.mimetype)}` : null,
      caption: captionText,
      drive_id: req.body.drive_id || "drive-main",
      folder_id: req.body.folder_id || null,
      folder_name: folderName,
      created_at: new Date().toISOString()
    };

    if (telegramFileId) {
      addFileToStore(fileItem);
    }

    return res.status(201).json({
      success: true,
      file: fileItem
    });
  } catch (error) {
    next(error);
  }
});

filesRouter.get("/preview/:fileId", async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const mime = (req.query.mime as string) || "application/octet-stream";
    const bot = getTelegramBot();
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const stream = bot.getFileStream(fileId);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

filesRouter.get("/link/:fileId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { fileId } = req.params;
    const bot = getTelegramBot();
    const link = await bot.getFileLink(fileId);
    return res.json({ success: true, url: link });
  } catch (error) {
    next(error);
  }
});

filesRouter.get("/download/:fileId", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { fileId } = req.params;
    const fileName = (req.query.name as string) || "download";
    const bot = getTelegramBot();
    const stream = bot.getFileStream(fileId);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});
