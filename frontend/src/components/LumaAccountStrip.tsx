"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";

export interface LumaAccountSummary {
  name: string;
  balance: number;
}

interface LumaAccountStripProps {
  accounts: LumaAccountSummary[];
  formatRupiah: (val: number) => string;
  loading?: boolean;
  onOpenAccounts: () => void;
}

/**
 * LumaAccountStrip — airy horizontal cash-account summary for Ringkasan.
 * Names never clip to "Reke..." — full wrap with tabular balances.
 */
export function LumaAccountStrip({ accounts, formatRupiah, loading, onOpenAccounts }: LumaAccountStripProps) {
  if (loading) {
    return (
      <section aria-label="Ringkasan rekening kas" className="luma-accounts space-y-4">
        <Skeleton className="h-5 w-48 rounded-full" />
        <div className="luma-accounts-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="luma-glass !rounded-3xl p-5 space-y-3">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (accounts.length === 0) return null;

  return (
    <section aria-label="Ringkasan rekening kas" className="luma-accounts space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-luma-ivory tracking-tight">
          Rekening Kas
        </h2>
        <button
          type="button"
          onClick={onOpenAccounts}
          className="luma-touch inline-flex items-center px-2 text-xs text-luma-ember hover:underline font-semibold shrink-0 whitespace-nowrap cursor-pointer"
        >
          Kelola Akun
        </button>
      </div>
      <div className="luma-accounts-grid">
        {accounts.map((acc) => (
          <div
            key={acc.name}
            className="luma-account-item"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Wallet className="w-4 h-4 text-luma-smoke shrink-0" aria-hidden="true" />
              <p className="text-xs font-normal text-luma-smoke leading-snug break-words">
                {acc.name}
              </p>
            </div>
            <p className="text-lg font-medium text-luma-ivory mt-2 tabular-nums break-words">
              {formatRupiah(acc.balance)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
