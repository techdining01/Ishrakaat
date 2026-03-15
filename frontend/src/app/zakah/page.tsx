"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

// --- Types ---
interface NisabResponse {
  currency: string;
  gold_price_usd_oz: number;
  silver_price_usd_oz: number;
  usd_ngn_rate: number;
  nisab_gold: number;
  nisab_silver: number;
  last_updated: string;
  warning?: string;
}

interface ZakahReferenceItem {
  key: string;
  title: string;
  amount_ngn: number;
  source_url: string | null;
  last_updated: string;
}

interface DonationType {
  id: number;
  name: string;
  category: string;
  description: string;
}

// --- Icons (Inline SVGs for reliability) ---
const Icons = {
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
  ),
};

// --- Helper Functions (Livestock logic synced with backend) ---
function getCamelZakah(count: number): { desc: string; amount: number } {
  if (count < 5) return { desc: "No Zakah due", amount: 0 };
  if (count <= 9) return { desc: "1 sheep", amount: 0 }; // Sheep count handled as ref
  if (count <= 14) return { desc: "2 sheep", amount: 0 };
  if (count <= 19) return { desc: "3 sheep", amount: 0 };
  if (count <= 24) return { desc: "4 sheep", amount: 0 };
  if (count <= 35) return { desc: "1 bint makhad (1-year female camel)", amount: 0 };
  if (count <= 45) return { desc: "1 bint labun (2-year female camel)", amount: 0 };
  if (count <= 60) return { desc: "1 hiqqah (3-year female camel)", amount: 0 };
  if (count <= 75) return { desc: "1 jadha'ah (4-year female camel)", amount: 0 };
  if (count <= 90) return { desc: "2 bint labun", amount: 0 };
  if (count <= 120) return { desc: "2 hiqqah", amount: 0 };

  let bestRemainder = count;
  let bestH = 0;
  let bestB = 0;
  for (let h = Math.floor(count / 50); h >= 0; h--) {
    const remaining = count - (h * 50);
    const b = Math.floor(remaining / 40);
    const rem = remaining % 40;
    if (rem < bestRemainder || (rem === bestRemainder && (h + b) < (bestH + bestB))) {
      bestRemainder = rem;
      bestH = h;
      bestB = b;
    }
  }
  const parts = [];
  if (bestB > 0) parts.push(`${bestB} bint labun`);
  if (bestH > 0) parts.push(`${bestH} hiqqah`);
  let res = parts.join(" and ");
  if (bestRemainder > 0) res += ` (Remainder ${bestRemainder} ignored)`;
  return { desc: res, amount: 0 };
}

function getCowZakah(count: number): { desc: string; amount: number } {
  if (count < 30) return { desc: "No Zakah due", amount: 0 };
  let bestRemainder = count;
  let bestM = 0;
  let bestT = 0;
  for (let m = Math.floor(count / 40); m >= 0; m--) {
    const remaining = count - (m * 40);
    const t = Math.floor(remaining / 30);
    const rem = remaining % 30;
    if (rem < bestRemainder || (rem === bestRemainder && (m + t) < (bestM + bestT))) {
      bestRemainder = rem;
      bestM = m;
      bestT = t;
    }
  }
  const parts = [];
  if (bestT > 0) parts.push(`${bestT} tabi' (1yr)`);
  if (bestM > 0) parts.push(`${bestM} musinnah (2yr)`);
  let res = parts.join(" and ");
  if (bestRemainder > 0) res += ` (Remainder ${bestRemainder} ignored)`;
  return { desc: res, amount: 0 };
}

function getSheepZakah(count: number): { desc: string; amount: number } {
  if (count < 40) return { desc: "No Zakah due", amount: 0 };
  if (count <= 120) return { desc: "1 sheep", amount: 0 };
  if (count <= 200) return { desc: "2 sheep", amount: 0 };
  if (count <= 399) return { desc: "3 sheep", amount: 0 };
  const c = Math.floor(count / 100);
  return { desc: `${c} sheep (1 per 100)`, amount: 0 };
}

