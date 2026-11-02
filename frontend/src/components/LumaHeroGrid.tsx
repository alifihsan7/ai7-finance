"use client";

import React from "react";
import { Plus, ShieldCheck, Wallet, ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";

interface LumaHeroGridProps {
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
 * LumaHeroGrid — original layout structure (two side-by-side hero cards),
 * fully redesigned in Luma Dark Glass v2.0.
 * Net Worth (xl:col-span-7) in smoked glass + Safe-to-Spend (xl:col-span-5)
 * in smoked glass with a warm Ember accent — no canary yellow anywhere.
 */
export function LumaHeroGrid({
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
}: LumaHeroGridProps) {
  const isWarning = paceStatus === "warning";
  const quotaPct =
    pocketBudget && pocketBudget > 0
      ? Math.max(0, Math.round((pocketRemaining / pocketBudget) * 100))
      : null;

  const paceLabel = isWarning ? "Agak Boros" : "Pace Aman";

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        <div className="xl:col-span-7 luma-hero relative overflow-hidden p-6 sm:p-8 space-y-5">
          <Skeleton className="h-4 w-44 rounded-full" />
          <Skeleton className="h-12 w-72 max-w-full rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4">
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-9 w-full rounded-full col-span-2 sm:col-span-1" />
          </div>
        </div>
        <div className="xl:col-span-5 luma-hero relative overflow-hidden p-6 sm:p-8 space-y-5">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-10 w-56 max-w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Net Worth — smoked glass charcoal, ambient ember glow, Ivory numerals */}
        <section aria-label="Total kekayaan bersih" className="xl:col-span-7 luma-hero relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
          <div aria-hidden="true" className="luma-ember-glow absolute -top-24 -right-24 w-96 h-96" />
          <div aria-hidden="true" className="luma-ember-glow absolute -bottom-32 -left-16 w-72 h-72 opacity-60" />

          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-luma-smoke uppercase tracking-[0.12em] truncate">
                Total Kekayaan Bersih
              </span>
              <span className="text-xs font-sans font-semibold text-luma-smoke px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] shrink-0 whitespace-nowrap tabular-nums">
                Seluruh {accountCount} Rekening
              </span>
            </div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-luma-ivory my-3 font-sans tabular-nums break-words">
              {formatRupiah(totalBalance)}{" "}
              <span className="text-sm sm:text-base font-normal text-luma-smoke tracking-normal">
                IDR
              </span>
            </div>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-4 border-t border-white/[0.1]">
            <span className="inline-flex items-center gap-1.5 text-luma-sage font-sans font-semibold whitespace-nowrap min-w-0 bg-luma-sage/10 border border-luma-sage/25 px-3 py-2 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate tabular-nums">{formatRupiah(income)} masuk</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-luma-coral font-sans font-semibold whitespace-nowrap min-w-0 bg-luma-coral/10 border border-luma-coral/25 px-3 py-2 rounded-full">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate tabular-nums">{formatRupiah(expense)} keluar</span>
            </span>
            <span className="col-span-2 sm:col-span-1 inline-flex items-center gap-1.5 text-luma-smoke font-sans font-semibold whitespace-nowrap min-w-0 bg-white/[0.05] border border-white/[0.08] px-3 py-2 rounded-full">
              <span className="truncate tabular-nums">Net: {formatRupiah(income - expense)}</span>
            </span>
          </div>
        </section>

        {/* Safe-to-Spend — smoked glass with warm Ember accent, Ivory numerals */}
        <section
          aria-label="Batas belanja harian"
          className="xl:col-span-5 relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between rounded-[28px] border border-luma-ember/40 shadow-luma-glass"
          style={{
            background: "linear-gradient(135deg, rgba(240,138,75,0.16) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.06) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div aria-hidden="true" className="luma-ember-glow absolute -top-20 -right-20 w-72 h-72" />

          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-luma-ivory uppercase tracking-[0.12em] flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-4 h-4 text-luma-ember shrink-0" aria-hidden="true" />
                <span className="truncate">Batas Belanja Harian</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-3 py-1.5 rounded-full border shrink-0 whitespace-nowrap ${
                  isWarning
                    ? "bg-luma-gold/15 text-luma-gold border-luma-gold/40"
                    : "bg-luma-sage/10 text-luma-sage border-luma-sage/30"
                }`}
              >
                <Wallet className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {paceLabel}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-semibold tracking-tight text-luma-ivory my-3 font-sans tabular-nums break-words">
              {formatRupiah(safeDaily)}{" "}
              <span className="text-sm sm:text-base font-semibold text-luma-smoke tracking-normal">
                / hari
              </span>
            </div>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-white/[0.12]">
            <div className="rounded-2xl bg-black/25 border border-white/[0.1] p-3 min-w-0">
              <div className="flex items-center justify-between text-xs text-luma-smoke font-semibold gap-1 uppercase tracking-wider">
                <span className="truncate">Sisa Kuota {pocketAccount}</span>
                {quotaPct !== null ? (
                  <span className="font-sans font-semibold px-1.5 py-0.5 rounded-md bg-luma-ember/15 text-luma-ember shrink-0 tabular-nums">
                    {quotaPct}%
                  </span>
                ) : null}
              </div>
              <div className="text-sm sm:text-base font-semibold font-sans text-luma-ivory mt-1 break-words tabular-nums">
                {formatRupiah(pocketRemaining)}
                {pocketBudget ? (
                  <span className="text-luma-smoke font-semibold text-xs font-sans">
                    {" "}/ {Math.round(pocketBudget / 1000)}k
                  </span>
                ) : null}
              </div>
            </div>
            <div className="rounded-2xl bg-black/25 border border-white/[0.1] p-3 min-w-0">
              <div className="text-xs text-luma-smoke font-semibold uppercase tracking-wider">
                Rentang Waktu
              </div>
              {periodEnded ? (
                <div className="text-sm sm:text-base font-semibold font-sans text-luma-gold mt-1">
                  Periode Berakhir
                </div>
              ) : (
                <div className="mt-1">
                  <div className="text-sm sm:text-base font-semibold font-sans text-luma-ivory leading-tight tabular-nums">
                    Hari {dayOfCycle} / {cycleDays}
                  </div>
                  <div className="text-xs font-semibold font-sans text-luma-smoke mt-0.5 tabular-nums">
                    Sisa {daysRemaining} hari
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Quick actions — primary Ivory CTA + smoked secondary, 44px targets */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={onAddTransaction}
          className="luma-touch flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-full bg-luma-ivory text-luma-charcoal hover:brightness-95 active:scale-[0.98] transition shadow-luma-glass cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.75] shrink-0" aria-hidden="true" />
          Catat Transaksi
        </button>
        <button
          type="button"
          onClick={onOpenPaycheck}
          className="luma-touch flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-full bg-white/[0.06] text-luma-ivory border border-white/[0.12] hover:bg-white/[0.1] hover:border-white/[0.2] active:scale-[0.98] transition cursor-pointer"
        >
          Laporan / Checklist Gajian
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
