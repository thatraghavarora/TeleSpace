import { Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

const USERNAME_PATTERN = /^@[a-zA-Z0-9_]{5,32}$/;

export default function Login() {
  const [username, setUsername] = useState("@");
  const [loading, setLoading] = useState(false);
  const [waitingVerify, setWaitingVerify] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    const normalized = username.trim().replace(/\s+/g, "").toLowerCase();

    if (!USERNAME_PATTERN.test(normalized)) {
      toast.error("Use a valid @username (5-32 letters/numbers/underscores).");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/request", { username: normalized });
      setPendingUsername(normalized);
      setWaitingVerify(true);
      toast.success("Now open @FreeAuth_Bot on Telegram and press /start");

      // Poll /auth/status every 3s until verified (max 5 min)
      let attempts = 0;
      const maxAttempts = 100;
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
          // keep polling silently
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setWaitingVerify(false);
          setLoading(false);
          toast.error("Verification timed out. Please try again.");
        }
      }, 3000);

    } catch (error) {
      toast.error(error.response?.data?.message || "Could not connect. Try again.");
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
            <h1 className="text-xl font-bold text-white">TeleSpace Sign In</h1>
            <p className="text-xs text-slate-400">Telegram-powered Unlimited Cloud Storage</p>
          </div>
        </div>
        <Link to="/" className="text-xs font-semibold text-sky-400 hover:underline">
          Home
        </Link>
      </div>

      {!waitingVerify ? (
        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Your Telegram Username
            </span>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 pl-11 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@yourname"
                autoComplete="username"
                required
              />
              <Send size={18} className="absolute left-3.5 top-3.5 text-slate-500" />
            </div>
          </label>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-slate-400">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-sky-300">
              <Sparkles size={13} />
              How it works
            </div>
            <ol className="list-decimal space-y-0.5 pl-4">
              <li>Enter your Telegram username below</li>
              <li>Click Connect — then open Telegram</li>
              <li>Search <strong className="text-white">@FreeAuth_Bot</strong> → press <code className="text-sky-300">/start</code></li>
              <li>You'll be logged in automatically!</li>
            </ol>
          </div>

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 font-bold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            <span>Connect with Telegram</span>
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-6 text-center">
            <Loader2 size={32} className="mx-auto mb-3 animate-spin text-sky-400" />
            <p className="mb-1 font-bold text-white">Waiting for Telegram Verification</p>
            <p className="mb-4 text-xs text-slate-400">
              Verifying <strong className="text-sky-300">{pendingUsername}</strong>
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-xs text-slate-300">
              <p className="mb-1 font-semibold text-white">Steps:</p>
              <ol className="list-decimal space-y-1 pl-4 text-slate-400">
                <li>Open Telegram app</li>
                <li>Search <strong className="text-sky-300">@FreeAuth_Bot</strong></li>
                <li>Press <code className="rounded bg-slate-800 px-1 text-sky-300">/start</code> button</li>
              </ol>
            </div>
          </div>
          <button
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-2.5 text-sm text-slate-400 transition hover:bg-slate-700"
            onClick={() => { setWaitingVerify(false); setLoading(false); }}
          >
            Cancel — try different username
          </button>
        </div>
      )}
    </AuthCard>
  );
}
