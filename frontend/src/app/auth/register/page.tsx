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
            Create your account
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">First name</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Last name</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Username</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Email</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Password</label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="pt-2 text-sm text-slate-400">
            Already registered?{" "}
            <Link href="/auth/login" className="font-semibold text-emerald-300">
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
