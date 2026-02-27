"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPatchForm } from "@/lib/api";
import { MoneyActions } from "./money-actions";

interface FastStats {
  active_campaigns: number;
  total_users: number;
  total_donated: number;
  message: string;
}

interface Profile {
  first_name: string;
  last_name?: string;
  username?: string;
  is_staff?: boolean;
  profile_pic?: string;
  money_box_balance: string;
}

interface DonationSettings {
  monthly_amount: string;
}

interface ZakahReferenceItem {
  key: string;
  title: string;
  amount_ngn: number;
}

interface NisabData {
  nisab_gold: number;
  nisab_silver: number;
}

interface IslamicCard {
  title: string;
  arabic_title: string;
  content: string;
  arabic_content: string;
  icon_name: string;
  order: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<FastStats | null>(null);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [monthlyInput, setMonthlyInput] = useState("");
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [monthlyMessage, setMonthlyMessage] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [zakahRefs, setZakahRefs] = useState<ZakahReferenceItem[]>([]);
  const [nisab, setNisab] = useState<NisabData | null>(null);
  const [islamicCards, setIslamicCards] = useState<IslamicCard[]>([]);
  const [activeCompanionTab, setActiveCompanionTab] = useState<'calendar' | 'inheritance'>('calendar');
  const [inheritanceEstate, setInheritanceEstate] = useState("");
  const [inheritanceDebt, setInheritanceDebt] = useState("");
  const [selectedHeirs, setSelectedHeirs] = useState<Record<string, number>>({});
  const [calendarMode, setCalendarMode] = useState<'hijri'>('hijri');
  const [viewDate, setViewDate] = useState(new Date());

