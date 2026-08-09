import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function Debug() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const response = await api.get("/debug/status");
      setData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not connect to the backend.");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-slate-100">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Authentication Debug</h1>
          <p className="mt-1 text-sm text-slate-400">No secret keys are shown on this page.</p>
        </div>
        <button className="rounded-xl bg-blue-600 px-4 py-2 font-medium" onClick={refresh} type="button">Refresh</button>
      </div>
      {error && <p className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-200">{error}</p>}
      {data && <pre className="overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 text-sm leading-6">{JSON.stringify(data, null, 2)}</pre>}
      <Link className="mt-6 inline-block text-sky-400 underline" to="/login">Back to login</Link>
    </main>
  );
}
