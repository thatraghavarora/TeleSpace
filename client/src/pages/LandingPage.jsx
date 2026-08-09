import { ArrowRight, Bot, HardDrive, ShieldCheck, Sparkles, UploadCloud, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 font-bold text-white shadow-lg shadow-sky-500/20">
              <HardDrive size={22} />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Tele<span className="text-sky-400">Space</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:shadow-sky-500/40 hover:brightness-110 active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
        <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
        
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-400 backdrop-blur-md">
            <Sparkles size={14} />
            <span>Powered by Your Personal Telegram Bot & Cloud</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-tight">
            Unlimited Cloud Storage <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              On Your Personal Telegram Bot
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Store, manage, and stream unlimited files through your custom Telegram Bot Token. 
            Enjoy zero storage limits, high-speed Telegram CDN, and multi-folder drive management.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 font-bold text-white shadow-xl shadow-sky-500/30 transition hover:scale-[1.02] hover:shadow-sky-500/50 sm:w-auto"
            >
              <UploadCloud size={20} />
              <span>Connect Your Bot Now</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Why Choose TeleSpace?</h2>
          <p className="mt-3 text-slate-400">Everything you need for unlimited personal cloud hosting.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl transition hover:border-sky-500/50 hover:bg-slate-900/90">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-sky-500/10 text-sky-400 transition group-hover:scale-110">
              <Bot size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">Bring Your Own Bot Token</h3>
            <p className="mt-3 text-sm text-slate-400">
              Connect your personal bot token from <code className="text-sky-400">@BotFather</code>. All your files remain 100% private in your personal Telegram Cloud channel.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl transition hover:border-sky-500/50 hover:bg-slate-900/90">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-400 transition group-hover:scale-110">
              <HardDrive size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">Drives & Folder Hierarchy</h3>
            <p className="mt-3 text-sm text-slate-400">
              Organize files into Main Drive, Personal Storage, and nested subfolders with drag-and-drop overlay and instant search.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl transition hover:border-sky-500/50 hover:bg-slate-900/90">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 transition group-hover:scale-110">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-white">Auto Path Captioning</h3>
            <p className="mt-3 text-sm text-slate-400">
              Send files directly to your bot with captions like <code className="text-emerald-400">Project &gt; File.pdf</code> to auto-organize folders.
            </p>
          </div>
        </div>
      </section>

      {/* Bot Token Setup Guide */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl sm:p-12">
          <div className="flex items-center gap-3 text-sky-400">
            <ShieldCheck size={24} />
            <span className="font-semibold uppercase tracking-wider text-xs">How It Works</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Quick 3-Step Setup with @BotFather</h2>
          
          <div className="mt-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 font-bold text-slate-950">1</div>
              <div>
                <h4 className="font-semibold text-white">Create a Bot on Telegram</h4>
                <p className="mt-1 text-sm text-slate-400">Open Telegram and search for <strong className="text-sky-300">@BotFather</strong>. Send <code className="text-sky-400">/newbot</code> and give it a name.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 font-bold text-slate-950">2</div>
              <div>
                <h4 className="font-semibold text-white">Copy API Bot Token</h4>
                <p className="mt-1 text-sm text-slate-400">BotFather will give you a HTTP API Token (e.g. <code className="text-sky-400">123456:ABC-DEF...</code>). Copy it.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 font-bold text-slate-950">3</div>
              <div>
                <h4 className="font-semibold text-white">Paste Token on TeleSpace Sign In</h4>
                <p className="mt-1 text-sm text-slate-400">Enter your Telegram @username and paste your Bot Token on the sign in page. Your personal cloud is ready!</p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              <span>Connect Bot & Start Storing</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>TeleSpace • Unlimited Cloud File Manager powered by Telegram Bot Storage</p>
      </footer>
    </div>
  );
}
