"use client";

import React from "react";
import { Plus, ShieldCheck, Wallet, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";

interface LumaHeroCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  accountCount: number;
  safeDaily: number;
  pocketAccount: string;
  pocketRemaining: number;
  pocketBudget: number | null;
  dayOfCycle: number;
  cycleDays: number;
  daysRemaining: number;
  paceStatus: "ahead" | "on_track" | "warning";
  periodEnded: boolean;
  formatRupiah: (val: number) => string;
  loading?: boolean;
  onAddTransaction: () => void;
  onOpenPaycheck: () => void;
}

/**
 * LumaHeroCard — unified calm financial cockpit hero (Luma Dark Glass v2.0).
 * Merges Total saldo Kas + Batas Belanja Harian into one smoked-glass card
 * with a warm ember ambient glow. Ivory primary CTA, 44px touch targets.
 */
export function LumaHeroCard({
  totalBalance,
  income,
  expense,
  accountCount,
  safeDaily,
  pocketAccount,
  pocketRemaining,
  pocketBudget,
  dayOfCycle,
  cycleDays,
  daysRemaining,
  paceStatus,
  periodEnded,
  formatRupiah,
  loading,
  onAddTransaction,
  onOpenPaycheck,
}: LumaHeroCardProps) {
  const isWarning = paceStatus === "warning";
  const quotaPct =
    pocketBudget && pocketBudget > 0
      ? Math.max(0, Math.round((pocketRemaining / pocketBudget) * 100))
      : null;

  const paceLabel = isWarning ? "Pace Perlu Perhatian" : "Pace Aman";

  if (loading) {
    return (
      <section aria-label="Ringkasan saldo" className="luma-hero relative overflow-hidden p-6 sm:p-8 space-y-5">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-12 w-72 max-w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full col-span-2 sm:col-span-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-20 w-full rounded-3xl" />
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Ringkasan saldo dan batas belanja" className="luma-hero relative overflow-hidden p-6 sm:p-8">
      {/* Ember ambient glow, back-right corner */}
      <div aria-hidden="true" className="luma-ember-glow absolute -top-24 -right-24 w-96 h-96" />
      <div aria-hidden="true" className="luma-ember-glow absolute -bottom-32 -left-16 w-72 h-72 opacity-60" />

      <div className="relative">
        {/* Eyebrow + pace badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-luma-smoke ">
            Total saldo Kas · {accountCount} Rekening
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold font-sans px-3 py-1 rounded-full border whitespace-nowrap ${
              isWarning
                ? "bg-luma-gold/15 text-luma-gold border-luma-gold/40"
                : "bg-luma-sage/10 text-luma-sage border-luma-sage/30"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {paceLabel}
          </span>
        </div>

        {/* Hero balance — tabular numerals, no truncation surprises */}
        <div className="text-4xl sm:text-5xl font-semibold tracking-tight text-luma-ivory my-3 font-sans tabular-nums break-words">
          {formatRupiah(totalBalance)}{" "}
          <span className="text-sm sm:text-base font-normal text-luma-smoke tracking-normal">IDR</span>
        </div>

        {/* Flow pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-luma-sage font-sans font-semibold whitespace-nowrap bg-luma-sage/10 border border-luma-sage/25 px-3 py-1.5 rounded-full">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {formatRupiah(income)} masuk
          </span>
          <span className="inline-flex items-center gap-1.5 text-luma-coral font-sans font-semibold whitespace-nowrap bg-luma-coral/10 border border-luma-coral/25 px-3 py-1.5 rounded-full">
            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {formatRupiah(expense)} keluar
          </span>
          <span className="inline-flex items-center gap-1.5 text-luma-smoke font-sans font-semibold whitespace-nowrap bg-white/[0.05] border border-luma-smokeline px-3 py-1.5 rounded-full">
            Net: {formatRupiah(income - expense)}
          </span>
        </div>

        {/* Safe-to-spend strip — integrated, not a second card */}
        <div className="mt-5 pt-5 border-t border-luma-smokeline grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/[0.04] border border-luma-smokeline p-4 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-luma-smoke font-semibold ">
              <Wallet className="w-3.5 h-3.5 text-luma-ember shrink-0" aria-hidden="true" />
              <span className="truncate">Batas Belanja Harian</span>
            </div>
            <div className="ai7-type-metric text-luma-ivory mt-1.5 tabular-nums">
              {formatRupiah(safeDaily)}{" "}
              <span className="text-xs font-semibold text-luma-smoke">/ hari</span>
            </div>
            <div className="text-xs font-sans text-luma-smoke mt-1 truncate">
              Sisa kuota {pocketAccount}:{" "}
              <strong className="text-luma-ivory">{formatRupiah(pocketRemaining)}</strong>
              {pocketBudget ? <span> / {Math.round(pocketBudget / 1000)}k</span> : null}
              {quotaPct !== null ? <span> · {quotaPct}%</span> : null}
            </div>
          </div>
          <div className="rounded-3xl bg-white/[0.04] border border-luma-smokeline p-4 min-w-0">
            <div className="text-xs text-luma-smoke font-semibold ">
              Rentang Siklus
            </div>
            {periodEnded ? (
              <div className="ai7-type-metric text-luma-gold mt-1.5">
                Periode Berakhir
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="ai7-type-metric text-luma-ivory tabular-nums">
                  Hari {dayOfCycle} / {cycleDays}
                </div>
                <div className="text-xs font-sans text-luma-smoke mt-0.5">
                  Sisa {daysRemaining} hari
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions inside the hero — primary Ivory CTA + secondary */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onAddTransaction}
            className="luma-touch flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-full bg-luma-ivory text-luma-charcoal hover:brightness-95 active:scale-[0.98] transition shadow-luma-glass cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.75] shrink-0" aria-hidden="true" />
            Catat transaksi
          </button>
          <button
            type="button"
            onClick={onOpenPaycheck}
            className="luma-touch flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-full bg-white/[0.06] text-luma-ivory border border-luma-smokeline hover:bg-white/[0.1] hover:border-white/[0.2] active:scale-[0.98] transition cursor-pointer"
          >
            Laporan / Checklist Gajian
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