  const getCalendarMetadata = () => {
    const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const parts = hijriFormatter.formatToParts(viewDate);
    const hijriDay = parseInt(parts.find(p => p.type === 'day')?.value || "1");
    const day1Date = new Date(viewDate);
    day1Date.setDate(day1Date.getDate() - (hijriDay - 1));

    return {
      monthName: new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { month: 'long' }).format(viewDate),
      year: new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric' }).format(viewDate) + " AH",
      firstDayInfo: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(day1Date),
      startsOn: new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(day1Date),
      day1Year: day1Date.getFullYear(),
    };
  };

  const getCalendarDays = () => {
    const today = new Date();

    // We get the viewDate which represents a date inside the target Hijri month.
    // 1. Figure out when the 1st of this Hijri month was
    const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const parts = hijriFormatter.formatToParts(viewDate);
    const hijriDay = parseInt(parts.find(p => p.type === 'day')?.value || "1");
    // day1Date will represent the Gregorian date of the 1st of the Hijri month
    const day1Date = new Date(viewDate);
    day1Date.setDate(day1Date.getDate() - (hijriDay - 1));

    // 2. Figure out the length of this Hijri month (29 or 30 days)
    const day30Date = new Date(day1Date);
    day30Date.setDate(day30Date.getDate() + 29);
    const parts30 = hijriFormatter.formatToParts(day30Date);
    const day30Num = parseInt(parts30.find(p => p.type === 'day')?.value || "1");
    const monthLength = day30Num === 30 ? 30 : 29;

    const days = [];
    // Pad empty cells for the start of the Gregorian week (0 = Sunday)
    for (let i = 0; i < day1Date.getDay(); i++) days.push(null);

    // Fill days
    for (let i = 1; i <= monthLength; i++) {
      // Find the specific Gregorian date for Hijri day 'i'
      const date = new Date(day1Date);
      date.setDate(date.getDate() + (i - 1));

      days.push({
        main: i, // Main number is the Hijri day (1-29/30)
        sub: date.getDate(), // Sub number is the Gregorian day (1-31)
        subMonth: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date),
        isToday: date.toDateString() === today.toDateString(), // isToday compares matching Gregorian days
      });
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    // To change Hijri month accurately, we jump 29 or 30 days
    // based on the current hijri day position.
    const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric' });
    const hijriDay = parseInt(hijriFormatter.format(viewDate));

    if (offset > 0) {
      // Move to middle of next month to avoid skipping
      next.setDate(next.getDate() + (30 - hijriDay + 15));
    } else {
      // Move to middle of previous month
      next.setDate(next.getDate() - (hijriDay + 15));
    }
    setViewDate(next);
  };

  // Expanded Islamic Inheritance Heirs and Rules
  const heirsList = [
    { key: 'husband', name: 'Husband', arabic: 'زوج', type: 'count', max: 1, group: 'Immediate' },
    { key: 'wife', name: 'Wife', arabic: 'زوجة', type: 'count', max: 4, group: 'Immediate' },
    { key: 'son', name: 'Son', arabic: 'ابن', type: 'count', group: 'Descendants' },
    { key: 'daughter', name: 'Daughter', arabic: 'بنت', type: 'count', group: 'Descendants' },
    { key: 'father', name: 'Father', arabic: 'أب', type: 'count', max: 1, group: 'Ascendants' },
    { key: 'mother', name: 'Mother', arabic: 'أم', type: 'count', max: 1, group: 'Ascendants' },
    { key: 'paternal_grandfather', name: 'Paternal Grandfather', arabic: 'جد لأب', type: 'count', max: 1, group: 'Ascendants' },
    { key: 'paternal_grandmother', name: 'Paternal Grandmother', arabic: 'جدة لأب', type: 'count', max: 1, group: 'Ascendants' },
    { key: 'maternal_grandmother', name: 'Maternal Grandmother', arabic: 'جدة لأم', type: 'count', max: 1, group: 'Ascendants' },
    { key: 'full_brother', name: 'Full Brother', arabic: 'أخ شقيق', type: 'count', group: 'Siblings' },
    { key: 'full_sister', name: 'Full Sister', arabic: 'أخت شقيقة', type: 'count', group: 'Siblings' },
    { key: 'paternal_brother', name: 'Paternal Brother', arabic: 'أخ لأب', type: 'count', group: 'Siblings' },
    { key: 'paternal_sister', name: 'Paternal Sister', arabic: 'أخت لأب', type: 'count', group: 'Siblings' },
    { key: 'uterine_brother', name: 'Uterine Brother', arabic: 'أخ لأم', type: 'count', group: 'Siblings' },
    { key: 'uterine_sister', name: 'Uterine Sister', arabic: 'أخت لأم', type: 'count', group: 'Siblings' },
  ];

  const calculateInheritance = () => {
    const estate = parseFloat(inheritanceEstate) || 0;
    const debt = parseFloat(inheritanceDebt) || 0;
    const netEstate = estate - debt;

    if (netEstate <= 0) return null;

    const shares: Record<string, { share: string, amount: number, label: string }> = {};
    let remaining = netEstate;

    const counts = selectedHeirs;
    const hasDescendants = (counts.son || 0) > 0 || (counts.daughter || 0) > 0;

    if (counts.husband) {
      const share = hasDescendants ? 1 / 4 : 1 / 2;
      shares['husband'] = { share: hasDescendants ? '1/4' : '1/2', amount: netEstate * share, label: 'Husband (زوج)' };
      remaining -= netEstate * share;
    } else if (counts.wife) {
      const share = hasDescendants ? 1 / 8 : 1 / 4;
      shares['wife'] = { share: hasDescendants ? '1/8' : '1/4', amount: netEstate * share, label: `Wife (${counts.wife} زوجة)` };
      remaining -= netEstate * share;
    }

    if (counts.father) {
      const share = hasDescendants ? 1 / 6 : 0;
      if (share > 0) {
        shares['father'] = { share: '1/6', amount: netEstate * share, label: 'Father (أب)' };
        remaining -= netEstate * share;
      }
    }
    if (counts.mother) {
      const hasSiblings = (counts.full_brother || 0) + (counts.full_sister || 0) + (counts.paternal_brother || 0) + (counts.paternal_sister || 0) >= 2;
      const share = (hasDescendants || hasSiblings) ? 1 / 6 : 1 / 3;
      shares['mother'] = { share: (hasDescendants || hasSiblings) ? '1/6' : '1/3', amount: netEstate * share, label: 'Mother (أم)' };
      remaining -= netEstate * share;
    }

    if (counts.son || counts.daughter) {
      const sonWeight = 2;
      const daughterWeight = 1;
      const totalWeight = (counts.son || 0) * sonWeight + (counts.daughter || 0) * daughterWeight;

      if (counts.son) {
        const sonShare = (remaining * (sonWeight * counts.son)) / totalWeight;
        shares['son'] = { share: 'Remainder', amount: sonShare, label: `Sons (${counts.son} ابن)` };
      }
      if (counts.daughter) {
        if (!counts.son) {
          const share = counts.daughter === 1 ? 1 / 2 : 2 / 3;
          shares['daughter'] = { share: counts.daughter === 1 ? '1/2' : '2/3', amount: netEstate * share, label: `Daughters (${counts.daughter} بنت)` };
          remaining -= netEstate * share;
        } else {
          const daughterShare = (remaining * (daughterWeight * counts.daughter)) / totalWeight;
          shares['daughter'] = { share: 'Remainder', amount: daughterShare, label: `Daughters (${counts.daughter} بنت)` };
        }
      }
      if (counts.son) remaining = 0;
    }

    const hasFather = (counts.father || 0) > 0;
    if (!hasDescendants && !hasFather) {
      const brotherWeight = 2;
      const sisterWeight = 1;
      const totalSibWeight = (counts.full_brother || 0) * brotherWeight + (counts.full_sister || 0) * sisterWeight;

      if (totalSibWeight > 0) {
        if (counts.full_brother) {
          const share = (remaining * (brotherWeight * counts.full_brother)) / totalSibWeight;
          shares['full_brother'] = { share: 'Remainder', amount: share, label: `Full Brothers (${counts.full_brother} أخ شقيق)` };
        }
        if (counts.full_sister) {
          if (!counts.full_brother) {
            const share = counts.full_sister === 1 ? 1 / 2 : 2 / 3;
            shares['full_sister'] = { share: counts.full_sister === 1 ? '1/2' : '2/3', amount: estate * share, label: `Full Sisters (${counts.full_sister} أخت شقيقة)` };
            remaining -= estate * share;
          } else {
            const share = (remaining * (sisterWeight * counts.full_sister)) / totalSibWeight;
            shares['full_sister'] = { share: 'Remainder', amount: share, label: `Full Sisters (${counts.full_sister} أخت شقيقة)` };
          }
        }
        if (counts.full_brother) remaining = 0;
      }
    }

    if (!hasDescendants && !hasFather && !(counts.paternal_grandfather)) {
      const uterineCount = (counts.uterine_brother || 0) + (counts.uterine_sister || 0);
      if (uterineCount > 0) {
        const share = uterineCount === 1 ? 1 / 6 : 1 / 3;
        const totalAmount = estate * share;
        if (counts.uterine_brother) {
          shares['uterine_brother'] = { share: uterineCount === 1 ? '1/6' : '1/3', amount: (totalAmount * (counts.uterine_brother / uterineCount)), label: `Uterine Brothers (${counts.uterine_brother} أخ لأم)` };
        }
        if (counts.uterine_sister) {
          shares['uterine_sister'] = { share: uterineCount === 1 ? '1/6' : '1/3', amount: (totalAmount * (counts.uterine_sister / uterineCount)), label: `Uterine Sisters (${counts.uterine_sister} أخت لأم)` };
        }
        remaining -= totalAmount;
      }
    }

    if (remaining > 0) {
      if (counts.father && !counts.son) {
        if (shares['father']) {
          shares['father'].amount += remaining;
          shares['father'].share = '1/6 + Remainder';
        } else {
          shares['father'] = { share: 'Remainder', amount: remaining, label: 'Father (أب)' };
        }
        remaining = 0;
      } else if (counts.paternal_grandfather && !counts.father && !counts.son) {
        shares['paternal_grandfather'] = { share: 'Remainder', amount: remaining, label: 'Grandfather (جد)' };
        remaining = 0;
      }
    }

    return shares;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/api/fast/stats`);
        if (!response.ok) {
          setError(`Stats API error: ${response.status}`);
          return;
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Dashboard stats fetch error:", err);
        setError("Could not load latest stats.");
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [me, donationSettings] = await Promise.all([
          apiGet("/auth/me/", true),
          apiGet("/donations/settings/", true),
        ]);
        setProfile(me);
        setSettings(donationSettings);
        setMonthlyInput(donationSettings?.monthly_amount || "");
      } catch {
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadZakahRefs = async () => {
      try {
        // First, trigger a refresh for Nisab if needed
        const nisabData = await apiGet("/zakah/nisab/", false);
        setNisab(nisabData);

        const data = await apiGet("/zakah/references/", false);
        if (data && Array.isArray(data.items)) {
          setZakahRefs(data.items);
        }

        // Fetch Islamic Cards
        const cardsData = await apiGet("/zakah/cards/", false);
        if (cardsData && Array.isArray(cardsData.cards)) {
          setIslamicCards(cardsData.cards);
        }
      } catch (err) {
        console.error("Could not load Zakah references:", err);
      }
    };
    loadZakahRefs();
  }, []);

  const displayName = profile?.first_name || profile?.username || "Guest";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const { monthName, year, firstDayInfo, startsOn, day1Year } = getCalendarMetadata();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-4 pb-6 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-sm font-semibold text-emerald-100 overflow-hidden">
            {profile?.profile_pic ? (
              <img
                src={profile.profile_pic}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              avatarInitial
            )}
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-300">
              Ishrakaat
            </p>
            <p className="text-lg font-semibold text-slate-50">
              {displayName}
            </p>
            {profile?.is_staff && (
              <Link
                href="/admin"
                className="text-[11px] text-emerald-300 underline"
              >
                Open admin dashboard
              </Link>
            )}
          </div>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-3.5 py-1.5 text-sm text-slate-200"
        >
          Home
        </Link>
      </header>

      <main className="flex-1 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Quick stats</p>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs text-slate-300 border border-slate-800">
                {profile ? "Backend live" : "Guest view"}
              </span>
            </div>
            {stats ? (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs text-emerald-200">
                    Active campaigns
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-100">
                    {stats.active_campaigns}
                  </p>
                </div>
                <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-2">
                  <p className="text-xs text-sky-200">Total users</p>
                  <p className="mt-1 text-2xl font-semibold text-sky-100">
                    {stats.total_users}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-100">Total donated</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-50">
                    ₦{stats.total_donated.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                {error || "Loading stats from backend..."}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
              {nisab && (
                <>
                  <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800">
                    <p className="text-slate-400 uppercase tracking-wider mb-1">Nisab Gold</p>
                    <p className="text-emerald-300 font-semibold">₦{nisab.nisab_gold.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/50 p-2 border border-slate-800">
                    <p className="text-slate-400 uppercase tracking-wider mb-1">Nisab Silver</p>
                    <p className="text-sky-300 font-semibold">₦{nisab.nisab_silver.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
            {zakahRefs.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-1">Reference Amounts</p>
                <div className="grid grid-cols-1 gap-1 text-xs text-slate-300">
                  {zakahRefs.map((item) => (
                    <div key={item.key} className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
                      <span>{item.title}</span>
                      <span className="font-semibold text-slate-100">₦{item.amount_ngn.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                Money Box
              </p>
              {profile && (
                <span className="text-sm text-slate-200">
                  {displayName}
                </span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-300 mb-1">Available balance</p>
                <p className="text-3xl font-semibold text-emerald-200">
                  ₦
                  {profile
                    ? Number(profile.money_box_balance || 0).toLocaleString()
                    : "0.00"}
                </p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <p>
                  Monthly target: ₦
                  {settings
                    ? Number(settings.monthly_amount || 0).toLocaleString()
                    : "0.00"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <input
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                  type="number"
                  min="0"
                  placeholder="Set monthly amount"
                  value={monthlyInput}
                  onChange={(e) => setMonthlyInput(e.target.value)}
                />
                <button
                  type="button"
                  disabled={savingMonthly}
                  onClick={async () => {
                    setMonthlyMessage("");
                    const amount = parseFloat(monthlyInput || "0");
                    if (!amount || amount < 0) {
                      setMonthlyMessage("Enter a valid monthly amount.");
                      return;
                    }
                    setSavingMonthly(true);
                    try {
                      const updated = await apiPatch(
                        "/donations/settings/",
                        { monthly_amount: monthlyInput },
                        true
                      );
                      setSettings(updated);
                      setMonthlyMessage("Monthly amount saved.");
                    } catch {
                      setMonthlyMessage(
                        "Could not save monthly amount. Ensure you are signed in."
                      );
                    } finally {
                      setSavingMonthly(false);
                    }
                  }}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                >
                  {savingMonthly ? "Saving..." : "Save monthly"}
                </button>
              </div>
              {monthlyMessage && (
                <p className="text-xs text-slate-200">{monthlyMessage}</p>
              )}
              <MoneyActions />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
                Profile photo
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">
                Choose a picture from your device to use as your profile photo.
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  setPhotoFile(file || null);
                }}
              />
              <button
                type="button"
                disabled={savingPhoto || !photoFile}
                onClick={async () => {
                  setPhotoMessage("");
                  setSavingPhoto(true);
                  try {
                    if (!photoFile) {
                      setPhotoMessage("Select a photo first.");
                      setSavingPhoto(false);
                      return;
                    }
                    const formData = new FormData();
                    formData.append("profile_pic", photoFile);
                    const updated = await apiPatchForm(
                      "/auth/me/",
                      formData,
                      true
                    );
                    setProfile(updated);
                    setPhotoMessage("Profile photo updated.");
                  } catch {
                    setPhotoMessage(
                      "Could not update photo. Ensure you are signed in."
                    );
                  } finally {
                    setSavingPhoto(false);
                  }
                }}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
              >
                {savingPhoto ? "Saving..." : "Upload photo"}
              </button>
              {photoMessage && (
                <p className="text-xs text-slate-200">{photoMessage}</p>
              )}
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveCompanionTab('calendar')}
                className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${activeCompanionTab === 'calendar'
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                Islamic Calendar
              </button>
              <button
                onClick={() => setActiveCompanionTab('inheritance')}
                className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${activeCompanionTab === 'inheritance'
                  ? 'border-b-2 border-emerald-500 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                Inheritance Calculator
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Companion</span>
            </div>
          </div>

          {activeCompanionTab === 'calendar' && (
            <div className="space-y-4">
              {islamicCards.filter(c => c.icon_name === 'calendar').map((card, idx) => (
                <div key={idx} className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">📅</div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">{card.title}</h4>
                    <p className="text-sm font-bold text-slate-50 leading-relaxed whitespace-pre-line">{card.content}</p>
                    {card.arabic_title && <p className="text-lg arabic-font text-emerald-300 mt-1">{card.arabic_title}</p>}
                  </div>
                </div>
              ))}

              <div className="bg-slate-900/60 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
                {/* Dark Theme Header */}
                <div className="bg-emerald-600/20 border-b border-emerald-500/20 p-6 md:p-8 flex items-center justify-between relative">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
                  >
                    <span className="text-2xl">←</span>
                  </button>

                  <div className="text-center space-y-1">
                    <h3 className="text-3xl md:text-5xl font-black text-emerald-400 leading-none tracking-tight">
                      {monthName}
                    </h3>
                    <p className="text-sm md:text-base font-bold text-slate-400 uppercase tracking-[0.4em]">
                      {year}
                    </p>
                  </div>

                  <button
                    onClick={() => changeMonth(1)}
                    className="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-90"
                  >
                    <span className="text-2xl">→</span>
                  </button>
                </div>

                <div className="p-5 md:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800/50 pb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Starts on: <span className="text-emerald-400">{startsOn}, {firstDayInfo}, {day1Year}</span>
                    </p>
                  </div>

                  <div className="overflow-hidden">
                    <div className="grid grid-cols-7 gap-2 md:gap-3 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, index) => (
                        <div key={d} className={`text-[10px] md:text-xs font-black uppercase tracking-widest py-2 text-center ${index === 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2 md:gap-3">
                      {getCalendarDays().map((d, i) => (
                        <div
                          key={i}
                          className={`aspect-square flex flex-col items-center justify-center rounded-2xl p-1 md:p-2 transition-all duration-300 relative border border-transparent ${!d ? 'bg-transparent' :
                            d.isToday
                              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] scale-[1.02] z-10'
                              : 'bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700/50 hover:scale-[1.02]'
                            }`}
                        >
                          {d && (
                            <>
                              <div className="flex-1 flex items-end justify-center pb-0.5 md:pb-1">
                                <span className={`text-xl md:text-3xl font-black ${d.isToday ? 'text-emerald-400' : 'text-slate-200'}`}>
                                  {d.main}
                                </span>
                              </div>
                              <div className="flex-1 flex items-start justify-center pt-0.5 md:pt-1 w-full relative">
                                {!d.isToday && <div className="absolute top-0 w-8 h-px bg-slate-800/60 rounded-full"></div>}
                                <span className={`text-[9px] md:text-[11px] font-bold mt-1 ${d.isToday ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                                  {d.sub} <span className="hidden md:inline">{d.subMonth}</span>
                                </span>
                              </div>
                              {d.isToday && (
                                <div className="absolute top-2 right-2 md:top-3 md:right-3 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCompanionTab === 'inheritance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {islamicCards.filter(c => c.icon_name !== 'calendar').map((card, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col items-center text-center space-y-2 hover:border-emerald-500/50 transition-all group">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      {card.icon_name === 'users' && <span>👥</span>}
                      {card.icon_name === 'arrow-down' && <span>⬇️</span>}
                      {card.icon_name === 'heart' && <span>❤️</span>}
                      {card.icon_name === 'award' && <span>🏆</span>}
                      {card.icon_name === 'book' && <span>📖</span>}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">{card.title}</p>
                      <p className="text-xs font-bold text-slate-100 mt-1">{card.content}</p>
                      {card.arabic_title && <p className="text-xs arabic-font text-emerald-300/60 mt-1">{card.arabic_title}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5 md:p-8">
                <div className="mb-8">
                  <h3 className="text-xl md:text-2xl font-black text-slate-50 tracking-tight">Inheritance Calculator</h3>
                  <p className="text-sm font-bold text-emerald-500/80 mt-1">Fara&apos;id distribution according to Islamic Law (Shari&apos;ah)</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Total Estate Value (NGN)</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-500">₦</span>
                          <input
                            type="number"
                            placeholder="e.g. 10,000,000"
                            value={inheritanceEstate}
                            onChange={(e) => setInheritanceEstate(e.target.value)}
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-950 pl-10 pr-4 py-4 text-lg font-black text-slate-50 outline-none ring-0 focus:border-emerald-500 transition-all placeholder:text-slate-700"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Debts / Funeral (NGN)</label>
                        <div className="relative group">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-rose-500">₦</span>
                          <input
                            type="number"
                            placeholder="e.g. 50,000"
                            value={inheritanceDebt}
                            onChange={(e) => setInheritanceDebt(e.target.value)}
                            className="w-full rounded-2xl border-2 border-slate-700 bg-slate-950 pl-10 pr-4 py-4 text-lg font-black text-slate-50 outline-none ring-0 focus:border-rose-500 transition-all placeholder:text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Select Heirs</h4>
                      <button
                        onClick={() => setSelectedHeirs({})}
                        className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="space-y-8">
                      {['Immediate', 'Descendants', 'Ascendants', 'Siblings'].map(groupName => (
                        <div key={groupName} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">
                              {groupName} Heirs
                            </h4>
                            <div className="h-px flex-1 bg-slate-800"></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {heirsList.filter(h => h.group === groupName).map((heir) => (
                              <div key={heir.key} className="group p-4 rounded-2xl border-2 border-slate-800 bg-slate-950/50 hover:border-slate-600 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-black text-slate-300 uppercase tracking-tight">{heir.name}</label>
                                  <span className="text-sm arabic-font font-black text-emerald-500/60 group-hover:text-emerald-400 transition-colors">{heir.arabic}</span>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max={heir.max}
                                  value={selectedHeirs[heir.key] || ""}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setSelectedHeirs(prev => ({ ...prev, [heir.key]: val }));
                                  }}
                                  className="w-full rounded-xl border-2 border-slate-800 bg-slate-900 px-4 py-2.5 text-base font-black text-slate-50 outline-none focus:border-emerald-500/50 transition-all"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:sticky lg:top-4 h-fit space-y-6">
                    <div className="rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8 shadow-2xl shadow-emerald-900/20">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-[0.25em]">Distribution Results</h4>
                        <div className="bg-emerald-500/20 rounded-full px-3 py-1">
                          <span className="text-[10px] font-black text-emerald-400 uppercase">Confirmed</span>
                        </div>
                      </div>

                      {parseFloat(inheritanceEstate) > 0 ? (
                        <div className="space-y-5">
                          {Object.entries(calculateInheritance() || {}).map(([key, data]) => (
                            <div key={key} className="group flex items-center justify-between border-b-2 border-emerald-500/10 pb-4 last:border-0 last:pb-0 transition-all">
                              <div className="space-y-1">
                                <p className="text-sm md:text-base font-black text-slate-50 tracking-tight group-hover:text-emerald-300 transition-colors">{data.label}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full uppercase">Share</span>
                                  <p className="text-xs font-black text-emerald-400/80">{data.share}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg md:text-xl font-black text-slate-50 tabular-nums">₦{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          ))}
                          {Object.keys(calculateInheritance() || {}).length === 0 && (
                            <div className="py-8 text-center space-y-3">
                              <p className="text-sm font-bold text-slate-500 italic">Select heirs to see the distribution results.</p>
                              <div className="h-1 w-12 bg-slate-800 mx-auto rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center space-y-4 py-16 opacity-40">
                          <div className="text-5xl">⚖️</div>
                          <div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Awaiting Estate Value</p>
                            <p className="text-xs font-medium text-slate-500 mt-1">Enter the total amount to begin</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-slate-800 bg-slate-950 p-6">
                      <h5 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Fara&apos;id Rules Info
                      </h5>
                      <ul className="space-y-4">
                        {[
                          "Total estate is distributed after burial expenses and debts are paid.",
                          "Male heirs generally receive twice the share of female heirs in the same category.",
                          "Closer relatives may exclude more distant ones (e.g. Father excludes Grandfather).",
                          "This calculator follows standard Shari'ah distribution models (Hanafi/Maliki)."
                        ].map((rule, idx) => (
                          <li key={idx} className="flex gap-3 text-xs font-bold text-slate-400 leading-relaxed">
                            <span className="text-emerald-500 text-sm">✓</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Sections
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link
              href="/"
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-emerald-100">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[11px]">
                  ش
                </span>
                Ishrakaat
              </p>
              <p className="mt-1 text-xs text-emerald-50/80">
                Core donation campaigns and projects.
              </p>
            </Link>
            <Link
              href="/zakah"
              className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-sky-100">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px]">
                  %
                </span>
                Zakah &amp; Sadaqah
              </p>
              <p className="mt-1 text-xs text-sky-50/80">
                Obligatory and voluntary charity.
              </p>
            </Link>
            <Link
              href="/sections/waqf"
              className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-violet-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 text-[9px]">
                  ⭕
                </span>
                Waqf
              </p>
              <p className="mt-1 text-[10px] text-violet-50/80">
                Endowments for ongoing reward.
              </p>
            </Link>
            <Link
              href="/sections/tabararaat"
              className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-amber-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px]">
                  ✨
                </span>
                Tabararaat
              </p>
              <p className="mt-1 text-[10px] text-amber-50/80">
                Voluntary contributions and gifts.
              </p>
            </Link>
            <Link
              href="/sections/aqsah"
              className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-rose-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/20 text-[9px]">
                  ★
                </span>
                Aqsah
              </p>
              <p className="mt-1 text-[10px] text-rose-50/80">
                Special causes and emergencies.
              </p>
            </Link>
            <Link
              href="/sections/welfare"
              className="rounded-xl border border-lime-500/35 bg-lime-500/10 px-3 py-2"
            >
              <p className="flex items-center gap-1.5 font-semibold text-lime-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-lime-500/20 text-[9px]">
                  ♥
                </span>
                Welfare
              </p>
              <p className="mt-1 text-[10px] text-lime-50/80">
                Support for families and communities.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
