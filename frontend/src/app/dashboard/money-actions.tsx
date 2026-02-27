 "use client";
 
import { useState } from "react";
import { apiPost } from "@/lib/api";

interface Props {
  onDepositStarted?: () => void;
}

export function MoneyActions({ onDepositStarted }: Props) {
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState("");
  const [virtualAccount, setVirtualAccount] = useState<{
    account_number: string;
    bank_name: string;
  } | null>(null);

  async function handleQuickDeposit() {
    setError("");
    setLoadingDeposit(true);
    try {
      const data = await apiPost(
        "/payments/initialize/",
        { amount: 1000, purpose: "DEPOSIT" },
        true
      );
      const url =
        data.data?.authorization_url || data.data?.authorizationUrl || null;
      if (url) {
        if (onDepositStarted) onDepositStarted();
        window.location.href = url;
      } else {
        setError("Could not get payment link from Paystack.");
      }
    } catch {
      setError("Could not start deposit. Check that you are signed in.");
    } finally {
      setLoadingDeposit(false);
    }
  }

  async function handleCreateVirtualAccount() {
    setError("");
    setLoadingAccount(true);
    try {
      const data = await apiPost(
        "/payments/create-virtual-account/",
        {},
        true
      );
      if (data.account_number && data.bank_name) {
        setVirtualAccount({
          account_number: data.account_number,
          bank_name: data.bank_name,
        });
      } else {
        setError("Could not create or fetch virtual account.");
      }
    } catch {
      setError("Could not create or fetch virtual account.");
    } finally {
      setLoadingAccount(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleQuickDeposit}
          disabled={loadingDeposit}
          className="flex-1 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-[0.97] disabled:opacity-60"
        >
          {loadingDeposit ? "Opening Paystack..." : "Quick deposit ₦1,000"}
        </button>
        <button
          onClick={handleCreateVirtualAccount}
          disabled={loadingAccount}
          className="flex-1 rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 active:scale-[0.97] disabled:opacity-60"
        >
          {loadingAccount ? "Requesting..." : "Get virtual account"}
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-rose-400">{error}</p>
      )}

      {virtualAccount && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-200">
          <p className="font-semibold">Money Box account</p>
          <p className="mt-1">
            {virtualAccount.bank_name} • {virtualAccount.account_number}
          </p>
          <p className="mt-1 text-slate-400">
            Send transfers here to top up your Money Box.
          </p>
        </div>
      )}
    </div>
  );
}

