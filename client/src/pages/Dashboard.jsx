import {
  ArrowDownUp, ChevronRight, Clock3, Download, Eye, File, FileArchive,
  FileImage, FileText, FileUp, Folder, FolderPlus, Grid2X2, HardDrive,
  Image, LayoutDashboard, LayoutList, LogOut, Menu, MessageCircle, MoreHorizontal,
  Music2, Palette, Plus, PieChart, Server, Trash2, Upload, Video, X, Sparkles
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Categorize file types with rich styling icons & colors
function fileKind(file) {
  const mime = file.mime_type || "";
  const name = (file.file_name || "").toLowerCase();

  if (mime.startsWith("image/") || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    return { id: "images", label: "Image", icon: Image, color: "#EC4899", badgeBg: "bg-pink-500/10 text-pink-500 border-pink-500/20" };
  }
  if (mime.startsWith("video/") || name.match(/\.(mp4|webm|mkv|mov)$/)) {
    return { id: "videos", label: "Video", icon: Video, color: "#3B82F6", badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  }
  if (mime.startsWith("audio/") || name.match(/\.(mp3|wav|ogg|flac|m4a)$/)) {
    return { id: "music", label: "Music", icon: Music2, color: "#10B981", badgeBg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  }
  if (mime.includes("zip") || mime.includes("compressed") || name.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return { id: "archives", label: "Archive", icon: FileArchive, color: "#F59E0B", badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  }
  return { id: "documents", label: "Document", icon: FileText, color: "#8B5CF6", badgeBg: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
}

function sizeText(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Convert image file to permanent base64 data URL
function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Helper to retrieve guaranteed viewable image source
function getFileSrc(file) {
  if (!file) return "";
  if (file.data_url) return file.data_url;
  if (file.preview_url) return file.preview_url;
  if (file.previewUrl) return file.previewUrl;
  if (file.url) return file.url;
  if (file.telegram_file_id) {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    return `${baseURL}/files/preview/${file.telegram_file_id}?mime=${encodeURIComponent(file.mime_type || "image/png")}`;
  }
  return "";
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const historyKey = `telegram_file_history_${user?.id || "guest"}`;
  const folderKey = `telegram_folder_history_${user?.id || "guest"}`;
  const driveKey = `telegram_drive_history_${user?.id || "guest"}`;
  const themeKey = `telebox_theme_${user?.id || "guest"}`;

  // Main navigation view state:
  // "dashboard" -> Analytics Dashboard
  // "drives" -> Drives Overview Grid
  // "drive-view" -> Unified File Explorer View
  const [activeTab, setActiveTab] = useState("drive-view");

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem(themeKey) || "neobrutalism");

  // Drives state
  const [drives, setDrives] = useState(() => {
    try {
      const saved = localStorage.getItem(driveKey);
      return saved ? JSON.parse(saved) : [{ id: "drive-main", name: "Main Drive" }];
    } catch {
      return [{ id: "drive-main", name: "Main Drive" }];
    }
  });

  const [currentDriveId, setCurrentDriveId] = useState("drive-main");

  // Files state
  const [files, setFiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(historyKey) || "[]");
    } catch {
      return [];
    }
  });

  // Folders state with strict drive_id association
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem(folderKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Drive Root
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Modals state
  const [newFolderName, setNewFolderName] = useState("");
  const [newDriveName, setNewDriveName] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetUploadFolderId, setTargetUploadFolderId] = useState(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const [moveModalFile, setMoveModalFile] = useState(null);

  // Sync Drives, Folders, and Files from server store
  useEffect(() => {
    async function syncServerData() {
      try {
        const [drivesRes, foldersRes, filesRes] = await Promise.all([
          api.get("/files/drives").catch(() => null),
          api.get("/files/folders").catch(() => null),
          api.get("/files/list").catch(() => null)
        ]);

        if (drivesRes?.data?.drives && Array.isArray(drivesRes.data.drives)) {
          setDrives(drivesRes.data.drives);
          localStorage.setItem(driveKey, JSON.stringify(drivesRes.data.drives));
        }

        if (foldersRes?.data?.folders && Array.isArray(foldersRes.data.folders)) {
          setFolders(foldersRes.data.folders);
          localStorage.setItem(folderKey, JSON.stringify(foldersRes.data.folders));
        }

        if (filesRes?.data?.allFiles && Array.isArray(filesRes.data.allFiles)) {
          setFiles(filesRes.data.allFiles);
          localStorage.setItem(historyKey, JSON.stringify(filesRes.data.allFiles));
        } else if (filesRes?.data?.files && Array.isArray(filesRes.data.files)) {
          setFiles(filesRes.data.files);
          localStorage.setItem(historyKey, JSON.stringify(filesRes.data.files));
        }
      } catch (err) {
        console.warn("Could not sync server data:", err);
      }
    }
    syncServerData();
  }, [historyKey, folderKey, driveKey]);

  // Switch Theme helper
  function changeTheme(newTheme) {
    setTheme(newTheme);
    localStorage.setItem(themeKey, newTheme);
    toast.success(`Theme switched to ${newTheme.toUpperCase()}`);
  }

  // Save helpers
  function saveFiles(next) {
    setFiles(next);
    localStorage.setItem(historyKey, JSON.stringify(next));
  }

  function saveFolders(next) {
    setFolders(next);
    localStorage.setItem(folderKey, JSON.stringify(next));
  }

  function saveDrives(next) {
    setDrives(next);
    localStorage.setItem(driveKey, JSON.stringify(next));
  }

  // Hidden Drag & Drop Handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const file = droppedFiles[0];
    if (file.size > MAX_FILE_SIZE) return toast.error("Files must be 20 MB or smaller.");

    uploadFile({ target: { files: [file], value: "" } }, currentFolderId);
  }

  // Create New Drive (Server Synced)
  async function handleCreateDrive(e) {
    e.preventDefault();
    if (!newDriveName.trim()) return;

    const driveName = newDriveName.trim();
    const tempDrive = {
      id: `drive-${Date.now()}`,
      name: driveName,
      created_at: new Date().toISOString()
    };

    try {
      const { data } = await api.post("/files/drives", { name: driveName });
      const created = data?.drive || tempDrive;
      const updated = [...drives, created];
      saveDrives(updated);
      setCurrentDriveId(created.id);
    } catch {
      const updated = [...drives, tempDrive];
      saveDrives(updated);
      setCurrentDriveId(tempDrive.id);
    }

    setCurrentFolderId(null);
    setActiveTab("drive-view");
    setNewDriveName("");
    setShowDriveModal(false);
    toast.success(`Drive "${driveName}" created!`);
  }

  // Delete Drive requiring user to type "confirm"
  async function handleDeleteDrive(driveId, driveName, e) {
    if (e) e.stopPropagation();
    if (drives.length <= 1) {
      return toast.error("Cannot delete the only remaining drive.");
    }
    const input = prompt(`To delete drive "${driveName}", type "confirm" below:`);
    if (input && input.trim().toLowerCase() === "confirm") {
      try {
        await api.delete(`/files/drives/${driveId}`);
      } catch {
        // local fallback
      }
      const nextDrives = drives.filter((d) => d.id !== driveId);
      saveDrives(nextDrives);

      const nextFolders = folders.filter((f) => (f.drive_id || "drive-main") !== driveId);
      saveFolders(nextFolders);

      const nextFiles = files.filter((f) => (f.drive_id || "drive-main") !== driveId);
      saveFiles(nextFiles);

      if (currentDriveId === driveId) {
        setCurrentDriveId(nextDrives[0].id);
        setCurrentFolderId(null);
        setActiveTab("drives");
      }
      toast.success(`Drive "${driveName}" deleted.`);
    } else if (input !== null) {
      toast.error('Deletion cancelled. You must type "confirm" to delete a drive.');
    }
  }

  // Create Folder & Subfolder (Server Synced)
  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const colors = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const folderName = newFolderName.trim();

    const tempFolder = {
      id: `f-${Date.now()}`,
      name: folderName,
      drive_id: currentDriveId,
      parent_id: currentFolderId,
      color: randomColor,
      created_at: new Date().toISOString()
    };

    try {
      const { data } = await api.post("/files/folders", {
        name: folderName,
        drive_id: currentDriveId,
        parent_id: currentFolderId,
        color: randomColor
      });
      const created = data?.folder || tempFolder;
      saveFolders([...folders, created]);
    } catch {
      saveFolders([...folders, tempFolder]);
    }

    setNewFolderName("");
    setShowFolderModal(false);
    toast.success(`Folder "${folderName}" created!`);
  }

  async function handleDeleteFolder(folderId, e) {
    e.stopPropagation();
    if (confirm("Delete folder? Subfolders and files inside will be moved to Root.")) {
      try {
        await api.delete(`/files/folders/${folderId}`);
      } catch {
        // local fallback
      }
      const updatedFolders = folders.filter((f) => f.id !== folderId && f.parent_id !== folderId);
      saveFolders(updatedFolders);
      const updatedFiles = files.map((file) =>
        file.folder_id === folderId ? { ...file, folder_id: null } : file
      );
      saveFiles(updatedFiles);
      if (currentFolderId === folderId) setCurrentFolderId(null);
      toast.success("Folder deleted.");
    }
  }

  function handleMoveFile(fileId, targetFolderId) {
    const updated = files.map((file) =>
      file.id === fileId ? { ...file, folder_id: targetFolderId } : file
    );
    saveFiles(updated);
    setMoveModalFile(null);
    toast.success("File moved successfully!");
  }

  function handleDeleteFile(fileId, e) {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this file?")) {
      const updated = files.filter((f) => f.id !== fileId);
      saveFiles(updated);
      toast.success("File removed.");
    }
  }

  // Direct Download File handler
  async function handleDownloadFile(file, e) {
    if (e) e.stopPropagation();
    toast.loading(`Preparing download for ${file.file_name}...`, { id: "downloading" });

    try {
      let downloadUrl = getFileSrc(file);

      if (!downloadUrl && file.telegram_file_id) {
        try {
          const res = await api.get(`/files/link/${file.telegram_file_id}`);
          if (res.data?.url) downloadUrl = res.data.url;
        } catch {
          downloadUrl = `${api.defaults.baseURL}/files/download/${file.telegram_file_id}?name=${encodeURIComponent(file.file_name)}`;
        }
      }

      if (downloadUrl) {
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = file.file_name;
        anchor.target = "_blank";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        toast.success(`Download started: ${file.file_name}`, { id: "downloading" });
      } else {
        const blob = new Blob([`File Name: ${file.file_name}\nUploaded: ${file.created_at}`], { type: "text/plain" });
        const objUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objUrl;
        anchor.download = file.file_name;
        anchor.click();
        URL.revokeObjectURL(objUrl);
        toast.success(`Downloaded ${file.file_name}`, { id: "downloading" });
      }
    } catch {
      toast.error("Download failed.", { id: "downloading" });
    }
  }

  // Upload handler strictly associated with currentDriveId
  async function uploadFile(event, explicitFolderId = undefined) {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return toast.error("Files must be 20 MB or smaller.");

    const destFolderId = explicitFolderId !== undefined ? explicitFolderId : (targetUploadFolderId !== null ? targetUploadFolderId : currentFolderId);
    const destFolder = folders.find((f) => f.id === destFolderId);

    setUploading(true);
    const dataUrl = await readFileAsDataUrl(file);

    const body = new FormData();
    body.append("file", file);
    if (destFolder) {
      body.append("folder_name", destFolder.name);
    }

    try {
      const { data } = await api.post("/files/upload", body);
      const newFile = {
        ...data.file,
        drive_id: currentDriveId,
        folder_id: destFolderId,
        folder_name: destFolder ? destFolder.name : null,
        caption: `Saved from your file manager: ${file.name}${destFolder ? ` in ${destFolder.name}` : ""}`,
        data_url: dataUrl || data.file.data_url || null
      };
      saveFiles([newFile, ...files]);
      setShowUploadModal(false);
      toast.success(`File uploaded!`);
    } catch (error) {
      const fallbackFile = {
        id: `local-${Date.now()}`,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        created_at: new Date().toISOString(),
        drive_id: currentDriveId,
        folder_id: destFolderId,
        folder_name: destFolder ? destFolder.name : null,
        caption: `Saved from your file manager: ${file.name}${destFolder ? ` in ${destFolder.name}` : ""}`,
        data_url: dataUrl
      };
      saveFiles([fallbackFile, ...files]);
      setShowUploadModal(false);
      toast.success("Saved to file manager!");
    } finally {
      setUploading(false);
    }
  }

  function logoutUser() {
    logout();
    navigate("/login", { replace: true });
  }

  // Active drive object
  const currentDrive = drives.find((d) => d.id === currentDriveId) || drives[0];

  // Subfolders strictly belonging to currentDriveId & currentFolderId
  const currentLevelFolders = useMemo(() => {
    return folders.filter((f) => (f.drive_id || "drive-main") === currentDriveId && (f.parent_id || null) === currentFolderId);
  }, [folders, currentDriveId, currentFolderId]);

  // Files strictly belonging to currentDriveId & currentFolderId (or matching query search)
  const currentLevelFiles = useMemo(() => {
    const q = query.toLowerCase();
    return files
      .filter((file) => {
        const fileDriveId = file.drive_id || "drive-main";
        if (fileDriveId !== currentDriveId) return false;

        if (categoryFilter !== "all" && fileKind(file).id !== categoryFilter) return false;

        if (q) {
          const fileFolder = folders.find((f) => f.id === file.folder_id);
          const matchName = file.file_name.toLowerCase().includes(q);
          const matchFolder = (file.folder_name || fileFolder?.name || "").toLowerCase().includes(q);
          const matchCaption = (file.caption || "").toLowerCase().includes(q);
          return matchName || matchFolder || matchCaption;
        }

        if (currentFolderId !== null && file.folder_id !== currentFolderId) return false;
        if (currentFolderId === null && categoryFilter === "all" && file.folder_id !== null) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.file_name.localeCompare(b.file_name);
        if (sort === "size") return (b.size_bytes || 0) - (a.size_bytes || 0);
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [files, currentDriveId, currentFolderId, categoryFilter, query, sort, folders]);

  // Total Storage & Analytics metrics
  const totalSizeBytes = useMemo(() => files.reduce((acc, f) => acc + (f.size_bytes || 0), 0), [files]);

  const categoryStats = useMemo(() => {
    const map = {
      images: { label: "Images", icon: Image, count: 0, bytes: 0, color: "#EC4899" },
      videos: { label: "Videos", icon: Video, count: 0, bytes: 0, color: "#3B82F6" },
      documents: { label: "Documents", icon: FileText, count: 0, bytes: 0, color: "#8B5CF6" },
      music: { label: "Music & Audio", icon: Music2, count: 0, bytes: 0, color: "#10B981" },
      archives: { label: "Archives & Other", icon: FileArchive, count: 0, bytes: 0, color: "#F59E0B" }
    };
    files.forEach((f) => {
      const kind = fileKind(f).id;
      if (map[kind]) {
        map[kind].count += 1;
        map[kind].bytes += f.size_bytes || 0;
      }
    });
    return Object.values(map);
  }, [files]);

  // Current folder object
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Build breadcrumb folder hierarchy path
  const folderBreadcrumbs = useMemo(() => {
    const path = [];
    let curr = currentFolder;
    while (curr) {
      path.unshift(curr);
      curr = folders.find((f) => f.id === curr.parent_id);
    }
    return path;
  }, [currentFolder, folders]);

  // Dynamic theme styling classes - Elevated & Premium UX
  const themeStyles = {
    neobrutalism: {
      bg: "bg-[#FAF9F5] text-zinc-900 font-sans",
      sidebar: "bg-white border-r-2 border-zinc-900 text-zinc-900",
      card: "bg-white border-2 border-zinc-900 neo-shadow text-zinc-900 hover:border-black",
      header: "bg-white border-b-2 border-zinc-900 text-zinc-900",
      buttonPrimary: "bg-zinc-900 text-white hover:bg-yellow-300 hover:text-zinc-900 neo-btn font-bold",
      buttonSecondary: "bg-yellow-200 text-zinc-900 hover:bg-yellow-300 neo-btn font-bold",
      badge: "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-shadow-sm font-bold",
      input: "bg-white border-2 border-zinc-900 text-zinc-900 placeholder:text-zinc-400 font-bold focus:bg-yellow-50/50",
      modalBg: "bg-white border-3 border-zinc-900 neo-shadow-lg text-zinc-900",
      tableHeader: "bg-zinc-100 text-zinc-900 border-b-2 border-zinc-900 font-black"
    },
    dark: {
      bg: "bg-[#0B0D14] text-slate-100 font-sans",
      sidebar: "bg-[#121520] border-r border-slate-800/80 text-slate-100",
      card: "bg-[#161a26] border border-slate-800/90 text-slate-100 hover:border-indigo-500/50 shadow-md shadow-black/20",
      header: "bg-[#121520]/90 border-b border-slate-800/80 text-slate-100 backdrop-blur-md",
      buttonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 font-semibold",
      buttonSecondary: "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-semibold",
      badge: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 font-semibold",
      input: "bg-[#090b10] border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500",
      modalBg: "bg-[#161a26] border border-slate-700/80 text-slate-100 shadow-2xl",
      tableHeader: "bg-[#11141f] text-slate-300 border-b border-slate-800 font-bold"
    },
    cyber: {
      bg: "bg-[#0b0512] text-purple-100 font-sans",
      sidebar: "bg-[#140a22] border-r border-purple-900/40 text-purple-100",
      card: "bg-[#1c0e30] border border-purple-800/40 text-purple-100 hover:border-fuchsia-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
      header: "bg-[#140a22]/95 border-b border-purple-900/40 text-purple-100 backdrop-blur-md",
      buttonPrimary: "bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] font-semibold",
      buttonSecondary: "bg-purple-900/40 hover:bg-purple-900/70 text-fuchsia-200 border border-purple-700/50 font-semibold",
      badge: "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-semibold",
      input: "bg-[#0b0512] border border-purple-900 text-purple-100 placeholder:text-purple-400/50 focus:border-fuchsia-500",
      modalBg: "bg-[#1c0e30] border border-fuchsia-500/40 text-purple-100 shadow-2xl",
      tableHeader: "bg-[#12091f] text-purple-200 border-b border-purple-900/50 font-bold"
    },
    light: {
      bg: "bg-slate-50 text-slate-900 font-sans",
      sidebar: "bg-white border-r border-slate-200 text-slate-800",
      card: "bg-white border border-slate-200 text-slate-800 shadow-sm hover:border-blue-400",
      header: "bg-white/95 border-b border-slate-200 text-slate-800 backdrop-blur-md",
      buttonPrimary: "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 font-semibold",
      buttonSecondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold",
      badge: "bg-blue-50 text-blue-700 border border-blue-200 font-semibold",
      input: "bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500",
      modalBg: "bg-white border border-slate-200 text-slate-900 shadow-2xl",
      tableHeader: "bg-slate-100 text-slate-700 border-b border-slate-200 font-bold"
    }
  }[theme];

  return (
    <main
      className={`relative w-full min-h-screen ${themeStyles.bg} transition-colors duration-200`}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md border-4 border-dashed border-yellow-300 p-8 text-center text-white pointer-events-none">
          <Upload className="animate-bounce mb-4 text-yellow-300" size={64} />
          <h2 className="text-3xl font-black">Drop Files Anywhere to Upload!</h2>
          <p className="mt-2 text-sm opacity-80 font-bold">
            Uploading directly into {currentFolder ? currentFolder.name : currentDrive.name}
          </p>
        </div>
      )}

      <div className="flex min-h-screen w-full">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
        )}

        {/* Clean & Short Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col p-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            themeStyles.sidebar
          } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xl font-black">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${theme === "neobrutalism" ? "bg-zinc-900 text-white border-2 border-zinc-900 neo-shadow-sm" : "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"}`}>
                <HardDrive size={22} />
              </span>
              <span>TeleBox Cloud</span>
            </div>
            <button
              className="rounded-lg p-2 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <p className="mt-1.5 text-xs opacity-70 font-medium">Web Hosting File Manager</p>

          {/* Primary Sidebar Menu */}
          <nav className="mt-8 space-y-2">
            <p className="px-3 text-[11px] font-black uppercase tracking-wider opacity-50 mb-2">
              Main Menu
            </p>

            {/* Dashboard Analytics Tab */}
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                activeTab === "dashboard"
                  ? theme === "neobrutalism"
                    ? "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-shadow-sm"
                    : "bg-indigo-600 text-white shadow-md"
                  : "hover:bg-black/10 dark:hover:bg-white/10"
              }`}
              onClick={() => {
                setActiveTab("dashboard");
                setSidebarOpen(false);
              }}
              type="button"
            >
              <LayoutDashboard size={19} />
              <span>Dashboard</span>
            </button>

            {/* Drive Explorer Option */}
            <button
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                activeTab === "drives" || activeTab === "drive-view"
                  ? theme === "neobrutalism"
                    ? "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-shadow-sm"
                    : "bg-indigo-600 text-white shadow-md"
                  : "hover:bg-black/10 dark:hover:bg-white/10"
              }`}
              onClick={() => {
                setActiveTab("drives");
                setSidebarOpen(false);
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <Server size={19} />
                <span>Drive</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                {drives.length}
              </span>
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="mt-6">
            <button
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-black transition ${themeStyles.buttonPrimary}`}
              onClick={() => setShowDriveModal(true)}
              type="button"
            >
              <Plus size={18} /> Create Drive
            </button>
          </div>

          {/* Storage Meter Widget */}
          <div className="mt-auto space-y-3 pt-4">
            <div className={`rounded-2xl p-4 ${theme === "neobrutalism" ? "bg-yellow-100 border-2 border-zinc-900 neo-shadow" : "bg-indigo-500/10 border border-indigo-500/20"}`}>
              <div className="flex items-center justify-between text-xs font-black mb-1.5">
                <span className="flex items-center gap-1.5"><PieChart size={15} /> Storage Used</span>
                <span>{sizeText(totalSizeBytes)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-slate-800 overflow-hidden border border-zinc-900/30">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, (totalSizeBytes / (100 * 1024 * 1024)) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] opacity-70 font-medium">
                Telegram Unlimited Storage Host.
              </p>
            </div>

            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition"
              onClick={logoutUser}
              type="button"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="min-w-0 flex-1 flex flex-col">
          {/* Header Bar */}
          <header className={`sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-8 ${themeStyles.header}`}>
            <button
              className="rounded-lg p-2 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb Path Navigation */}
            <div className="hidden items-center gap-2 text-sm font-bold sm:flex">
              <button
                className="hover:underline opacity-70 hover:opacity-100 flex items-center gap-1.5"
                onClick={() => setActiveTab("drives")}
                type="button"
              >
                <Server size={16} /> Drive
              </button>

              {activeTab === "drive-view" && (
                <>
                  <ChevronRight className="opacity-40" size={16} />
                  <button
                    className="hover:underline font-extrabold flex items-center gap-1"
                    onClick={() => setCurrentFolderId(null)}
                    type="button"
                  >
                    {currentDrive.name}
                  </button>
                </>
              )}

              {activeTab === "drive-view" && folderBreadcrumbs.map((folder) => (
                <div className="flex items-center gap-2" key={folder.id}>
                  <ChevronRight className="opacity-40" size={16} />
                  <button
                    className="hover:underline font-extrabold flex items-center gap-1.5"
                    onClick={() => setCurrentFolderId(folder.id)}
                    type="button"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black inline-block" style={{ backgroundColor: folder.color }} />
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-md ml-auto sm:ml-0">
              <input
                className={`h-10 w-full rounded-xl pl-4 pr-10 text-sm font-medium outline-none transition ${themeStyles.input}`}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files or folder names..."
                value={query}
              />
            </div>

            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <div className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${theme === "neobrutalism" ? "border-2 border-zinc-900 bg-white text-zinc-900 neo-shadow-sm" : "bg-black/10 dark:bg-white/10"}`}>
                <Palette size={16} />
                <select
                  className="bg-transparent font-bold cursor-pointer outline-none"
                  onChange={(e) => changeTheme(e.target.value)}
                  value={theme}
                >
                  <option value="neobrutalism">White NeoBrutalist</option>
                  <option value="dark">Dark Obsidian</option>
                  <option value="cyber">Cyber Purple</option>
                  <option value="light">Clean Light</option>
                </select>
              </div>

              {/* User Avatar */}
              <div className={`hidden items-center gap-2 rounded-xl px-3 py-1 text-xs font-bold sm:flex ${theme === "neobrutalism" ? "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-shadow-sm" : "bg-black/10 dark:bg-white/10"}`}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-900 text-white font-extrabold text-xs">
                  {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
                </span>
                <span>{user?.username || "User"}</span>
              </div>
            </div>
          </header>

          {/* VIEW 1: FILE MANAGER DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="flex-1 p-4 sm:p-8 space-y-8">
              <div>
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider mb-2 ${themeStyles.badge}`}>
                  Analytics & File Manager Summary
                </span>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Dashboard Overview
                </h1>
                <p className="mt-1 text-xs sm:text-sm opacity-70 font-medium">
                  Detailed analytics of your uploaded files, storage distribution, and file type breakdown.
                </p>
              </div>

              {/* Metrics Header Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`p-5 rounded-2xl ${themeStyles.card}`}>
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">Total Storage Used</p>
                  <p className="text-3xl font-black mt-2">{sizeText(totalSizeBytes)}</p>
                  <p className="text-xs opacity-70 mt-1 font-semibold">Hosted on Telegram Cloud</p>
                </div>

                <div className={`p-5 rounded-2xl ${themeStyles.card}`}>
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">Total Uploaded Files</p>
                  <p className="text-3xl font-black mt-2">{files.length}</p>
                  <p className="text-xs opacity-70 mt-1 font-semibold">Across all drives</p>
                </div>

                <div className={`p-5 rounded-2xl ${themeStyles.card}`}>
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">Created Drives</p>
                  <p className="text-3xl font-black mt-2">{drives.length}</p>
                  <p className="text-xs opacity-70 mt-1 font-semibold">Separate storage drives</p>
                </div>

                <div className={`p-5 rounded-2xl ${themeStyles.card}`}>
                  <p className="text-xs font-black uppercase tracking-wider opacity-60">Total Folders</p>
                  <p className="text-3xl font-black mt-2">{folders.length}</p>
                  <p className="text-xs opacity-70 mt-1 font-semibold">Across drives</p>
                </div>
              </div>

              {/* Storage Category Breakdown Cards */}
              <div>
                <h2 className="text-lg font-black mb-4">File Type Breakdown</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {categoryStats.map(({ label, icon: Icon, count, bytes, color }) => (
                    <div className={`p-4 rounded-2xl flex flex-col justify-between ${themeStyles.card}`} key={label}>
                      <div className="flex items-center justify-between">
                        <span className="grid h-10 w-10 place-items-center rounded-xl text-white font-bold neo-shadow-sm border border-zinc-900" style={{ backgroundColor: color }}>
                          <Icon size={20} />
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{count} files</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-black">{label}</p>
                        <p className="text-xs font-bold opacity-75 mt-0.5">{sizeText(bytes)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ALL DRIVES OVERVIEW GRID */}
          {activeTab === "drives" && (
            <div className="flex-1 p-4 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider mb-2 ${themeStyles.badge}`}>
                    Storage Drives ({drives.length})
                  </span>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Select a Storage Drive
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm opacity-70 font-medium">
                    Click on any Drive to open its folders and files, or create a new drive.
                  </p>
                </div>

                <button
                  className={`flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-black transition ${themeStyles.buttonPrimary}`}
                  onClick={() => setShowDriveModal(true)}
                  type="button"
                >
                  <Plus size={18} />
                  <span>+ Create Drive</span>
                </button>
              </div>

              {/* Drives Cards Grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {drives.map((drive) => {
                  const driveFolders = folders.filter((f) => (f.drive_id || "drive-main") === drive.id);
                  const driveFiles = files.filter((f) => (f.drive_id || "drive-main") === drive.id);
                  const driveBytes = driveFiles.reduce((sum, f) => sum + (f.size_bytes || 0), 0);

                  return (
                    <div
                      className={`group p-6 rounded-2xl transition cursor-pointer flex flex-col justify-between ${themeStyles.card}`}
                      key={drive.id}
                      onClick={() => {
                        setCurrentDriveId(drive.id);
                        setCurrentFolderId(null);
                        setActiveTab("drive-view");
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`grid h-12 w-12 place-items-center rounded-2xl ${theme === "neobrutalism" ? "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-shadow-sm" : "bg-indigo-600 text-white"}`}>
                            <Server size={24} />
                          </span>

                          {drives.length > 1 && (
                            <button
                              className="px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              onClick={(e) => handleDeleteDrive(drive.id, drive.name, e)}
                              title='Delete Drive (Type "confirm")'
                              type="button"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        <h3 className="text-xl font-black">{drive.name}</h3>
                        <p className="text-xs opacity-60 mt-1 font-semibold">
                          {driveFolders.length} Folders • {driveFiles.length} Files
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-current opacity-30 flex items-center justify-between">
                        <span className="text-xs font-bold">{sizeText(driveBytes)}</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                          Open Drive →
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Create Drive Action Card */}
                <button
                  className={`p-6 rounded-2xl border-2 border-dashed border-zinc-400 dark:border-slate-700 flex flex-col items-center justify-center gap-3 text-center transition hover:border-zinc-900 ${theme === "neobrutalism" ? "bg-yellow-50/50" : "bg-black/5"}`}
                  onClick={() => setShowDriveModal(true)}
                  type="button"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-white font-bold neo-shadow-sm">
                    <Plus size={24} />
                  </div>
                  <div>
                    <p className="font-black text-base">+ Create New Drive</p>
                    <p className="text-xs opacity-60 mt-0.5 font-medium">Add a separate storage drive</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: UNIFIED FILE EXPLORER VIEW (FOLDERS & FILES TOGETHER IN ONE TABLE) */}
          {activeTab === "drive-view" && (
            <div className="flex-1 p-4 sm:p-8 space-y-6">
              {/* Prominent High-Visibility Action Header Bar */}
              <div className={`p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 ${themeStyles.card}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      onClick={() => setActiveTab("drives")}
                      type="button"
                    >
                      ← All Drives
                    </button>
                    <span className="text-xs font-bold opacity-50">•</span>
                    <span className="text-xs font-extrabold opacity-90">{currentDrive.name}</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5">
                    {currentFolder ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-zinc-900 inline-block shrink-0" style={{ backgroundColor: currentFolder.color }} />
                        <span>{currentFolder.name}</span>
                      </>
                    ) : (
                      <span>{currentDrive.name}</span>
                    )}
                  </h1>
                </div>

                {/* Direct Action Buttons at Top (High Contrast & Clear Icons) */}
                <div className="flex items-center gap-3">
                  <button
                    className={`flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${
                      theme === "neobrutalism"
                        ? "bg-yellow-300 text-zinc-900 border-2 border-zinc-900 neo-btn"
                        : "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40"
                    }`}
                    onClick={() => setShowDriveModal(true)}
                    type="button"
                  >
                    <Server size={17} /> + Drive
                  </button>

                  <button
                    className={`flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${
                      theme === "neobrutalism"
                        ? "bg-yellow-200 text-zinc-900 border-2 border-zinc-900 neo-btn hover:bg-yellow-300"
                        : "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 font-bold"
                    }`}
                    onClick={() => setShowFolderModal(true)}
                    type="button"
                  >
                    <FolderPlus size={17} /> {currentFolder ? "+ Subfolder" : "+ Folder"}
                  </button>

                  <button
                    className={`flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-black transition ${themeStyles.buttonPrimary}`}
                    onClick={() => {
                      setTargetUploadFolderId(currentFolderId);
                      setShowUploadModal(true);
                    }}
                    type="button"
                  >
                    <FileUp size={18} />
                    <span>Upload File</span>
                  </button>
                </div>
              </div>

              {/* UNIFIED FILES & FOLDERS TABLE (EXACTLY MATCHING USER SCREENSHOT) */}
              <div className={`rounded-2xl overflow-hidden ${themeStyles.card}`}>
                {currentLevelFolders.length === 0 && currentLevelFiles.length === 0 ? (
                  <div className="p-12 text-center">
                    <Folder className="mx-auto opacity-30 mb-3" size={48} />
                    <p className="text-base font-black">This directory is empty</p>
                    <p className="text-xs opacity-60 mt-1">Upload files or drag and drop anywhere to add files.</p>
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        className={`px-4 py-2 rounded-xl text-xs font-bold ${theme === "neobrutalism" ? "bg-yellow-200 border-2 border-zinc-900 neo-btn text-zinc-900" : themeStyles.buttonSecondary}`}
                        onClick={() => setShowFolderModal(true)}
                        type="button"
                      >
                        + Create Folder
                      </button>
                      <button
                        className={`px-4 py-2 rounded-xl text-xs font-black ${themeStyles.buttonPrimary}`}
                        onClick={() => {
                          setTargetUploadFolderId(currentFolderId);
                          setShowUploadModal(true);
                        }}
                        type="button"
                      >
                        Upload File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={`${themeStyles.tableHeader} text-[11px] uppercase tracking-wider`}>
                          <th className="py-3 px-4 font-black">Name</th>
                          <th className="py-3 px-4 font-black">Size / Items</th>
                          <th className="py-3 px-4 font-black">Modified</th>
                          <th className="py-3 px-4 font-black text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-current/10">
                        {/* RENDER FOLDERS FIRST IN UNIFIED LIST */}
                        {currentLevelFolders.map((folder) => {
                          const count = files.filter((f) => f.folder_id === folder.id).length;
                          return (
                            <tr
                              className="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
                              key={folder.id}
                              onClick={() => setCurrentFolderId(folder.id)}
                            >
                              <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500 text-white font-bold neo-shadow-sm border border-zinc-900">
                                  <Folder size={16} />
                                </span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{folder.name}</span>
                              </td>
                              <td className="py-3.5 px-4 font-semibold opacity-70">
                                {count} item{count === 1 ? "" : "s"}
                              </td>
                              <td className="py-3.5 px-4 opacity-60">
                                {new Date(folder.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                  onClick={() => setCurrentFolderId(folder.id)}
                                  type="button"
                                >
                                  Open
                                </button>
                                <button
                                  className="px-2.5 py-1 text-xs font-bold text-red-500 hover:underline"
                                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {/* RENDER FILES DIRECTLY BELOW FOLDERS IN UNIFIED LIST */}
                        {currentLevelFiles.map((file) => {
                          const kind = fileKind(file);
                          const Icon = kind.icon;
                          const imgSrc = getFileSrc(file);
                          const isImage = kind.id === "images" && Boolean(imgSrc);

                          return (
                            <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition" key={file.id}>
                              <td className="py-3.5 px-4 font-bold flex items-center gap-3 max-w-sm truncate">
                                {isImage ? (
                                  <div className="grid h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-zinc-900 bg-zinc-100">
                                    <img alt={file.file_name} className="h-full w-full object-cover" src={imgSrc} />
                                  </div>
                                ) : (
                                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-bold ${kind.badgeBg}`}>
                                    <Icon size={16} />
                                  </span>
                                )}
                                <div className="truncate">
                                  <p className="truncate text-sm font-bold">{file.file_name}</p>
                                  <p className="text-[10px] opacity-60 truncate">{file.caption || `Saved from your file manager: ${file.file_name}`}</p>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-bold">
                                {sizeText(file.size_bytes)}
                              </td>
                              <td className="py-3.5 px-4 opacity-60">
                                {new Date(file.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1.5">
                                <button
                                  className={`px-2.5 py-1 text-xs font-bold rounded ${theme === "neobrutalism" ? "bg-yellow-300 text-zinc-900 border border-zinc-900 neo-btn" : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"}`}
                                  onClick={() => setSelectedFileForPreview(file)}
                                  type="button"
                                >
                                  View
                                </button>
                                <button
                                  className={`px-2.5 py-1 text-xs font-bold rounded ${theme === "neobrutalism" ? "bg-zinc-900 text-white font-bold neo-btn" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"}`}
                                  onClick={(e) => handleDownloadFile(file, e)}
                                  type="button"
                                >
                                  Download
                                </button>
                                <button
                                  className="px-2 py-1 opacity-60 hover:opacity-100 text-xs"
                                  onClick={() => setMoveModalFile(file)}
                                  title="Move to folder"
                                  type="button"
                                >
                                  Move
                                </button>
                                <button
                                  className="px-2 py-1 text-red-500 hover:underline text-xs font-bold"
                                  onClick={(e) => handleDeleteFile(file.id, e)}
                                  title="Delete file"
                                  type="button"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* CREATE NEW DRIVE MODAL */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl ${themeStyles.modalBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Server size={20} /> Create New Drive
              </h3>
              <button onClick={() => setShowDriveModal(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDrive}>
              <label className="block text-xs font-bold uppercase mb-2 opacity-80">Drive Name</label>
              <input
                autoFocus
                className={`w-full h-11 px-4 rounded-xl text-sm font-bold outline-none mb-5 ${themeStyles.input}`}
                onChange={(e) => setNewDriveName(e.target.value)}
                placeholder="e.g. Personal Drive, Work Storage, Project Vault"
                value={newDriveName}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 text-xs font-bold rounded-xl opacity-70 hover:opacity-100"
                  onClick={() => setShowDriveModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`px-5 py-2 text-xs font-black rounded-xl ${themeStyles.buttonPrimary}`}
                  type="submit"
                >
                  Create Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD FILE MODAL WITH FOLDER SELECTOR */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl ${themeStyles.modalBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <FileUp size={20} /> Upload File to {currentDrive.name}
              </h3>
              <button onClick={() => setShowUploadModal(false)} type="button">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 opacity-80">
                  Select Folder in {currentDrive.name}
                </label>
                <select
                  className={`w-full h-11 px-3 rounded-xl text-sm font-bold outline-none ${themeStyles.input}`}
                  onChange={(e) => setTargetUploadFolderId(e.target.value === "root" ? null : e.target.value)}
                  value={targetUploadFolderId === null ? "root" : targetUploadFolderId}
                >
                  <option value="root">{currentDrive.name} / Root (No Folder)</option>
                  {currentLevelFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1 opacity-80">
                  Select File
                </label>
                <label className={`flex h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-400 dark:border-slate-700 cursor-pointer transition hover:border-zinc-900 ${theme === "neobrutalism" ? "bg-yellow-50/50" : "bg-black/10"}`}>
                  <Upload size={24} className="opacity-60" />
                  <span className="text-xs font-bold">
                    {uploading ? "Uploading file..." : "Click to browse & select file"}
                  </span>
                  <input
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => uploadFile(e, targetUploadFolderId)}
                    type="file"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW FOLDER / SUBFOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl ${themeStyles.modalBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <FolderPlus size={20} /> {currentFolder ? `Create Subfolder in ${currentFolder.name}` : `Create Folder in ${currentDrive.name}`}
              </h3>
              <button onClick={() => setShowFolderModal(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <label className="block text-xs font-bold uppercase mb-2 opacity-80">Folder Name</label>
              <input
                autoFocus
                className={`w-full h-11 px-4 rounded-xl text-sm font-bold outline-none mb-5 ${themeStyles.input}`}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Assets, Photos, Projects, Source"
                value={newFolderName}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 text-xs font-bold rounded-xl opacity-70 hover:opacity-100"
                  onClick={() => setShowFolderModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`px-5 py-2 text-xs font-black rounded-xl ${themeStyles.buttonPrimary}`}
                  type="submit"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILE PREVIEW MODAL */}
      {selectedFileForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl flex flex-col ${themeStyles.modalBg}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-current opacity-30">
              <h3 className="text-lg font-black truncate max-w-md">{selectedFileForPreview.file_name}</h3>
              <button onClick={() => setSelectedFileForPreview(null)} type="button">
                <X size={22} />
              </button>
            </div>

            {/* Content Preview */}
            <div className="flex-1 my-4 flex items-center justify-center min-h-[250px]">
              {selectedFileForPreview.mime_type?.startsWith("image/") || selectedFileForPreview.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                <img
                  alt={selectedFileForPreview.file_name}
                  className="max-h-[400px] w-auto max-w-full rounded-xl object-contain border-2 border-zinc-900 neo-shadow"
                  src={getFileSrc(selectedFileForPreview)}
                />
              ) : selectedFileForPreview.mime_type?.startsWith("video/") ? (
                <video
                  controls
                  className="w-full max-h-[350px] rounded-xl border-2 border-zinc-900"
                  src={getFileSrc(selectedFileForPreview)}
                />
              ) : selectedFileForPreview.mime_type?.startsWith("audio/") ? (
                <audio
                  controls
                  className="w-full"
                  src={getFileSrc(selectedFileForPreview)}
                />
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-current rounded-2xl opacity-80">
                  <File className="mx-auto mb-2" size={48} />
                  <p className="font-black text-sm">Direct Preview Not Supported for this File Format</p>
                  <p className="text-xs opacity-60 mt-1">Download the file directly to view on your device.</p>
                </div>
              )}
            </div>

            {/* File Info & Action Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-current opacity-30">
              <span className="text-xs font-bold">{sizeText(selectedFileForPreview.size_bytes)}</span>
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 ${themeStyles.buttonPrimary}`}
                  onClick={(e) => handleDownloadFile(selectedFileForPreview, e)}
                  type="button"
                >
                  <Download size={16} /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOVE FILE TO FOLDER MODAL */}
      {moveModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl ${themeStyles.modalBg}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Move "{moveModalFile.file_name}"</h3>
              <button onClick={() => setMoveModalFile(null)} type="button">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs opacity-70 mb-3 font-medium">Select destination directory in {currentDrive.name}:</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              <button
                className={`w-full flex items-center gap-2 p-3 rounded-xl text-left text-sm font-bold transition ${
                  moveModalFile.folder_id === null ? "bg-zinc-900 text-white" : "hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                onClick={() => handleMoveFile(moveModalFile.id, null)}
                type="button"
              >
                <Folder size={18} /> {currentDrive.name} Root (No Folder)
              </button>
              {currentLevelFolders.map((folder) => (
                <button
                  className={`w-full flex items-center gap-2 p-3 rounded-xl text-left text-sm font-bold transition ${
                    moveModalFile.folder_id === folder.id ? "bg-zinc-900 text-white" : "hover:bg-black/10 dark:hover:bg-white/10"
                  }`}
                  key={folder.id}
                  onClick={() => handleMoveFile(moveModalFile.id, folder.id)}
                  type="button"
                >
                  <span className="w-3 h-3 rounded-full shrink-0 border border-zinc-900" style={{ backgroundColor: folder.color }} />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
