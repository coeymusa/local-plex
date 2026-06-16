"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TopActions({
  tmdbEnabled,
  authEnabled,
}: {
  tmdbEnabled: boolean;
  authEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Matched ${data.matched} of ${data.missing} new titles.`);
        router.refresh();
      } else {
        setMsg(data.error ?? "Refresh failed.");
      }
    } catch {
      setMsg("Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-white/50">{msg}</span>}
      {tmdbEnabled && (
        <button
          onClick={refresh}
          disabled={busy}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:border-accent/50 disabled:opacity-50"
        >
          {busy ? "Matching…" : "↻ Match metadata"}
        </button>
      )}
      {authEnabled && (
        <button
          onClick={logout}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 hover:border-white/30"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
