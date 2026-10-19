import React from "react";

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
}

export function MandiriEnvelopes({
  mandiriExpenses,
  formatRupiah,
  cycleDays = 14,
  pocketAccount = "Saku Belanja",
  pocketBudget,
}: MandiriEnvelopesProps) {
  const totalPlafond = pocketBudget && pocketBudget > 0 ? pocketBudget : 825000;
  const scale = totalPlafond / 825000;

  // Round envelope limits to nearest thousand IDR to avoid awkward fractions (e.g. Rp 455.455 -> Rp 455.000)
  const roundToThousand = (val: number) => Math.round(val / 1000) * 1000;

  const envelopes = [
    {
      title: "Makan Harian",
      limit: roundToThousand(450000 * scale),
      spent: mandiriExpenses.makan,
    },
    {
      title: "Jajan & Kopi",
      limit: roundToThousand(100000 * scale),
      spent: mandiriExpenses.jajan,
    },
    {
      title: "Laundry",
      limit: roundToThousand(70000 * scale),
      spent: mandiriExpenses.laundry,
    },
    {
      title: "Galon & Air",
      limit: roundToThousand(44000 * scale),
      spent: mandiriExpenses.galon,
    },
  ];

  return (
    <div className="bg-obsidian-panel border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary">
            Amplop Belanja {pocketAccount} (Plafon {formatRupiah(totalPlafond)})
          </h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Monitoring limit pos belanja harian agar pengeluaran terkontrol sampai siklus berikutnya
          </p>
        </div>
        <span className="text-xs text-amberGold font-mono font-semibold px-3 py-1 rounded-lg bg-amberGold/15 border border-amberGold/30 shrink-0 self-start sm:self-center">
          Reset Tiap {cycleDays} Hari
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {envelopes.map((env) => {
          const rem = env.limit - env.spent;
          const pct = Math.min(100, Math.round((env.spent / env.limit) * 100));
          return (
            <div
              key={env.title}
              className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-4 sm:p-4.5 space-y-3 flex flex-col justify-between transition-colors shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="relative group/env min-w-0 flex-1">
                    <span className="text-slateText-primary font-semibold text-sm truncate block cursor-default">
                      {env.title}
                    </span>
                    {/* Tooltip Hover Amplop */}
                    <div className="pointer-events-none absolute left-0 top-full mt-1 z-40 hidden group-hover/env:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12151D]/95 backdrop-blur-md border border-obsidian-borderStrong text-slateText-primary text-xs shadow-2xl shadow-black/80 w-max max-w-[260px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="w-1.5 h-1.5 rounded-full bg-amberGold shrink-0" />
                      <span className="font-semibold text-slate-100">{env.title}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                      pct >= 90
                        ? "bg-coralFall/10 border-coralFall/30 text-coralFall"
                        : pct >= 75
                        ? "bg-amberGold/10 border-amberGold/30 text-amberGold"
                        : "bg-obsidian-panel border-obsidian-border text-slateText-secondary"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>

                <div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slateText-primary tracking-tight">
                    {formatRupiah(rem)}
                  </div>
                  <div className="text-xs text-slateText-secondary mt-0.5">Sisa saldo pos</div>
                </div>

                <div className="h-1.5 bg-obsidian-border/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-500 rounded-full ${
                      pct >= 90 ? "bg-coralFall" : pct >= 75 ? "bg-amberGold" : "bg-mintRise"
                    }`}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slateText-muted font-mono pt-2.5 border-t border-obsidian-border/50 gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-slateText-muted text-[11px]">Limit:</span>
                  <span className="font-medium text-slateText-secondary text-[11px] whitespace-nowrap">{formatRupiah(env.limit)}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-slateText-muted text-[11px]">Pakai:</span>
                  <span className={`font-medium text-[11px] whitespace-nowrap ${pct >= 90 ? "text-coralFall font-bold" : "text-slateText-secondary"}`}>
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