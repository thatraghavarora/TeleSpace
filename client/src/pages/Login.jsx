import { Bot, CheckCircle, HelpCircle, Key, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

const USERNAME_PATTERN = /^@[a-zA-Z0-9_]{5,32}$/;

export default function Login() {
  const [username, setUsername] = useState("@");
  const [botToken, setBotToken] = useState("");
  const [showBotHelp, setShowBotHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitingVerify, setWaitingVerify] = useState(false);
  const [pendingUsername, setPendingUsernameLocal] = useState("");
  const setPending = useAuthStore((state) => state.setPending);
  const updateBotCredentials = useAuthStore((state) => state.updateBotCredentials);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    const normalized = username.trim().replace(/\s+/g, "").toLowerCase();

    if (!USERNAME_PATTERN.test(normalized)) {
      toast.error("Use a valid @username with 5-32 letters, numbers, or underscores.");
      return;
    }

    setLoading(true);

    try {
      let validatedBotUsername = "";

      // Validate custom Bot Token if provided
      if (botToken.trim()) {
        const botRes = await api.post("/auth/validate-bot", { botToken: botToken.trim() });
        if (!botRes.data?.success) {
          toast.error("Invalid Bot Token. Please check your token from @BotFather.");
          setLoading(false);
          return;
        }
        validatedBotUsername = botRes.data.bot.username;
        toast.success(`Connected to ${botRes.data.bot.first_name} (${validatedBotUsername})!`);
      }

      await api.post("/auth/request", { username: normalized });

      setPending({ username: normalized, expires_at: null });
      setPendingUsernameLocal(normalized);

      if (botToken.trim()) {
        updateBotCredentials({
          botToken: botToken.trim(),
          botUsername: validatedBotUsername || null
        });
      }

      setWaitingVerify(true);
      toast.success("Now open Telegram → press /start on @FreeAuth_Bot to verify!");

      // Poll /auth/status until verified (max 5 min)
      let attempts = 0;
      const maxAttempts = 60; // 60 × 5s = 5 minutes
      const interval = setInterval(async () => {
        attempts++;
        try {
          const { data } = await api.get(`/auth/status/${normalized.replace("@", "")}`);
          if (data?.verified && data?.token) {
            clearInterval(interval);
            setSession({ token: data.token, user: data.user });
            toast.success("✅ Verified! Welcome to TeleSpace!");
            navigate("/dashboard");
          }
        } catch {
          // keep polling
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setWaitingVerify(false);
          toast.error("Verification timed out. Please try again.");
        }
      }, 5000);

    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start verification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-400">
            <Send size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TeleSpace Cloud Sign In</h1>
            <p className="text-xs text-slate-400">Connect your Telegram & Bot Storage</p>
          </div>
        </div>
        <Link to="/" className="text-xs font-semibold text-sky-400 hover:underline">
          Home Page
        </Link>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        {/* Telegram Username */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Telegram Username
          </span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 pl-11 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@raghav_arora"
              autoComplete="username"
              required
            />
            <Send size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
          </div>
        </label>

        {/* Custom Bot Token */}
        <label className="block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Bot size={14} className="text-sky-400" />
              Your Telegram Bot Token
            </span>
            <button
              type="button"
              onClick={() => setShowBotHelp(!showBotHelp)}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
            >
              <HelpCircle size={13} />
              <span>Where to get token?</span>
            </button>
          </div>

          <div className="relative">
            <input
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 pl-11 text-xs font-mono text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ (Optional)"
            />
            <Key size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
          </div>
        </label>

        {/* Bot Token Helper Card */}
        {showBotHelp && (
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-bold text-sky-300">
              <Sparkles size={14} />
              How to get your own Bot Token:
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-slate-400">
              <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
              <li>Send message <code className="text-sky-300">/newbot</code> and set a name for your bot.</li>
              <li>Copy the HTTP API Token provided by BotFather and paste it above.</li>
            </ol>
          </div>
        )}

        <div className="pt-2">
          {waitingVerify ? (
            <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-5 text-center">
              <div className="mb-3 flex items-center justify-center gap-2 text-sky-300">
                <Loader2 size={20} className="animate-spin" />
                <span className="font-bold">Waiting for Telegram Verification...</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                Open Telegram, search <strong className="text-sky-300">@FreeAuth_Bot</strong> and press <code className="rounded bg-slate-800 px-1 py-0.5 text-sky-300">/start</code>
              </p>
              <p className="text-xs text-slate-500">
                Verifying <strong className="text-white">{pendingUsername}</strong>
              </p>
            </div>
          ) : (
            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 font-bold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>Connect &amp; Launch Storage</span>
            </button>
          )}
        </div>
      </form>
    </AuthCard>
  );
}
