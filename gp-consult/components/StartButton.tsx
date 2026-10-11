"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POSTs to an endpoint that returns {id} and navigates to `${to}/${id}`. */
export function StartButton({ endpoint, to, body, label, busyLabel, className = "btn-primary" }: { endpoint: string; to: string; body?: object; label: string; busyLabel: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(j.error || "Failed to start");
    }
    router.push(`${to}/${j.id}`);
  };
  return (
    <div>
      <button className={className} disabled={busy} onClick={go}>{busy ? busyLabel : label}</button>
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
