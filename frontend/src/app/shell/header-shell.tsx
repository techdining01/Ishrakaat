 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { SWRegister } from "../sw-register";
import { IconHands } from "./icon-hands";
import { apiGet } from "@/lib/api";

interface Campaign {
  id: number;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
}

interface NisabData {
  gold_nisab: number;
  silver_nisab: number;
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  last_updated: string;
}

interface MobileNavItem {
  key: string;
  href: string;
  icon: string;
  label: string;
}

const mobileNavItems: MobileNavItem[] = [
  { key: "home", label: "Home", href: "/", icon: "🏠" },
  { key: "dashboard", label: "Money Box", href: "/dashboard", icon: "💰" },
  { key: "zakah", label: "Zakah", href: "/zakah", icon: "💝" },
  { key: "campaigns", label: "Campaigns", href: "/sections/ishrakaat", icon: "🎯" },
  { key: "profile", label: "Profile", href: "/dashboard", icon: "👤" },
];

function isActive(href: string): boolean {
  const pathname = usePathname();
  return pathname === href;
}

export function HeaderShell({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ signedIn: boolean }>({ signedIn: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [nisab, setNisab] = useState<NisabData | null>(null);
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth/") ?? false;

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const access = window.localStorage.getItem("access");
    setAuth({ signedIn: !!access });

    // Load active campaigns and nisab data for marquee
    async function loadMarqueeData() {
      try {
        const [cData, nData] = await Promise.all([
          apiGet("/donations/campaigns/"),
          apiGet("/zakah/nisab/data/")
        ]);
        
        if (Array.isArray(cData)) {
          setCampaigns(cData.filter(c => c.is_active));
        }
        if (nData && !nData.error) {
          setNisab(nData);
        }
      } catch (err) {
        console.error("Marquee load failed:", err);
      }
    }
    loadMarqueeData();
  }, []);

  function handleSignOut() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("access");
    window.localStorage.removeItem("refresh");
    setAuth({ signedIn: false });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen text-slate-50 relative selection:bg-emerald-500/30">
      <SWRegister />
      
      {/* Background layer for Mobile safe areas & native feel */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950"></div>

      {mounted && (campaigns.length > 0 || nisab) && (
        <div className="bg-emerald-500/10 backdrop-blur-md border-b border-emerald-500/20 py-1.5 overflow-hidden sticky top-0 md:relative z-[60]">
          <div className="flex whitespace-nowrap animate-marquee">
            {/* Nisab Info */}
            {nisab && (
              <div className="flex items-center">
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  <span className="mr-3 opacity-50">🪙</span>
                  Gold Nisab (85g): ₦{nisab.gold_nisab.toLocaleString()}
                </span>
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  <span className="mr-3 opacity-50">⚪</span>
                  Silver Nisab (595g): ₦{nisab.silver_nisab.toLocaleString()}
                </span>
                <span className="mx-4 opacity-20 text-emerald-500">◆</span>
              </div>
            )}
            
            {/* Campaigns */}
            {campaigns.map((c, i) => (
              <span key={`c1-${i}`} className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                <span className="mr-3 opacity-50">🔥</span>
                {c.name}
                <span className="mx-3 opacity-30">|</span>
                <span className="text-slate-400 lowercase">{c.category} active now</span>
              </span>
            ))}

            {/* Repeat for seamless loop */}
            {nisab && (
              <div className="flex items-center">
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  <span className="mr-3 opacity-50">🪙</span>
                  Gold Nisab: ₦{nisab.gold_nisab.toLocaleString()}
                </span>
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  <span className="mr-3 opacity-50">⚪</span>
                  Silver Nisab: ₦{nisab.silver_nisab.toLocaleString()}
                </span>
                <span className="mx-4 opacity-20 text-emerald-500">◆</span>
              </div>
            )}
            {campaigns.map((c, i) => (
              <span key={`c2-${i}`} className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                <span className="mr-3 opacity-50">🔥</span>
                {c.name}
                <span className="mx-3 opacity-30">|</span>
                <span className="text-slate-400 lowercase">{c.category} active now</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] px-0 md:px-6 md:py-6 relative z-0">
        {/* Desktop Sidebar */}
        {sidebarOpen && (
          <aside className="hidden w-64 lg:w-72 flex-col justify-between rounded-3xl border border-slate-800/50 bg-slate-950/40 backdrop-blur-2xl px-6 py-6 md:flex shadow-[4px_0_24px_rgba(0,0,0,0.2)] relative overflow-hidden group">
          {/* Subtle glow effect behind sidebar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/15 transition-colors duration-700"></div>
          
          <div className="space-y-6">
            <Link href={auth.signedIn ? "/dashboard" : "/"} className="flex items-center gap-3 group/brand">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/5 flex items-center justify-center border border-emerald-400/20 shadow-[inset_0_1px_rgba(255,255,255,0.1)] group-hover/brand:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300">
                <IconHands className="h-7 w-7 text-emerald-400 group-hover/brand:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-0.5">
                  Ishrapay
                </p>
                <p className="text-sm font-semibold text-slate-200">
                  Donation Platform
                </p>
              </div>
            </Link>
            
            <nav className="space-y-1.5 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">
                Overview
              </p>
              <Link
                href={auth.signedIn ? "/dashboard" : "/"}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">📊</span>
                <span className="font-medium">{auth.signedIn ? "Dashboard" : "Home"}</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">💰</span>
                <span className="font-medium">Money Box</span>
              </Link>
              <Link
                href="/zakah"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">🤲</span>
                <span className="font-medium">Zakah & Sadaqah</span>
              </Link>
              <Link
                href="/sections/welfare"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">❤️</span>
                <span className="font-medium">Welfare</span>
              </Link>
            </nav>
            
            <nav className="space-y-1.5 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">
                Initiatives
              </p>
              <Link
                href="/sections/ishrakaat"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">🎯</span>
                <span className="font-medium">Campaigns</span>
              </Link>
              <Link
                href="/sections/aqsah"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-sky-400 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/20 transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">🚨</span>
                <span className="font-medium">Aqsah Emerging</span>
              </Link>
              <Link
                href="/sections/waqf"
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all active-scale group/link"
              >
                <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">🏛️</span>
                <span className="font-medium">Waqf Trust</span>
              </Link>
            </nav>
            
            {auth.signedIn && (
              <nav className="space-y-1.5 text-sm pt-4 border-t border-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">
                  System
                </p>
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors group/link ${isActive('/admin') ? 'text-white bg-slate-800/40 border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                  <span className="text-lg opacity-50 group-hover/link:opacity-100 transition-opacity">🛡️</span>
                  <span>Admin Panel</span>
                </Link>
                <Link
                  href="/admin/chat"
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors group/link ${isActive('/admin/chat') ? 'text-white bg-slate-800/40 border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                  <span className="text-lg opacity-50 group-hover/link:opacity-100 transition-opacity">💬</span>
                  <span>Admin Chat</span>
                </Link>
              </nav>
            )}
          </div>
          <div className="pt-6 border-t border-slate-800/50 space-y-2 text-xs text-slate-500 text-center">
            <p className="font-medium">Ishrapay Foundation</p>
            <p className="text-[10px] uppercase tracking-wider">v2.0 • Native UX</p>
          </div>
        </aside>
        )}

        {/* Mobile Content */}
        <div className="flex-1 flex flex-col md:hidden relative bg-slate-950">
          <div className="flex-1 pb-[90px] w-full pt-safe">
            {children}
          </div>
          
          {/* iOS Native Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
            <div className="mx-4 mb-4 rounded-3xl glass-panel border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="flex justify-evenly relative items-center py-2.5 px-2">
                {mobileNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="relative flex w-16 flex-col items-center gap-1 py-1 text-xs transition-all duration-300 touch-target active:scale-90"
                    >
                      <span className={`text-xl transition-all duration-300 ${active ? '-translate-y-1 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'translate-y-0 opacity-60'}`}>
                        {item.icon}
                      </span>
                      <span className={`text-[10px] font-semibold transition-all duration-300 ${active ? 'opacity-100 text-emerald-400' : 'opacity-0 translate-y-2'}`}>
                        {item.label}
                      </span>
                      {active && (
                        <div className="nav-indicator absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Desktop Content */}
        <div className="hidden flex-1 flex flex-col rounded-3xl border border-slate-800/50 bg-slate-950/40 backdrop-blur-3xl overflow-hidden md:flex ml-0 md:ml-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
          <header className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                className="flex items-center justify-center w-10 h-10 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-300 transition-all active-scale"
                aria-label="Toggle Sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Dashboard Area</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              {!isAuthPage && !auth.signedIn && (
                <div className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-full border border-slate-800">
                  <Link
                    href="/auth/login"
                    className="rounded-full px-5 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all active-scale"
                  >
                    Create Account
                  </Link>
                </div>
              )}
              
              {!isAuthPage && auth.signedIn && (
                <div className="flex items-center gap-3">
                  <Link href="/dashboard" className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors active-scale">
                    <span className="text-lg">🔔</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all active-scale"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-6 scroll-smooth">
            <div className="max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
