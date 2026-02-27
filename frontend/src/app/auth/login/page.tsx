 "use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/auth/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        let message = "Invalid credentials or account not yet approved.";
        try {
          const data = await response.json();
          if (typeof data.detail === "string" && data.detail.trim()) {
            message = data.detail;
          } else if (
            Array.isArray(data.non_field_errors) &&
            data.non_field_errors.length > 0
          ) {
            message = String(data.non_field_errors[0]);
          }
        } catch {
        }
        setError(message);
        return;
      }

      const data = await response.json();
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      window.location.href = "/dashboard";
    } catch {
      setError("Could not reach Ishrakaat backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-4 pb-6 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
            Ishrakaat
          </p>
          <p className="text-base font-semibold text-slate-50">
            Sign in to continue
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-200"
        >
          Home
        </Link>
      </header>

      <main className="flex-1">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
        >
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Username</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Password</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="pt-2 text-sm text-slate-400">
            New here?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-emerald-300"
            >
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
