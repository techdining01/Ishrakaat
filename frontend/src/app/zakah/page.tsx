 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface NisabResponse {
  currency: string;
  gold_price_usd_oz: string;
  silver_price_usd_oz: string;
  usd_ngn_rate: string;
  nisab_gold: string;
  nisab_silver: string;
  last_updated: string;
}

interface DonationType {
  id: number;
  name: string;
  category: string;
  description: string;
  is_mandatory: boolean;
  is_active: boolean;
  deadline: string | null;
  target_amount: string | null;
}

interface ZakahReferenceItem {
  key: string;
  title: string;
  amount_ngn: number;
  source_url: string | null;
  last_updated: string;
}

function calculateCamelZakah(count: number): string {
  if (count < 5) return "No Zakah on camels below 5.";
  if (count <= 9) return "1 sheep.";
  if (count <= 14) return "2 sheep.";
  if (count <= 19) return "3 sheep.";
  if (count <= 24) return "4 sheep.";
  if (count <= 35) return "1 bint makhad (1-year-old she-camel).";
  if (count <= 45) return "1 bint labun (2-year-old she-camel).";
  if (count <= 60) return "1 hiqqah (3-year-old she-camel).";
  if (count <= 75) return "1 jadha'ah (4-year-old she-camel).";
  if (count <= 90) return "2 bint labun.";
  if (count <= 120) return "2 hiqqah.";

  let remaining = count - 120;
  let bintLabun = 0;
  let hiqqah = 0;

  while (remaining >= 40 || remaining >= 50) {
    if (remaining % 50 === 0 || remaining === 50) {
      hiqqah += remaining / 50;
      remaining = 0;
    } else if (remaining % 40 === 0 || remaining === 40) {
      bintLabun += remaining / 40;
      remaining = 0;
    } else if (remaining > 50) {
      hiqqah += 1;
      remaining -= 50;
    } else {
      bintLabun += 1;
      remaining -= 40;
    }
  }

  const parts = [];
  if (bintLabun > 0) {
    parts.push(`${bintLabun} bint labun`);
  }
  if (hiqqah > 0) {
    parts.push(`${hiqqah} hiqqah`);
  }
  const base = parts.length ? parts.join(" and ") : "Follow detailed fiqh for this number.";
  return `For ${count} camels: ${base}.`;
}

function calculateCowZakah(count: number): string {
  if (count < 30) return "No Zakah on cows below 30.";

  let remaining = count;
  let tabi = 0;
  let musinnah = 0;

  while (remaining >= 40) {
    if (remaining === 30 || remaining === 60 || remaining === 90) {
      tabi += remaining / 30;
      remaining = 0;
      break;
    }
    if (remaining === 40 || remaining === 80) {
      musinnah += remaining / 40;
      remaining = 0;
      break;
    }

    if (remaining >= 40) {
      musinnah += 1;
      remaining -= 40;
    } else if (remaining >= 30) {
      tabi += 1;
      remaining -= 30;
    } else {
      break;
    }
  }

  const parts = [];
  if (tabi > 0) {
    parts.push(`${tabi} tabi' (1-year-old)`);
  }
  if (musinnah > 0) {
    parts.push(`${musinnah} musinnah (2-year-old)`);
  }
  const base = parts.length ? parts.join(" and ") : "Follow detailed fiqh for this number.";
  return `For ${count} cows: ${base}.`;
}

function calculateSheepZakah(count: number): string {
  if (count < 40) return "No Zakah on sheep/goats below 40.";
  if (count <= 120) return "1 sheep.";
  if (count <= 200) return "2 sheep.";
  if (count <= 399) return "3 sheep.";
  const extra = Math.floor(count / 100);
  return `${extra} sheep.`;
}

