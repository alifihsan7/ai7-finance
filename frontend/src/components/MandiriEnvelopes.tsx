import React from "react";
import { Skeleton } from "./ui/Skeleton";

interface MandiriEnvelopesProps {
  mandiriExpenses: {
    makan: number;
    jajan: number;
    laundry: number;
    galon: number;
  };
  formatRupiah: (val: number) => string;
  cycleDays?: number;
  pocketAccount?: string;
  pocketBudget?: number;
  loading?: boolean;
}

export function MandiriEnvelopes({
  mandiriExpenses,
  formatRupiah,
  cycleDays = 14,
  pocketAccount = "Saku Belanja",
  pocketBudget,
  loading,
}: MandiriEnvelopesProps) {
  const totalPlafond = pocketBudget && pocketBudget > 0 ? pocketBudget : 0;

  // Round envelope limits to nearest thousand IDR to avoid awkward fractions
  const roundToThousand = (val: number) => Math.round(val / 1000) * 1000;

  const envelopes = [
    {
      title: "Makan Harian",
      limit: totalPlafond > 0 ? roundToThousand(totalPlafond * 0.55) : 0,
      spent: mandiriExpenses.makan,
    },
    {
      title: "Jajan & Kopi",
      limit: totalPlafond > 0 ? roundToThousand(totalPlafond * 0.15) : 0,
      spent: mandiriExpenses.jajan,
    },
    {
      title: "Laundry",
      limit: totalPlafond > 0 ? roundToThousand(totalPlafond * 0.15) : 0,
      spent: mandiriExpenses.laundry,
    },
    {
      title: "Galon & Air",
      limit: totalPlafond > 0 ? roundToThousand(totalPlafond * 0.15) : 0,
      spent: mandiriExpenses.galon,
    },
  ];

  if (loading) {
    return (
      <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <Skeleton className="w-56 h-5 rounded-full" />
            <Skeleton className="w-80 h-3.5 rounded-full mt-1.5" />
          </div>
          <Skeleton className="w-28 h-6 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex justify-between items-center gap-2">
                <Skeleton className="w-24 h-4 rounded-full" />
                <Skeleton className="w-10 h-4 rounded-full" />
              </div>
              <div>
                <Skeleton className="w-28 h-6 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-full mt-1.5" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.08]">
                <Skeleton className="w-16 h-3 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Amplop Belanja {pocketAccount} {totalPlafond > 0 ? `(Plafon ${formatRupiah(totalPlafond)})` : "(Monitoring Saku Harian)"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Monitoring limit pos belanja harian agar pengeluaran terkontrol sampai siklus berikutnya
          </p>
        </div>
        <span className="text-xs text-amberGold font-mono font-semibold px-3 py-1 rounded-full bg-amberGold/15 border border-amberGold/30 shrink-0 self-start sm:self-center">
          Reset Tiap {cycleDays} Hari
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {envelopes.map((env) => {
          const rem = env.limit > 0 ? env.limit - env.spent : 0;
          const pct = env.limit > 0 ? Math.min(100, Math.round((env.spent / env.limit) * 100)) : 0;

          return (
            <div
              key={env.title}
              className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="relative group/env min-w-0 flex-1">
                    <span className="text-white font-semibold text-sm truncate block cursor-default">
                      {env.title}
                    </span>
                    {/* Tooltip Hover Amplop */}
                    <div className="pointer-events-none absolute left-0 top-full mt-1 z-40 hidden group-hover/env:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111217]/95 backdrop-blur-md border border-white/[0.12] text-white text-xs shadow-2xl shadow-black/80 w-max max-w-[260px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="w-1.5 h-1.5 rounded-full bg-amberGold shrink-0" />
                      <span className="font-semibold text-white">{env.title}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${
                      pct >= 90
                        ? "bg-coralFall/10 border-coralFall/30 text-coralFall"
                        : pct >= 75
                        ? "bg-amberGold/10 border-amberGold/30 text-amberGold"
                        : "bg-white/[0.06] border-white/[0.08] text-zinc-300"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>

                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                    {formatRupiah(rem)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">Sisa saldo pos</div>
                </div>

                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-500 rounded-full ${
                      pct >= 90 ? "bg-coralFall" : pct >= 75 ? "bg-amberGold" : "bg-mintRise"
                    }`}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pt-3 border-t border-white/[0.08] gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-zinc-500 text-[11px]">Limit:</span>
                  <span className="font-semibold text-zinc-300 text-[11px] whitespace-nowrap">{formatRupiah(env.limit)}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-zinc-500 text-[11px]">Pakai:</span>
                  <span className={`font-semibold text-[11px] whitespace-nowrap ${pct >= 90 ? "text-coralFall font-bold" : "text-zinc-300"}`}>
                    {formatRupiah(env.spent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}