import fs from "fs";
import path from "path";

const FILE_STORE_PATH = path.join(process.cwd(), "file_store.json");

export interface StoredDrive {
  id: string;
  telegram_user_id: string;
  name: string;
  created_at: string;
}

export interface StoredFolder {
  id: string;
  telegram_user_id: string;
  drive_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  created_at: string;
}

export interface StoredFile {
  id: string;
  telegram_file_id: string;
  telegram_user_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  data_url?: string | null;
  caption?: string | null;
  drive_id?: string;
  folder_id?: string | null;
  folder_name?: string | null;
  created_at: string;
}

export interface StoreData {
  drives: StoredDrive[];
  folders: StoredFolder[];
  files: StoredFile[];
}

export function parseFolderFromPath(rawName: string, caption?: string | null) {
  let folderName: string | null = null;
  let fileName = rawName;

  const target = caption && caption.includes(">") ? caption : rawName;

  if (target.includes(">")) {
    const parts = target.split(">").map((s) => s.trim());
    if (parts.length >= 2) {
      folderName = parts[0].replace(/^Saved from your file manager:\s*/i, "").trim();
      fileName = parts[parts.length - 1].trim();
    }
  }

  return { folderName, fileName };
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(FILE_STORE_PATH)) {
      const initial: StoreData = { drives: [], folders: [], files: [] };
      fs.writeFileSync(FILE_STORE_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    const content = fs.readFileSync(FILE_STORE_PATH, "utf-8");
    const parsed = JSON.parse(content || "{}");

    // Compatibility check if store was previously array
    if (Array.isArray(parsed)) {
      return { drives: [], folders: [], files: parsed };
    }
    return {
      drives: parsed.drives || [],
      folders: parsed.folders || [],
      files: parsed.files || []
    };
  } catch {
    return { drives: [], folders: [], files: [] };
  }
}

