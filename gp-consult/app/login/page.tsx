"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (!res.ok) return setError("Incorrect password");
    const next = new URLSearchParams(location.search).get("next") || "/";
    location.href = next.startsWith("/") ? next : "/";
  };
  return (
    <form onSubmit={submit} className="card mx-auto mt-24 max-w-sm space-y-4">
      <h1 className="text-xl font-bold">GP Consult</h1>
      <div>
        <label className="label" htmlFor="pw">Password</label>
        <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full">Enter</button>
    </form>
  );
}