export default function ZakahPage() {
  const [step, setStep] = useState(1);
  const [nisab, setNisab] = useState<NisabResponse | null>(null);
  const [zakahRefs, setZakahRefs] = useState<ZakahReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form State
  const [cash, setCash] = useState("");
  const [goldAsset, setGoldAsset] = useState("");
  const [silverAsset, setSilverAsset] = useState("");
  const [investments, setInvestments] = useState("");
  const [otherWealth, setOtherWealth] = useState("");

  const [camels, setCamels] = useState("");
  const [cows, setCows] = useState("");
  const [sheep, setSheep] = useState("");
  const [camelPrice, setCamelPrice] = useState("");
  const [cowPrice, setCowPrice] = useState("");
  const [sheepPrice, setSheepPrice] = useState("");
  const [livestockMode, setLivestockMode] = useState<"animal" | "cash">("animal");

  const [crops, setCrops] = useState("");
  const [irrigation, setIrrigation] = useState<"natural" | "artificial">("natural");
  const [businessOther, setBusinessOther] = useState("");

  const [payLoading, setPayLoading] = useState(false);
  const [payMessage, setPayMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [nisabData, refsData] = await Promise.all([
          apiGet("/zakah/nisab/"),
          apiGet("/zakah/references/"),
        ]);
        setNisab(nisabData);
        if (refsData && Array.isArray(refsData.items)) {
          setZakahRefs(refsData.items);
        }
      } catch (err) {
        setError("Could not load latest rates. Please check your connection.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Calculations ---
  const results = useMemo(() => {
    const cashVal = parseFloat(cash) || 0;
    const goldVal = parseFloat(goldAsset) || 0;
    const silverVal = parseFloat(silverAsset) || 0;
    const invVal = parseFloat(investments) || 0;
    const otherWVal = parseFloat(otherWealth) || 0;
    
    const totalWealthNum = cashVal + goldVal + silverVal + invVal + otherWVal;
    
    const cropsNum = Math.max(0, parseFloat(crops) || 0);
    const busOtherNum = Math.max(0, parseFloat(businessOther) || 0);
    
    const goldNisab = nisab?.nisab_gold || 0;
    const silverNisab = nisab?.nisab_silver || 0;

    let wealthZakah = 0;
    let wealthReason = "";

    if (totalWealthNum >= goldNisab && goldNisab > 0) {
      wealthZakah = totalWealthNum * 0.025;
      wealthReason = "Exceeds Gold Nisab threshold.";
    } else if (totalWealthNum >= silverNisab && silverNisab > 0) {
      wealthZakah = totalWealthNum * 0.025;
      wealthReason = "Exceeds Silver Nisab threshold.";
    }

    const cropZakah = cropsNum * (irrigation === "natural" ? 0.1 : 0.05);
    const busOtherZakah = busOtherNum * 0.025;

    const camelCount = parseInt(camels) || 0;
    const cowCount = parseInt(cows) || 0;
    const sheepCount = parseInt(sheep) || 0;

    const camelData = getCamelZakah(camelCount);
    const cowData = getCowZakah(cowCount);
    const sheepData = getSheepZakah(sheepCount);

    // Cash conversion for livestock
    const camelCash = camelCount * (parseFloat(camelPrice) || 0) * 0.025; // 2.5% if paying in cash
    const cowCash = cowCount * (parseFloat(cowPrice) || 0) * 0.025;
    const sheepCash = sheepCount * (parseFloat(sheepPrice) || 0) * 0.025;
    const totalLivestockCash = camelCash + cowCash + sheepCash;

    return {
      totalWealthNum,
      wealthZakah,
      wealthReason,
      cropZakah,
      busOtherZakah,
      camelData,
      cowData,
      sheepData,
      camelCash,
      cowCash,
      sheepCash,
      totalLivestockCash,
      totalNgn: wealthZakah + busOtherZakah + cropZakah + (livestockMode === "cash" ? totalLivestockCash : 0),
    };
  }, [cash, goldAsset, silverAsset, investments, otherWealth, crops, businessOther, camels, cows, sheep, camelPrice, cowPrice, sheepPrice, irrigation, nisab, livestockMode]);

  const handlePay = async (amount: number, note: string, method: "MONEY_BOX" | "CARD", isFinal: boolean = false) => {
    if (amount <= 0) return;
    setPayLoading(true);
    setPayMessage("");
    try {
      await apiPost("/donations/zakah/pay/", {
        amount,
        method,
        note,
      }, true);
      setPayMessage("Success! Your Zakah payment has been recorded.");
      if (isFinal) setStep(5); // Jump to success if it's the final action
    } catch {
      setPayMessage("Payment failed. Please ensure you have sufficient funds.");
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100 selection:bg-emerald-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative mx-auto max-w-lg px-4 pt-8 md:pt-12">
        {/* Progress Bar */}
        <div className="mb-8 flex items-center justify-between px-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div 
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 shadow-lg ${
                  step >= s ? "bg-emerald-500 text-slate-950 scale-110" : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > s ? <Icons.Check /> : s}
              </div>
              {s < 4 && (
                <div className={`mx-2 h-[2px] flex-1 rounded-full transition-all duration-500 ${step > s ? "bg-emerald-500" : "bg-slate-800"}`}></div>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Step Content */}
        <div className="min-h-[500px]">
          {step === 1 && (
            <StepOne 
              nisab={nisab} 
              refs={zakahRefs} 
              onNext={() => setStep(2)} 
            />
          )}
          {step === 2 && (
            <StepWealth 
              cash={cash} setCash={setCash}
              gold={goldAsset} setGold={setGoldAsset}
              silver={silverAsset} setSilver={setSilverAsset}
              inv={investments} setInv={setInvestments}
              other={otherWealth} setOther={setOtherWealth}
              nisab={nisab}
              results={results}
              payLoading={payLoading}
              payMessage={payMessage}
              onPay={(method: any) => handlePay(results.wealthZakah, "Zakah on Wealth Assets", method)}
              onBack={() => setStep(1)} 
              onNext={() => setStep(3)} 
            />
          )}
          {step === 3 && (
            <StepLivestock 
              camels={camels} setCamels={setCamels}
              cows={cows} setCows={setCows}
              sheep={sheep} setSheep={setSheep}
              camelPrice={camelPrice} setCamelPrice={setCamelPrice}
              cowPrice={cowPrice} setCowPrice={setCowPrice}
              sheepPrice={sheepPrice} setSheepPrice={setSheepPrice}
              mode={livestockMode} setMode={setLivestockMode}
              results={results}
              payLoading={payLoading}
              payMessage={payMessage}
              onPay={(method: any) => handlePay(results.totalLivestockCash, "Zakah on Livestock (Cash Equivalent)", method)}
              onBack={() => setStep(2)} 
              onNext={() => setStep(4)} 
            />
          )}
          {step === 4 && (
            <StepCrops 
              crops={crops} setCrops={setCrops}
              irrigation={irrigation} setIrrigation={setIrrigation}
              other={businessOther} setOther={setBusinessOther}
              results={results}
              payLoading={payLoading}
              payMessage={payMessage}
              onPay={(method: any) => handlePay(results.cropZakah + results.busOtherZakah, "Zakah on Crops & Business", method, true)}
              onBack={() => setStep(3)} 
              onNext={() => setStep(5)} 
            />
          )}
          {step === 5 && (
            <StepSuccess message={payMessage} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Internal Components for Steps ---

function StepOne({ nisab, refs, onNext }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Zakah Calculator</h1>
        <p className="text-slate-400 text-sm leading-relaxed">Let's calculate your Zakah accurately. We'll start by reviewing today's live Nisab thresholds.</p>
      </div>

      <div className="grid gap-4 mb-8">
        <div className="glass-panel p-5 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20"><Icons.Info /></div>
          <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest mb-3">Live Thresholds</p>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-white/5 pb-3">
              <div>
                <p className="text-xs text-slate-400">Gold Nisab (85g)</p>
                <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  ₦{nisab?.nisab_gold?.toLocaleString() || "---"}
                </p>
              </div>
              <div className="h-6 w-12 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center justify-center">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-slate-400">Silver Nisab (595g)</p>
                <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  ₦{nisab?.nisab_silver?.toLocaleString() || "---"}
                </p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Authoritative Fiqh</p>
            </div>
          </div>
        </div>

        {refs.length > 0 && (
          <div className="glass-panel p-5 border border-white/5 bg-slate-900/40">
            <p className="text-[10px] text-sky-400 uppercase font-bold tracking-widest mb-3">Islamic Reference Amounts</p>
            <div className="grid gap-3">
              {refs.slice(0, 3).map((r: any) => (
                <div key={r.key} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">{r.title}</span>
                  <span className="font-mono text-slate-100">₦{Number(r.amount_ngn).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={onNext}
        className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-xl shadow-emerald-500/20 group"
      >
        Start Calculation
        <Icons.ChevronRight />
      </button>
    </div>
  );
}

function StepWealth({ cash, setCash, gold, setGold, silver, setSilver, inv, setInv, other, setOther, nisab, results, payLoading, payMessage, onPay, onBack, onNext }: any) {
  const goldProgress = Math.min((results.totalWealthNum / (nisab?.nisab_gold || 1)) * 100, 100);
  const silverProgress = Math.min((results.totalWealthNum / (nisab?.nisab_silver || 1)) * 100, 100);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Wealth & Assets</h2>
        <p className="text-slate-400 text-sm">Itemize your liquid assets. Zakah is 2.5% of the total if it exceeds Nisab.</p>
      </div>

      <div className="space-y-4 mb-6">
        {[
          { label: "Cash on Hand / Bank", value: cash, setter: setCash, icon: "₦" },
          { label: "Gold (Total Value)", value: gold, setter: setGold, icon: "Au" },
          { label: "Silver (Total Value)", value: silver, setter: setSilver, icon: "Ag" },
          { label: "Stocks / Investments", value: inv, setter: setInv, icon: "📈" },
          { label: "Other Wealth", value: other, setter: setOther, icon: "◈" },
        ].map((item) => (
          <div key={item.label} className="glass-panel p-4 border border-white/5 bg-slate-900/40">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">{item.label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">{item.icon}</span>
              <input 
                type="number"
                min="0"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-2.5 pl-10 text-lg font-bold text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                placeholder="0.00"
                value={item.value}
                onChange={(e) => item.setter(Math.max(0, parseFloat(e.target.value) || 0).toString())}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 border-2 border-emerald-500/20 mb-8 bg-emerald-500/5 ring-1 ring-white/5">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Total Wealth Value</p>
            <p className="text-3xl font-black text-white">₦{results.totalWealthNum.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Zakah Due (2.5%)</p>
            <p className="text-xl font-bold text-emerald-300">₦{results.wealthZakah.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-[10px] mb-1.5 uppercase font-bold text-slate-500">
              <span>Silver Nisab Progress</span>
              <span className={results.totalWealthNum >= (nisab?.nisab_silver || 0) ? "text-emerald-400" : ""}>
                {Math.round(silverProgress)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${silverProgress}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1.5 uppercase font-bold text-slate-500">
              <span>Gold Nisab Progress</span>
              <span className={results.totalWealthNum >= (nisab?.nisab_gold || 0) ? "text-emerald-400" : ""}>
                {Math.round(goldProgress)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${goldProgress}%` }}></div>
            </div>
          </div>
        </div>

        {results.wealthZakah > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-tighter">Quick Pay for Assets</p>
            <div className="flex gap-2">
              <button 
                disabled={payLoading}
                onClick={() => onPay("MONEY_BOX")}
                className="flex-1 py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
              >
                {payLoading ? "..." : "Money Box"}
              </button>
              <button 
                disabled={payLoading}
                onClick={() => onPay("CARD")}
                className="flex-1 py-3 bg-white text-slate-950 text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all"
              >
                Card
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 py-4 glass-panel border border-white/5 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-xs">
          <Icons.ChevronLeft /> Back
        </button>
        <button onClick={onNext} className="flex-[2] py-4 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-xl text-sm">
          Livestock Calculation <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

function StepLivestock({ camels, setCamels, cows, setCows, sheep, setSheep, camelPrice, setCamelPrice, cowPrice, setCowPrice, sheepPrice, setSheepPrice, mode, setMode, results, payLoading, payMessage, onPay, onBack, onNext }: any) {
  const isCash = mode === "cash";

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Livestock Calculation</h2>
        <p className="text-slate-400 text-sm">Quantities are based on standard Fiqh. You can pay in animals or their cash equivalent.</p>
      </div>

      <div className="flex bg-slate-900/60 p-1 rounded-2xl mb-6 border border-white/5">
        <button 
          onClick={() => setMode("animal")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isCash ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-400"}`}
        >
          Pay in Animals
        </button>
        <button 
          onClick={() => setMode("cash")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isCash ? "bg-emerald-500 text-slate-950 shadow-lg" : "text-slate-400"}`}
        >
          Pay in Cash (IshraPay)
        </button>
      </div>

      <div className="space-y-4 mb-8">
        {[
          { label: "Camels", value: camels, setter: setCamels, price: camelPrice, priceSetter: setCamelPrice, result: results.camelData, cash: results.camelCash, color: "border-amber-500/50" },
          { label: "Cows / Buffalo", value: cows, setter: setCows, price: cowPrice, priceSetter: setCowPrice, result: results.cowData, cash: results.cowCash, color: "border-sky-500/50" },
          { label: "Sheep / Goats", value: sheep, setter: setSheep, price: sheepPrice, priceSetter: setSheepPrice, result: results.sheepData, cash: results.sheepCash, color: "border-emerald-500/50" },
        ].map((item) => (
          <div key={item.label} className={`glass-panel p-5 border-l-4 ${item.color} bg-slate-900/40 relative overflow-hidden`}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-white">{item.label}</span>
              <input 
                type="number"
                min="0"
                className="w-24 bg-slate-950 p-2 rounded-xl border border-slate-700 text-center font-bold text-white outline-none focus:border-white/40"
                value={item.value}
                onChange={(e) => item.setter(Math.max(0, parseInt(e.target.value) || 0).toString())}
                placeholder="0"
              />
            </div>

            {isCash && (
              <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                <label className="text-[9px] uppercase font-black text-slate-500 block mb-2 tracking-widest">Market Price per Head (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500">₦</span>
                  <input 
                    type="number"
                    min="0"
                    placeholder="Approx market value"
                    className="w-full bg-slate-850/50 border border-slate-700/30 rounded-lg p-2 pl-7 text-sm font-bold text-white outline-none"
                    value={item.price}
                    onChange={(e) => item.priceSetter(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                  />
                </div>
              </div>
            )}

            {item.value && (
              <div className="mt-3 flex justify-between items-center">
                <p className="text-[10px] font-semibold text-emerald-400 italic">
                  {item.result.desc}
                </p>
                {isCash && item.cash > 0 && (
                  <p className="text-[10px] font-black text-white bg-white/5 px-2 py-1 rounded-md">
                    ₦{item.cash.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isCash && results.totalLivestockCash > 0 && (
        <div className="glass-panel p-5 border-2 border-emerald-500/40 mb-8 bg-emerald-500/10 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-bold text-emerald-200">Total Livestock Cash (2.5%)</span>
            <span className="text-xl font-black text-white">₦{results.totalLivestockCash.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={payLoading}
              onClick={() => onPay("MONEY_BOX")}
              className="flex-1 py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              Money Box
            </button>
            <button 
              disabled={payLoading}
              onClick={() => onPay("CARD")}
              className="flex-1 py-3 bg-white text-slate-950 text-xs font-black rounded-xl active:scale-95 transition-all"
            >
              Card
            </button>
          </div>
          {payMessage && <p className="text-[9px] text-center mt-3 font-bold text-emerald-400 uppercase tracking-tighter">{payMessage}</p>}
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 py-4 glass-panel border border-white/5 font-bold flex items-center justify-center gap-2 transition-all text-xs">
          <Icons.ChevronLeft /> Back
        </button>
        <button onClick={onNext} className="flex-[3] py-4 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl text-sm">
          Crops & Business <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

function StepCrops({ crops, setCrops, irrigation, setIrrigation, other, setOther, results, payLoading, payMessage, onPay, onBack, onNext }: any) {
  const stepTotal = results.cropZakah + results.busOtherZakah;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Crops & Business</h2>
        <p className="text-slate-400 text-sm">Almost there. Final items include agricultural harvests and business receivables.</p>
      </div>

      <div className="space-y-6 mb-8">
        <div className="glass-panel p-5 border border-white/5 bg-slate-900/40">
          <label className="text-[10px] uppercase font-black text-slate-500 block mb-3 tracking-widest">Agricultural Harvest (₦ Value)</label>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">₦</span>
            <input 
              type="number"
              min="0"
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-2.5 pl-8 text-lg font-bold text-white outline-none focus:border-emerald-500"
              value={crops}
              onChange={(e) => setCrops(Math.max(0, parseFloat(e.target.value) || 0).toString())}
              placeholder="Total harvest value"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIrrigation("natural")}
              className={`flex-1 p-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${irrigation === "natural" ? "bg-emerald-500 text-slate-950 shadow-lg" : "bg-slate-800 text-slate-400"}`}
            >
              Natural (10%)
            </button>
            <button 
              onClick={() => setIrrigation("artificial")}
              className={`flex-1 p-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${irrigation === "artificial" ? "bg-emerald-500 text-slate-950 shadow-lg" : "bg-slate-800 text-slate-400"}`}
            >
              Irrigated (5%)
            </button>
          </div>
        </div>

        <div className="glass-panel p-5 border border-white/5 bg-slate-900/40">
          <label className="text-[10px] uppercase font-black text-slate-500 block mb-3 tracking-widest">Other Zakah-due Items (₦)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">₦</span>
            <input 
              type="number"
              min="0"
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-2.5 pl-8 text-lg font-bold text-white outline-none focus:border-emerald-500"
              value={other}
              onChange={(e) => setOther(Math.max(0, parseFloat(e.target.value) || 0).toString())}
              placeholder="Receivables, Stocks, etc."
            />
          </div>
        </div>
      </div>

      {(results.cropZakah > 0 || results.busOtherZakah > 0) && (
        <div className="glass-panel p-5 border-2 border-emerald-500/40 mb-8 bg-emerald-500/10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Crops & Business Zakah</span>
              <span className="text-xl font-black text-white">₦{stepTotal.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button 
                disabled={payLoading}
                onClick={() => onPay("MONEY_BOX")}
                className="px-4 py-2.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                Money Box
              </button>
              <button 
                disabled={payLoading}
                onClick={() => onPay("CARD")}
                className="px-4 py-2.5 bg-white text-slate-950 text-[10px] font-black rounded-lg active:scale-95 transition-all"
              >
                Card
              </button>
            </div>
          </div>
          {payMessage && <p className="text-[9px] text-center font-bold text-emerald-400 uppercase tracking-tighter">{payMessage}</p>}
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 py-4 glass-panel border border-white/5 font-bold flex items-center justify-center gap-2 transition-all text-xs">
          <Icons.ChevronLeft /> Back
        </button>
        <button onClick={onNext} className="flex-[3] py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl text-sm">
          Finish & View Success <Icons.ChevronRight />
        </button>
      </div>
    </div>
  );
}

// StepSummary removed as per request for per-step payment and no final summary.

function StepSuccess({ message }: { message: string }) {
  return (
    <div className="text-center animate-in zoom-in-90 duration-500 py-12 px-6">
      <div className="h-24 w-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/50">
        <Icons.Check />
      </div>
      <h2 className="text-4xl font-black text-white mb-6">Allah accepts!</h2>
      
      <div className="glass-panel p-6 border border-white/5 bg-slate-900/40 mb-10 text-center">
        <p className="text-xl md:text-2xl font-arabic text-emerald-400 mb-4 leading-relaxed tracking-wide" dir="rtl">
          إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَأَقَامُوا الصَّلَاةَ وَآتَوُا الزَّكَاةَ لَهُمْ أَجْرُهُمْ عِنْدَ رَبِّهِمْ وَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ
        </p>
        <p className="text-xs md:text-sm text-slate-300 italic leading-relaxed">
          "Indeed, those who believe and do righteous deeds and establish prayer and give zakah will have their reward with their Lord, and there will be no fear concerning them, nor will they grieve."
          <span className="block mt-2 text-[10px] text-slate-500 uppercase font-bold">— Surah Al-Baqarah 2:277</span>
        </p>
      </div>

      <p className="text-slate-400 mb-10 leading-relaxed text-sm">Your Zakah has been successfully recorded and will be distributed to those in need.</p>
      <Link 
        href="/dashboard"
        className="inline-flex py-4 px-12 bg-white text-slate-950 font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
