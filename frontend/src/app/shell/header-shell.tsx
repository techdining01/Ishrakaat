 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export function HeaderShell({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ signedIn: boolean }>({ signedIn: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth/") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const access = window.localStorage.getItem("access");
    setAuth({ signedIn: !!access });
  }, []);

  function handleSignOut() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("access");
    window.localStorage.removeItem("refresh");
    setAuth({ signedIn: false });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl px-3 py-3 md:px-6 md:py-6">
        {sidebarOpen && (
          <aside className="hidden w-60 flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-4 md:flex">
          <div className="space-y-5">
            <Link href={auth.signedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-400/40">
                <span className="text-xl font-semibold text-emerald-300">
                  ش
                </span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">
                  Ishrakaat
                </p>
                <p className="text-base font-semibold text-slate-50">
                  Donation & Zakah
                </p>
              </div>
            </Link>
            <nav className="space-y-1 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Main
              </p>
              <Link
                href={auth.signedIn ? "/dashboard" : "/"}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-emerald-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>{auth.signedIn ? "Dashboard" : "Home"}</span>
                <span className="text-xs text-slate-500">
                  {auth.signedIn ? "Money Box" : "Overview"}
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-emerald-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>My dashboard</span>
                <span className="text-xs text-slate-500">
                  Money Box
                </span>
              </Link>
              <Link
                href="/zakah"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-emerald-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>Zakah & sadaqah</span>
                <span className="text-xs text-slate-500">
                  Calculator
                </span>
              </Link>
              <Link
                href="/sections/welfare"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-emerald-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>Welfare</span>
                <span className="text-xs text-slate-500">
                  Orphans & widows
                </span>
              </Link>
            </nav>
            <nav className="space-y-1 text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Admin
              </p>
              <Link
                href="/admin"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-sky-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>Manage users</span>
                <span className="text-xs text-slate-500">
                  Approve & roles
                </span>
              </Link>
              <Link
                href="/admin/chat"
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-100 hover:border-sky-500/60 hover:bg-slate-900/80 active:scale-[0.98]"
              >
                <span>Admin chat</span>
                <span className="text-xs text-slate-500">
                  Messages
                </span>
              </Link>
            </nav>
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            <p>Ishrakaat • enterprise view</p>
            <p>Zakah • sadaqah • waqf • welfare</p>
          </div>
        </aside>
        )}

        <div className="flex-1 flex flex-col rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-900 px-3 py-2.5 md:px-4 md:py-3.5">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-400/40">
                <span className="text-base font-semibold text-emerald-300">
                  ش
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Ishrakaat
                </p>
                <p className="text-base font-semibold text-slate-50">
                  Donation app
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-100 active:scale-[0.97]"
              >
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              </button>
              <span className="hidden md:inline-block">
                Donation & Zakah platform
              </span>
            </div>
            {!isAuthPage && (
              <div className="flex items-center gap-2 text-sm">
                {!auth.signedIn ? (
                  <>
                    <Link
                      href="/auth/login"
                      className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-100 active:scale-[0.97]"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/auth/register"
                      className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 active:scale-[0.97]"
                    >
                      Join
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      className="hidden xs:inline-flex rounded-full border border-sky-500 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-slate-900 active:scale-[0.97]"
                    >
                      Manage users
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="rounded-full border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:bg-slate-900 active:scale-[0.97]"
                    >
                      Sign out
                    </button>
                  </>
                )}
              </div>
            )}
          </header>

          <main className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
