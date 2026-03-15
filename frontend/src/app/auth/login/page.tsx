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
      setError("Could not reach Ishrapay backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 p-4 md:p-8 justify-center items-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <header className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-4 w-12 h-12 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors">
            <span className="text-xl">🏠</span>
          </Link>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200 tracking-tight mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-sm">Sign in to your Ishrapay account</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl glass-panel p-6 md:p-8"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-base text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-base text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 text-center animate-in shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-60 transition-all mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center pt-4 text-sm text-slate-400">
            New here?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
