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

import { Marquee } from "../../components/ui/marquee";

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
    <div className="min-h-screen text-slate-50 relative selection:bg-emerald-500/30 flex flex-col">
      <SWRegister />
      
      {/* Background layer */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-slate-950 to-slate-950"></div>

      {/* Top sticky marquee (Both Mobile and Desktop) */}
      {mounted && (campaigns.length > 0 || nisab) && (
        <div className="bg-emerald-500/10 backdrop-blur-md border-b border-emerald-500/20 py-1.5 overflow-hidden sticky top-0 z-[60]">
          <Marquee speed="normal">
            {nisab && (
              <div className="flex items-center">
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 font-sans">
                  <span className="mr-3 opacity-50">🪙</span>
                  Gold Nisab (85g): ₦{nisab.gold_nisab.toLocaleString()}
                </span>
                <span className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 font-sans">
                  <span className="mr-3 opacity-50">⚪</span>
                  Silver Nisab (595g): ₦{nisab.silver_nisab.toLocaleString()}
                </span>
                <span className="mx-4 opacity-20 text-emerald-500">◆</span>
              </div>
            )}
            {campaigns.map((c, i) => (
              <span key={`c1-${i}`} className="flex items-center mx-8 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 font-sans">
                <span className="mr-3 opacity-50">🔥</span>
                {c.name}
                <span className="mx-3 opacity-30">|</span>
                <span className="text-slate-400 lowercase">{c.category} active now</span>
              </span>
            ))}
          </Marquee>
        </div>
      )}

      <div className="mx-auto flex flex-1 w-full max-w-[1400px] px-0 md:px-6 md:py-6 relative z-0">
        {/* Desktop Sidebar (Hidden on Mobile) */}
        {sidebarOpen && (
          <aside className="hidden md:flex w-64 lg:w-72 flex-col justify-between rounded-3xl border border-slate-800/50 bg-slate-950/40 backdrop-blur-2xl px-6 py-6 shadow-[4px_0_24px_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-500/15 transition-colors duration-700"></div>
            
            <div className="space-y-6">
              <Link href={auth.signedIn ? "/dashboard" : "/"} className="flex items-center gap-3 group/brand">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/5 flex items-center justify-center border border-emerald-400/20 shadow-[inset_0_1px_rgba(255,255,255,0.1)] group-hover/brand:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300">
                  <IconHands className="h-7 w-7 text-emerald-400 group-hover/brand:scale-110 transition-transform duration-300" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-0.5">Ishrapay</p>
                  <p className="text-sm font-semibold text-slate-200">Donation Platform</p>
                </div>
              </Link>
              
              <nav className="space-y-1.5 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">Overview</p>
                {[{href: auth.signedIn ? "/dashboard" : "/", icon: "📊", label: auth.signedIn ? "Dashboard" : "Home"}, {href: "/dashboard", icon: "💰", label: "Money Box"}].map((link, idx) => (
                  <Link key={idx} href={link.href} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-[inset_0_1px_rgba(255,255,255,0.05)] transition-all active-scale group/link">
                    <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}
              </nav>

              <nav className="space-y-1.5 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">Initiatives</p>
                {[
                  {href: "/sections/ishrakaat", icon: "🤲", label: "Ishrapay Core", color: "hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20"},
                  {href: "/zakah", icon: "⚖️", label: "Zakah & Sadaqah", color: "hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/20"},
                  {href: "/sections/waqf", icon: "🏛️", label: "Waqf Trust", color: "hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20"},
                  {href: "/sections/tabararaat", icon: "✨", label: "Tabararaat", color: "hover:text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/20"},
                  {href: "/sections/aqsah", icon: "🚨", label: "Aqsah Emerging", color: "hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20"},
                  {href: "/sections/welfare", icon: "❤️", label: "Welfare Support", color: "hover:text-lime-400 hover:bg-lime-500/10 hover:border-lime-500/20"},
                ].map((link, idx) => (
                  <Link key={idx} href={link.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-300 border border-transparent transition-all active-scale group/link ${link.color}`}>
                    <span className="text-lg opacity-70 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}
              </nav>

              {auth.signedIn && (
                <nav className="space-y-1.5 text-sm pt-4 border-t border-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mb-2 pl-2">System</p>
                  {[
                    {href: "/admin", icon: "🛡️", label: "Admin Panel"},
                    {href: "/admin/waqf", icon: "🏛️", label: "Waqf Tracking"},
                    {href: "/admin/welfare", icon: "❤️", label: "Welfare Tracking"},
                    {href: "/admin/chat", icon: "💬", label: "Admin Chat"},
                  ].map((link, idx) => (
                    <Link key={idx} href={link.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors group/link ${isActive(link.href) ? 'text-white bg-slate-800/40 border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white'}`}>
                      <span className="text-lg opacity-50 group-hover/link:opacity-100 transition-opacity">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <div className="pt-6 border-t border-slate-800/50 space-y-2 text-xs text-slate-500 text-center">
              <p className="font-medium">Ishrapay Foundation</p>
              <p className="text-[10px] uppercase tracking-wider">v2.0 • Native UX</p>
            </div>
          </aside>
        )}

        {/* Unified Main Content Area */}
        <div className="flex-1 flex flex-col md:rounded-3xl border-slate-800/50 md:border bg-slate-950/40 md:backdrop-blur-3xl overflow-hidden md:ml-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative min-w-0">
          
          {/* Top Header (Mobile & Desktop) */}
          <header className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-4 md:px-6 py-3 md:py-4 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setSidebarOpen((open) => !open)} 
                className="hidden md:flex w-10 h-10 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-300 items-center justify-center transition-all active-scale"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div className="md:hidden flex items-center gap-2 bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20">
                 <IconHands className="h-5 w-5 text-emerald-400" />
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Ishrapay</h1>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {!isAuthPage && (
                auth.signedIn ? (
                  <div className="flex items-center gap-2 md:gap-3">
                    <Link href="/dashboard" className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center hover:bg-slate-700 active-scale text-xs md:text-base">🔔</Link>
                    <button onClick={handleSignOut} className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-sm font-semibold text-rose-300 hover:bg-rose-500/20 active-scale">Sign out</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 md:gap-2 p-0.5 md:p-1 bg-slate-900/50 rounded-full border border-slate-800">
                    <Link href="/auth/login" className="rounded-full px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all">Sign in</Link>
                    <Link href="/auth/register" className="hidden xs:block rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-4 md:px-5 py-1.5 md:py-2 text-[10px] md:text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-all">Join</Link>
                  </div>
                )
              )}
            </div>
          </header>

          {/* Actual Page Content (Responsive Padding) */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 md:px-6 py-6 scroll-smooth pb-[100px] md:pb-6">
            <div className="max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Navigation (Hidden on Desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
          <div className="mx-4 mb-4 rounded-3xl glass-panel border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex justify-evenly relative items-center py-2.5 px-2">
              {mobileNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.key} href={item.href} className="relative flex w-16 flex-col items-center gap-1 py-1 text-xs transition-all duration-300 touch-target active:scale-90">
                    <span className={`text-xl transition-all duration-300 ${active ? '-translate-y-1 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'translate-y-0 opacity-60'}`}>{item.icon}</span>
                    <span className={`text-[10px] font-semibold transition-all duration-300 ${active ? 'opacity-100 text-emerald-400' : 'opacity-0 translate-y-2'}`}>{item.label}</span>
                    {active && <div className="nav-indicator absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]"></div>}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

      </div>
    </div>
  );
}