export default function ZakahPage() {
  const [nisab, setNisab] = useState<NisabResponse | null>(null);
  const [wealth, setWealth] = useState("");
  const [camelCount, setCamelCount] = useState("");
  const [cowCount, setCowCount] = useState("");
  const [sheepCount, setSheepCount] = useState("");
  const [cropsValue, setCropsValue] = useState("");
  const [cropsRate, setCropsRate] = useState<"five" | "ten">("ten");
  const [otherZakatable, setOtherZakatable] = useState("");
  const [campaigns, setCampaigns] = useState<DonationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payMessage, setPayMessage] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [zakahRefs, setZakahRefs] = useState<ZakahReferenceItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [nisabData, campaignsData] = await Promise.all([
          apiGet("/zakah/nisab/"),
          apiGet("/donations/campaigns/"),
        ]);
        setNisab(nisabData);
        const filtered = (campaignsData as DonationType[]).filter(
          (c) => c.category === "MONTHLY"
        );
        setCampaigns(filtered);
      } catch {
        setError("Could not load Nisab or campaigns.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const data = await apiGet("/zakah/references/");
        if (data && Array.isArray(data.items)) {
          setZakahRefs(data.items);
        }
      } catch (err) {
        console.error("Error loading references:", err);
      }
    };
    loadRefs();
  }, []);

  const wealthNumber = parseFloat(wealth || "0");
  const cropsNumber = parseFloat(cropsValue || "0");
  const otherNumber = parseFloat(otherZakatable || "0");
  const nisabGold = nisab ? Number(nisab.nisab_gold) : 0;
  const nisabSilver = nisab ? Number(nisab.nisab_silver) : 0;
  const zakahGold =
    wealthNumber > 0 && wealthNumber >= nisabGold
      ? wealthNumber * 0.025
      : 0;
  const zakahSilver =
    wealthNumber > 0 && wealthNumber >= nisabSilver
      ? wealthNumber * 0.025
      : 0;

  const cropsZakah =
    cropsNumber > 0
      ? cropsNumber * (cropsRate === "ten" ? 0.1 : 0.05)
      : 0;
  const otherZakah =
    otherNumber > 0 ? otherNumber * 0.025 : 0;

  const wealthZakahAmount = Math.max(zakahGold, zakahSilver);

  async function handleZakahPay(
    amount: number,
    note: string,
    method: "MONEY_BOX" | "CARD"
  ) {
    if (!amount || amount <= 0) {
      return;
    }
    const ok = window.confirm(
      `Pay ₦${amount.toLocaleString()} for ${note}?`
    );
    if (!ok) return;
    setPayMessage("");
    setPayLoading(true);
    try {
      const data = await apiPost(
        "/donations/zakah/pay/",
        {
          amount,
          method,
          note,
        },
        true
      );
      const detail =
        (data && (data.detail as string)) ||
        "Zakah payment recorded.";
      setPayMessage(detail);
    } catch {
      setPayMessage(
        "Could not process Zakah payment. Check your balance or saved card."
      );
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 px-4 pb-6 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Ishrakaat
          </p>
          <p className="text-sm font-semibold text-slate-50">
            Zakah & Sadaqah
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
        >
          Home
        </Link>
      </header>

      <main className="flex-1 space-y-4">
        {loading && (
          <p className="text-xs text-slate-400">
            Loading Nisab and campaigns...
          </p>
        )}

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {payMessage && (
          <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-3 py-2">
            {payMessage}
          </p>
        )}

        {nisab && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Nisab (auto-fetched)
            </p>
            <div className="space-y-1 text-slate-200">
              <p>
                Currency: <span className="font-semibold">{nisab.currency}</span>
              </p>
              <p>
                Nisab (Gold):{" "}
                <span className="font-semibold">
                  ₦{Number(nisab.nisab_gold).toLocaleString()}
                </span>
              </p>
              <p>
                Nisab (Silver):{" "}
                <span className="font-semibold">
                  ₦{Number(nisab.nisab_silver).toLocaleString()}
                </span>
              </p>
              <p className="text-[10px] text-slate-400">
                Last updated:{" "}
                {new Date(nisab.last_updated).toLocaleString("en-NG")}
              </p>
            </div>
          </section>
        )}

        {zakahRefs.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Reference amounts (dowry, death fine, etc.)
            </p>
            <div className="space-y-1 text-slate-200">
              {zakahRefs.map((item) => (
                <p key={item.key}>
                  <span className="font-semibold">{item.title}</span>: ₦
                  {Number(item.amount_ngn).toLocaleString()}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Zakah calculator (wealth)
          </p>
          <p className="mb-2 text-[11px] text-slate-300">
            Enter your total Zakatable wealth (cash, gold, silver, trade goods)
            in NGN.
          </p>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400 mb-3"
            type="number"
            min="0"
            value={wealth}
            onChange={(e) => setWealth(e.target.value)}
            placeholder="Total wealth in ₦"
          />

          {nisab && wealthNumber > 0 && (
            <div className="space-y-2">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-emerald-100">
                  Based on gold Nisab
                </p>
                <p className="mt-1 text-[11px] text-emerald-50">
                  Threshold: ₦
                  {nisabGold.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-emerald-50">
                  {zakahGold > 0
                    ? `Zakah due: ₦${zakahGold.toLocaleString()} (2.5% of wealth)`
                    : "No Zakah due with gold Nisab."}
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-sky-100">
                  Based on silver Nisab
                </p>
                <p className="mt-1 text-[11px] text-sky-50">
                  Threshold: ₦
                  {nisabSilver.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-sky-50">
                  {zakahSilver > 0
                    ? `Zakah due: ₦${zakahSilver.toLocaleString()} (2.5% of wealth)`
                    : "No Zakah due with silver Nisab."}
                </p>
              </div>
              {wealthZakahAmount > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        wealthZakahAmount,
                        "Zakah on wealth",
                        "MONEY_BOX"
                      )
                    }
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                  >
                    {payLoading
                      ? "Processing..."
                      : "Pay from Money Box"}
                  </button>
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        wealthZakahAmount,
                        "Zakah on wealth",
                        "CARD"
                      )
                    }
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 active:scale-[0.97] disabled:opacity-60"
                  >
                    Pay with saved card
                  </button>
                </div>
              )}
            </div>
          )}

          {!nisab && (
            <p className="text-[11px] text-slate-400">
              Nisab rates are not available yet. Please try again later.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Zakah calculator (livestock, crops, other)
          </p>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[11px] text-slate-300">
                Camels (number of animals).
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="number"
                min="0"
                value={camelCount}
                onChange={(e) => setCamelCount(e.target.value)}
                placeholder="Total camels"
              />
              {camelCount && Number(camelCount) > 0 && (
                <p className="mt-1 text-[11px] text-slate-300">
                  {calculateCamelZakah(Number(camelCount))}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-slate-300">
                Cows/buffalo (number of animals).
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="number"
                min="0"
                value={cowCount}
                onChange={(e) => setCowCount(e.target.value)}
                placeholder="Total cows/buffalo"
              />
              {cowCount && Number(cowCount) > 0 && (
                <p className="mt-1 text-[11px] text-slate-300">
                  {calculateCowZakah(Number(cowCount))}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-slate-300">
                Sheep/goats (number of animals).
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="number"
                min="0"
                value={sheepCount}
                onChange={(e) => setSheepCount(e.target.value)}
                placeholder="Total sheep/goats"
              />
              {sheepCount && Number(sheepCount) > 0 && (
                <p className="mt-1 text-[11px] text-slate-300">
                  {calculateSheepZakah(Number(sheepCount))}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-slate-300">
                Crops/grain (harvest value in NGN).
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="number"
                min="0"
                value={cropsValue}
                onChange={(e) => setCropsValue(e.target.value)}
                placeholder="Total value of harvest in ₦"
              />
              <div className="mt-2 flex gap-2 text-[11px] text-slate-300">
                <button
                  type="button"
                  onClick={() => setCropsRate("ten")}
                  className={`rounded-full px-3 py-1 border ${
                    cropsRate === "ten"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  10% (natural irrigation)
                </button>
                <button
                  type="button"
                  onClick={() => setCropsRate("five")}
                  className={`rounded-full px-3 py-1 border ${
                    cropsRate === "five"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500"
                      : "bg-slate-900 text-slate-200 border-slate-700"
                  }`}
                >
                  5% (artificial irrigation)
                </button>
              </div>
              {cropsZakah > 0 && (
                <p className="mt-1 text-[11px] text-slate-300">
                  Zakah on crops:{" "}
                  <span className="font-semibold">
                    ₦{cropsZakah.toLocaleString()}
                  </span>
                </p>
              )}
              {cropsZakah > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        cropsZakah,
                        "Zakah on crops",
                        "MONEY_BOX"
                      )
                    }
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                  >
                    {payLoading
                      ? "Processing..."
                      : "Pay from Money Box"}
                  </button>
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        cropsZakah,
                        "Zakah on crops",
                        "CARD"
                      )
                    }
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 active:scale-[0.97] disabled:opacity-60"
                  >
                    Pay with saved card
                  </button>
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-[11px] text-slate-300">
                Other zakatable items (business stock, receivables, etc.) in
                NGN.
              </p>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-400"
                type="number"
                min="0"
                value={otherZakatable}
                onChange={(e) => setOtherZakatable(e.target.value)}
                placeholder="Total value in ₦"
              />
              {otherZakah > 0 && (
                <p className="mt-1 text-[11px] text-slate-300">
                  Zakah on these items (2.5% of value):{" "}
                  <span className="font-semibold">
                    ₦{otherZakah.toLocaleString()}
                  </span>
                </p>
              )}
              {otherZakah > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        otherZakah,
                        "Zakah on other items",
                        "MONEY_BOX"
                      )
                    }
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
                  >
                    {payLoading
                      ? "Processing..."
                      : "Pay from Money Box"}
                  </button>
                  <button
                    type="button"
                    disabled={payLoading}
                    onClick={() =>
                      handleZakahPay(
                        otherZakah,
                        "Zakah on other items",
                        "CARD"
                      )
                    }
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 active:scale-[0.97] disabled:opacity-60"
                  >
                    Pay with saved card
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Zakah campaigns
          </p>
          {campaigns.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No dedicated Zakah campaigns available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-semibold text-slate-50">
                      {campaign.name}
                    </p>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-800">
                      {campaign.category}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-[11px] text-slate-300 mb-1.5">
                      {campaign.description}
                    </p>
                  )}
                  <Link
                    href="/dashboard"
                    className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 active:scale-[0.97]"
                  >
                    Donate from Money Box
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
