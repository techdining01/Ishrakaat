"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { IconHands } from "./shell/icon-hands";
import { Marquee } from "@/components/ui/marquee";

const sections = [
  {
    key: "ishrakaat",
    label: "Ishrapay",
    href: "/sections/ishrakaat",
    accent: "bg-emerald-500/20 border-emerald-500/40",
    icon: "🤲",
    subtitle: "Core donation campaigns",
  },
  {
    key: "zakah-sadaqah",
    label: "Zakah & Sadaqah",
    href: "/zakah",
    accent: "bg-sky-500/15 border-sky-500/35",
    icon: "💝",
    subtitle: "Calculate & give zakah",
  },
  {
    key: "waqf",
    label: "Waqf",
    href: "/sections/waqf",
    accent: "bg-violet-500/15 border-violet-500/35",
    icon: "🏛️",
    subtitle: "Endowment projects",
  },
  {
    key: "tabararaat",
    label: "Tabararaat",
    href: "/sections/tabararaat",
    accent: "bg-amber-500/15 border-amber-500/35",
    icon: "🎁",
    subtitle: "Voluntary gifts",
  },
  {
    key: "aqsah",
    label: "Aqsah",
    href: "/sections/aqsah",
    accent: "bg-rose-500/15 border-rose-500/35",
    icon: "🕌",
    subtitle: "Al-Aqsa support",
  },
  {
    key: "welfare",
    label: "Welfare",
    href: "/sections/welfare",
    accent: "bg-lime-500/15 border-lime-500/35",
    icon: "❤️",
    subtitle: "Family support",
  },
];

interface HomeCampaign {
  id: number;
  name: string;
  category: string;
  description: string;
  target_amount: string | null;
  deadline: string | null;
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<HomeCampaign[]>([]);
  const [profile, setProfile] = useState<{
    first_name?: string;
    username?: string;
    money_box_balance?: string;
  } | null>(null);
  const [nisabData, setNisabData] = useState<any>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [campaignsData, nisabData] = await Promise.all([
          apiGet("/donations/campaigns/"),
          apiGet("/zakah/nisab/data/"),
        ]);
        setCampaigns(campaignsData);
        setNisabData(nisabData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
        if (!token) return;
        const me = await apiGet("/auth/me/", true);
        setProfile(me);
      } catch {
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = new Date(nextMonth.getTime() - 1);
    const diffMs = monthEnd.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    setDaysLeft(diffDays);
    if (diffDays <= 7) {
      const name = profile?.first_name || profile?.username || "Friend";
      const amount = profile?.money_box_balance ? Number(profile.money_box_balance || 0) : 0;
      const title = "Monthly donation due soon";
      const verseAr = "مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ";
      const body =
        (diffDays === 0
          ? name + ", your monthly donation is due today."
          : name + ", due in " + diffDays + " day" + (diffDays === 1 ? "" : "s") + ".") +
        " Amount: ₦" + amount.toLocaleString() + ". " + verseAr;
      if (typeof window !== "undefined" && "Notification" in window && navigator.serviceWorker) {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body,
                icon: "/favicon.ico",
                tag: "monthly-due",
                data: { url: "/dashboard" },
              });
            }).catch(() => { });
          }
        }).catch(() => { });
      }
    }
  }, [profile]);

  return (
    <div className="flex flex-col gap-4 md:gap-8 w-full animate-in fade-in zoom-in-95 duration-500 pb-10">
      <div className="relative overflow-hidden rounded-3xl glass-panel p-5 md:p-10 border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.1)] group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] group-hover:bg-emerald-400/30 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200 tracking-tight">
              {"Salam, " + (profile?.first_name || profile?.username || "Guest")}
            </h1>
            <p className="text-emerald-100/70 text-xs md:text-base max-w-sm leading-relaxed opacity-80">
              Pure, transparent, and impactful giving.
            </p>
          </div>
          <div className="flex flex-col gap-1 md:gap-2 min-w-[180px]">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400/80">
              Money Box Balance
            </p>
            <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {"₦" + (profile ? Number(profile.money_box_balance || 0).toLocaleString() : "0.00")}
            </p>
            <div className="flex gap-2 mt-1 md:mt-2">
              <Link
                href="/dashboard"
                className="flex-1 text-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] active-scale"
              >
                Top up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Explore Ishrapay</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {sections.map((sec) => (
            <Link
              key={sec.key}
              href={sec.href}
              className={"relative overflow-hidden rounded-2xl border " + sec.accent + " p-4 md:p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] active-scale group"}
            >
              <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white/10 flex items-center justify-center text-xl md:text-2xl">
                  {sec.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs md:text-base">{sec.label}</h3>
                  <p className="text-[10px] text-white/50 hidden md:block mt-0.5">{sec.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-3xl glass-panel card-hover p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Live Nisab Rates</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="flex-1 bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-center overflow-hidden relative">
            {nisabData ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-emerald-200/70 font-medium">{"Gold (" + (nisabData.gold_nisab_grams || 85) + "g)"}</span>
                  <span className="text-sm font-bold text-emerald-400">{"₦" + (nisabData.gold_nisab?.toLocaleString() || "0")}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-xs text-sky-200/70 font-medium">{"Silver (" + (nisabData.silver_nisab_grams || 595) + "g)"}</span>
                  <span className="text-sm font-bold text-sky-400">{"₦" + (nisabData.silver_nisab?.toLocaleString() || "0")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-amber-200/70 font-medium">Zakat al-Fitr</span>
                  <span className="text-sm font-bold text-amber-400">{"₦" + (nisabData.zakat_al_fitr?.toLocaleString() || "0")}</span>
                </div>
                <p className="text-[9px] text-slate-500 text-center pt-2 italic">Source: DailyNisab.org</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="loading-skeleton w-full h-24 rounded-xl" />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl glass-panel card-hover p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Active Campaigns</h2>
            <Link href="/sections/ishrakaat" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider">View All →</Link>
          </div>
          <div className="flex-1 space-y-2">
            {campaigns.length > 0 ? (
              campaigns.slice(0, 3).map((campaign) => (
                <Link
                  key={campaign.id}
                  href={"/sections/" + campaign.category.toLowerCase()}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                  <div className="flex flex-col overflow-hidden pr-4">
                    <span className="text-xs font-bold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">{campaign.name}</span>
                    <span className="text-[10px] text-slate-400 truncate">{campaign.description}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors shrink-0">
                    <span className="text-xs">→</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-white/5 border border-white/5 rounded-2xl">
                <span className="text-2xl mb-2 opacity-50">🌱</span>
                <p className="text-xs text-slate-400">Loading active campaigns...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
