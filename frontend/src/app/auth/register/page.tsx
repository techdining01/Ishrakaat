 "use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterPayload>({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField<K extends keyof RegisterPayload>(
    key: K,
    value: RegisterPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        setError("Could not create account. Check details and try again.");
        return;
      }

      setSuccess(
        "Account created. Wait for admin approval before signing in."
      );
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
        <header className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-3 w-12 h-12 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors">
            <span className="text-xl">🏠</span>
          </Link>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200 tracking-tight mb-2">
            Create Account
          </h1>
          <p className="text-slate-400 text-sm">Join Ishrapay today</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl glass-panel p-6 md:p-8"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 ml-1">First name</label>
              <input
                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
                value={form.first_name}
                placeholder="First"
                onChange={(e) => updateField("first_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 ml-1">Last name</label>
              <input
                className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
                value={form.last_name}
                placeholder="Last"
                onChange={(e) => updateField("last_name", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 ml-1">Username</label>
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
              value={form.username}
              placeholder="Choose a username"
              onChange={(e) => updateField("username", e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 ml-1">Email</label>
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
              type="email"
              value={form.email}
              placeholder="your@email.com"
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 ml-1">Password</label>
            <input
              className="w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-50 outline-none focus:border-emerald-500 focus:bg-slate-900/80 transition-all shadow-inner"
              type="password"
              value={form.password}
              placeholder="••••••••"
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 text-center animate-in shake">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 text-center">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-base font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-60 transition-all mt-4"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <p className="text-center pt-2 text-sm text-slate-400">
            Already registered?{" "}
            <Link href="/auth/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
