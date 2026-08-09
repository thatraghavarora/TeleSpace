# TeleSpace - Unlimited Telegram Cloud File Manager 🚀

TeleSpace is a Web Hosting & cPanel-inspired file manager powered by Telegram Cloud Storage. It allows users to store, organize, preview, and stream files securely using Telegram as an unlimited backend storage engine.

## ✨ Features
- **Telegram Native Storage**: Stream and host unlimited files using Telegram Bot API.
- **Drive & Folder Hierarchy**: Multi-Drive support (`Main Drive`, `Personal Storage`) with nested folders and subfolders.
- **NeoBrutalist & Modern Themes**: Cyberpunk, Dark Mode, NeoBrutalist, and Light Mode themes.
- **Auto Folder Detection**: Captions formatted as `Folder > File.ext` automatically map files to matching folders.
- **Full Drag & Drop Overlay**: Upload files anywhere on the interface.
- **Server Persistence Engine**: Cross-device, Incognito, and Mobile sync support.

## 🛠️ Setup & Running

### Prerequisites
- Node.js (v18+)
- Telegram Bot Token

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the root directory:
```env
PORT=4000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

### Build & Run
```bash
npm run build
npm start
```

For development:
```bash
npm run dev
```