function saveStore(data: StoreData) {
  try {
    fs.writeFileSync(FILE_STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save file store:", err);
  }
}

function ensureUserStoreMigration(store: StoreData, telegramUserId: string): StoreData {
  let modified = false;

  // Always associate store items with the active telegramUserId if single-user store
  if (store.files.some((f) => String(f.telegram_user_id) !== String(telegramUserId))) {
    store.files = store.files.map((f) => ({
      ...f,
      telegram_user_id: telegramUserId,
      drive_id: f.drive_id || "drive-main"
    }));
    modified = true;
  }

  if (store.folders.some((f) => String(f.telegram_user_id) !== String(telegramUserId))) {
    store.folders = store.folders.map((f) => ({
      ...f,
      telegram_user_id: telegramUserId,
      drive_id: f.drive_id || "drive-main"
    }));
    modified = true;
  }

  if (store.drives.some((d) => String(d.telegram_user_id) !== String(telegramUserId))) {
    store.drives = store.drives.map((d) => ({
      ...d,
      telegram_user_id: telegramUserId
    }));
    modified = true;
  }

  // Auto-create missing folders for files with folder_name
  for (const file of store.files) {
    if (file.folder_name) {
      let folder = store.folders.find(
        (f) => String(f.telegram_user_id) === String(telegramUserId) && f.name.toLowerCase() === file.folder_name!.toLowerCase()
      );

      if (!folder) {
        folder = {
          id: `f-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          telegram_user_id: telegramUserId,
          drive_id: file.drive_id || "drive-main",
          parent_id: null,
          name: file.folder_name,
          color: "#3B82F6",
          created_at: new Date().toISOString()
        };
        store.folders.push(folder);
        modified = true;
      }

      if (file.folder_id !== folder.id) {
        file.folder_id = folder.id;
        modified = true;
      }
    }
  }

  if (modified) {
    saveStore(store);
  }
  return store;
}

// Drives Methods
export function getUserDrives(telegramUserId: string): StoredDrive[] {
  let store = loadStore();
  store = ensureUserStoreMigration(store, telegramUserId);
  const userDrives = store.drives.filter((d) => String(d.telegram_user_id) === String(telegramUserId));
  if (userDrives.length === 0) {
    const defaultDrive: StoredDrive = {
      id: "drive-main",
      telegram_user_id: telegramUserId,
      name: "Main Drive",
      created_at: new Date().toISOString()
    };
    store.drives.push(defaultDrive);
    saveStore(store);
    return [defaultDrive];
  }
  return userDrives;
}

export function createDriveInStore(drive: StoredDrive): StoredDrive {
  const store = loadStore();
  store.drives.push(drive);
  saveStore(store);
  return drive;
}

export function deleteDriveInStore(driveId: string, telegramUserId: string) {
  const store = loadStore();
  store.drives = store.drives.filter((d) => d.id !== driveId || String(d.telegram_user_id) !== String(telegramUserId));
  store.folders = store.folders.filter((f) => f.drive_id !== driveId);
  store.files = store.files.filter((f) => f.drive_id !== driveId);
  saveStore(store);
}

// Folders Methods
export function getUserFolders(telegramUserId: string, driveId?: string): StoredFolder[] {
  let store = loadStore();
  store = ensureUserStoreMigration(store, telegramUserId);
  return store.folders.filter((f) => {
    const matchUser = String(f.telegram_user_id) === String(telegramUserId);
    if (!matchUser) return false;
    if (driveId && f.drive_id !== driveId) return false;
    return true;
  });
}

export function createFolderInStore(folder: StoredFolder): StoredFolder {
  const store = loadStore();
  store.folders.push(folder);
  saveStore(store);
  return folder;
}

export function deleteFolderInStore(folderId: string, telegramUserId: string) {
  const store = loadStore();
  store.folders = store.folders.filter((f) => f.id !== folderId || String(f.telegram_user_id) !== String(telegramUserId));
  store.files = store.files.map((file) => (file.folder_id === folderId ? { ...file, folder_id: null } : file));
  saveStore(store);
}

// Files & Paginated Search Methods (Implement A & B)
export function addFileToStore(file: StoredFile) {
  const store = loadStore();
  const parsed = parseFolderFromPath(file.file_name, file.caption);

  let folderId = file.folder_id || null;
  const folderName = file.folder_name || parsed.folderName || null;

  // Auto-resolve folder ID if folderName is present
  if (folderName && !folderId) {
    const existing = store.folders.find(
      (f) => String(f.telegram_user_id) === String(file.telegram_user_id) && f.name.toLowerCase() === folderName.toLowerCase()
    );
    if (existing) {
      folderId = existing.id;
    } else {
      const newFolder: StoredFolder = {
        id: `f-auto-${Date.now()}`,
        telegram_user_id: file.telegram_user_id,
        drive_id: file.drive_id || "drive-main",
        parent_id: null,
        name: folderName,
        color: "#3B82F6",
        created_at: new Date().toISOString()
      };
      store.folders.push(newFolder);
      folderId = newFolder.id;
    }
  }

  const normalizedFile: StoredFile = {
    ...file,
    drive_id: file.drive_id || "drive-main",
    folder_id: folderId,
    file_name: parsed.fileName || file.file_name,
    folder_name: folderName,
    caption: folderName ? `${folderName} > ${parsed.fileName}` : file.caption || file.file_name
  };

  store.files = store.files.filter((f) => f.id !== normalizedFile.id && f.telegram_file_id !== normalizedFile.telegram_file_id);
  store.files.unshift(normalizedFile);
  saveStore(store);
}

export function getPaginatedUserFiles(
  telegramUserId: string,
  queryOptions: {
    drive_id?: string;
    folder_id?: string | null;
    query?: string;
    page?: number;
    limit?: number;
  }
) {
  let store = loadStore();
  store = ensureUserStoreMigration(store, telegramUserId);
  const { drive_id, folder_id, query, page = 1, limit = 50 } = queryOptions;

  let filtered = store.files.filter((f) => String(f.telegram_user_id) === String(telegramUserId));

  if (drive_id) {
    filtered = filtered.filter((f) => (f.drive_id || "drive-main") === drive_id);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.file_name.toLowerCase().includes(q) ||
        (f.folder_name || "").toLowerCase().includes(q) ||
        (f.caption || "").toLowerCase().includes(q)
    );
  } else if (folder_id !== undefined) {
    filtered = filtered.filter((f) => (f.folder_id || null) === (folder_id || null));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedFiles = filtered.slice(startIndex, startIndex + limit);

  return {
    files: paginatedFiles,
    total,
    page,
    limit,
    totalPages
  };
}

export function getUserFilesFromStore(telegramUserId: string): StoredFile[] {
  let store = loadStore();
  store = ensureUserStoreMigration(store, telegramUserId);
  return store.files.filter((f) => String(f.telegram_user_id) === String(telegramUserId));
}
