import { ExternalLink, Loader2, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

export default function Verify() {
  const pending = useAuthStore((state) => state.pending);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const botUrl = useMemo(() => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "YourAuthBot";
    return `https://t.me/${botName}`;
  }, []);

  useEffect(() => {
    if (!pending?.username) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/auth/status/${encodeURIComponent(pending.username)}`);

        if (data.verified && data.token) {
          setSession({ token: data.token, user: data.user });
          toast.success("Signed in.");
          navigate("/dashboard", { replace: true });
        }
      } catch {
        setChecking(false);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [navigate, pending?.username, setSession]);

  if (!pending) {
    return <Navigate to="/login" replace />;
  }

  async function openBot() {
    window.open(botUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <AuthCard>
      <div className="mb-6 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-400/15 text-app-accent">
          <Send size={30} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Check Telegram</h1>
          <p className="mt-1 text-sm text-slate-400">Confirm {pending.username} with the bot.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-center">
        <p className="text-sm text-slate-400">No code is required</p>
        <p className="mt-2 text-lg font-semibold text-white">Open the bot and press Start.</p>
        <p className="mt-3 text-sm text-slate-400">Your Telegram username must match {pending.username}.</p>
      </div>

      <div className="mt-5 grid place-items-center rounded-2xl border border-slate-700 bg-white p-4">
        <QRCodeSVG value={botUrl} size={168} />
      </div>

      <div className="mt-5">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-app-primary font-semibold text-white transition hover:bg-blue-500"
          onClick={openBot}
          type="button"
        >
          <ExternalLink size={18} />
          Open Bot & Start
        </button>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className={checking ? "animate-spin" : ""} size={16} />
        Waiting for verification
      </div>
    </AuthCard>
  );
}
