 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

const sections = [
  {
    key: "ishrakaat",
    label: "Ishrakaat",
    href: "/sections/ishrakaat",
    accent: "bg-emerald-500/20 border-emerald-500/40",
    icon: "ش",
    subtitle: "Core donation campaigns and ongoing projects.",
  },
  {
    key: "zakah-sadaqah",
    label: "Zakah & Sadaqah",
    href: "/zakah",
    accent: "bg-sky-500/15 border-sky-500/35",
    icon: "%",
    subtitle: "Zakah calculator, Nisab and sadaqah channels.",
  },
  {
    key: "waqf",
    label: "Waqf",
    href: "/sections/waqf",
    accent: "bg-violet-500/15 border-violet-500/35",
    icon: "∞",
    subtitle: "Endowment and long-term charity projects.",
  },
  {
    key: "tabararaat",
    label: "Tabararaat",
    href: "/sections/tabararaat",
    accent: "bg-amber-500/15 border-amber-500/35",
    icon: "🎁",
    subtitle: "Voluntary gifts and one-off support.",
  },
  {
    key: "aqsah",
    label: "Aqsah",
    href: "/sections/aqsah",
    accent: "bg-rose-500/15 border-rose-500/35",
    icon: "🕌",
    subtitle: "Support Al-Aqsa related and emergency causes.",
  },
  {
    key: "welfare",
    label: "Welfare",
    href: "/sections/welfare",
    accent: "bg-lime-500/15 border-lime-500/35",
    icon: "♥",
    subtitle: "Orphans, widows and needy families welfare.",
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

  useEffect(() => {
    const load = async () => {
      try {
        const data: HomeCampaign[] = await apiGet("/donations/campaigns/");
        const sorted = [...data].sort((a, b) => b.id - a.id);
        setCampaigns(sorted.slice(0, 10));
      } catch {
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await apiGet("/auth/me/", true);
        setProfile(me);
      } catch {
      }
    };
    loadProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-4 pb-6 pt-4">
      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-400/40">
            <span className="text-xl font-semibold text-emerald-300">ش</span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
              Donation App
            </p>
            <p className="text-base md:text-lg font-semibold text-slate-50">
              Ishrakaat
            </p>
          </div>
        </div>
        <div className="flex gap-2" />
      </header>

      <main className="flex-1 flex flex-col gap-5">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="border-b border-slate-800 px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Notices
            </p>
          </div>
          <div className="h-9 overflow-hidden px-4 flex items-center">
            <p className="animate-marquee whitespace-nowrap text-[11px] text-slate-300">
              Welcome to Ishrakaat. Zakah, Sadaqah, Waqf, Tabararaat, Aqsah and
              Welfare all in one place. Monthly and emergency donations, auto
              reminders and reports for every Muslim household.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-300 mb-1.5">
            Money Box
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">
                Available for donation
              </p>
                <p className="text-2xl md:text-3xl font-semibold text-emerald-200">
                  ₦
                  {profile
                    ? Number(profile.money_box_balance || 0).toLocaleString()
                    : "0.00"}
                </p>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Link
                href="/dashboard"
                className="rounded-full bg-emerald-500/95 px-3.5 py-1.5 text-xs font-semibold text-slate-950 active:scale-[0.97]"
              >
                Quick deposit
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-100 active:scale-[0.97]"
              >
                Set monthly amount
              </Link>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="flex-1 text-[11px] leading-relaxed text-slate-400">
              Auto-deduct from Money Box and saved card when donations are due.
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-300 border border-slate-800">
              Next due in 3 days
            </span>
          </div>
        </section>

        {campaigns.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="border-b border-slate-800 px-4 py-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Active campaigns
              </p>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-800">
                Latest {campaigns.length}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 py-3 snap-x snap-mandatory">
              {campaigns.map((c) => {
                const isImpromptu = c.category === "IMPROMPTU";
                return (
                  <div
                    key={c.id}
                    className={`min-w-[240px] max-w-xs snap-start rounded-xl border p-3 text-xs ${
                      isImpromptu
                        ? "border-rose-500/70 bg-rose-950/40"
                        : "border-slate-800 bg-slate-950/70"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-50 line-clamp-2">
                        {c.name}
                      </p>
                      <span
                        className={
                          isImpromptu
                            ? "rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-semibold text-slate-50 border border-rose-300 animate-pulse"
                            : "rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-800"
                        }
                      >
                        {isImpromptu ? "Emergency" : c.category}
                      </span>
                    </div>
                    {c.description && (
                      <p className="mb-2 text-[11px] text-slate-200 line-clamp-3">
                        {c.description}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-300 space-y-1">
                      <p>
                        Target:{" "}
                        {c.target_amount
                          ? `₦${Number(c.target_amount).toLocaleString()}`
                          : "Not set"}
                      </p>
                      {c.deadline && (
                        <p>
                          Deadline:{" "}
                          {new Date(c.deadline).toLocaleDateString("en-NG")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Dashboard
            </p>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-800">
              Guest view
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {sections.map((section) => (
              <Link
                key={section.key}
                href={section.href}
                className={`flex flex-col items-start justify-between rounded-xl border px-3 py-2 md:px-4 md:py-3 text-left ${section.accent} active:scale-[0.98]`}
              >
                <span className="mb-2 inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-slate-900/80 text-[13px] md:text-[16px] text-slate-200 border border-slate-700">
                  {section.icon}
                </span>
                <span className="text-xs font-semibold text-slate-50">
                  {section.label}
                </span>
                <span className="mt-1 text-[10px] text-slate-300">
                  {section.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>Ishrakaat • v0</span>
        <span>Made for Zakah, Sadaqah and more</span>
      </footer>
    </div>
  );
}
