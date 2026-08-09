import { Send } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

const USERNAME_PATTERN = /^@[a-zA-Z0-9_]{5,32}$/;

export default function Login() {
  const [username, setUsername] = useState("@");
  const [loading, setLoading] = useState(false);
  const setPending = useAuthStore((state) => state.setPending);
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
      const { data } = await api.post("/auth/request", { username: normalized });
      setPending({
        username: data.username,
        expires_at: data.expires_at
      });
      toast.success("Open the bot and press Start.");
      navigate("/verify");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start verification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-8 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-400/15 text-app-accent">
          <Send size={30} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Telegram Sign In</h1>
          <p className="mt-1 text-sm text-slate-400">Verify your username through the bot.</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Telegram username</span>
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-4 focus:ring-sky-400/10"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@raghav_arora"
            autoComplete="username"
          />
        </label>

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-app-primary font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? <span className="spinner" /> : <Send size={18} />}
          Continue
        </button>
      </form>
    </AuthCard>
  );
}
