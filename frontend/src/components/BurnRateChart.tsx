import React from "react";
import { Flame } from "lucide-react";

interface CycleBurnDay {
  day: number;
  date: string;
  spent: number;
  cumulative_spent: number;
  ideal_pace: number;
}

interface SafeToSpendInfo {
  cycle_start?: string;
  cycle_end?: string;
  cycle_type?: string;
  cycle_days?: number;
  pocket_account?: string;
  pocket_budget?: number;
  day_of_cycle: number;
  pocket_spent: number;
  ideal_pace_today: number;
  burn_chart: CycleBurnDay[];
}

interface BurnRateChartProps {
  summary: {
    safe_to_spend?: SafeToSpendInfo;
  };
  formatRupiah: (val: number) => string;
}

export function BurnRateChart({ summary, formatRupiah }: BurnRateChartProps) {
  const chartData = summary.safe_to_spend?.burn_chart || [];
  const dayOfCycle = summary.safe_to_spend?.day_of_cycle || 1;
  const cycleDays = summary.safe_to_spend?.cycle_days || (chartData.length > 0 ? chartData.length : 14);
  const pocketAccount = summary.safe_to_spend?.pocket_account || "Mandiri";
  const maxBudget = summary.safe_to_spend?.pocket_budget && summary.safe_to_spend.pocket_budget > 0
    ? summary.safe_to_spend.pocket_budget
    : 825000;
  const idealDailyRate = Math.round(maxBudget / (cycleDays || 14));

  // Dynamic grid class based on number of days
  const getGridColsClass = (count: number) => {
    if (count <= 7) return "grid-cols-7";
    if (count <= 14) return "grid-cols-7 sm:grid-cols-14";
    if (count <= 21) return "grid-cols-7 sm:grid-cols-21";
    return "grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-30";
  };

  const formatTooltipDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-").map(Number);
      if (parts.length === 3) {
        const [, m, d] = parts;
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        return `${d} ${months[m - 1] || ""}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Smart horizontal alignment to prevent tooltip from clipping on left/right edges
  const getTooltipAlignClass = (dayNum: number, totalDays: number) => {
    // In a 7-col row (mobile or 14-day 2-row layout)
    const colInRow = (dayNum - 1) % 7;
    const isFirstCols = colInRow <= 1;
    const isLastCols = colInRow >= 5;

    // Desktop multi-column check
    const isDesktopLeft = dayNum <= 2;
    const isDesktopRight = totalDays > 7 && dayNum >= totalDays - 2;

    if (isFirstCols) {
      return isDesktopLeft ? "left-0" : "left-0 sm:left-1/2 sm:-translate-x-1/2";
    }
    if (isLastCols) {
      return isDesktopRight ? "right-0" : "right-0 sm:left-1/2 sm:-translate-x-1/2";
    }
    return "left-1/2 -translate-x-1/2";
  };

  return (
    <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amberGold" />
            <h2 className="text-base sm:text-lg font-bold text-slateText-primary">
              Burn-Rate Trajectory (Siklus {cycleDays} Hari)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Monitoring akumulasi belanja {pocketAccount} harian vs batas ideal anggaran {formatRupiah(maxBudget)}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-slateText-secondary">
            <span className="w-2.5 h-2.5 rounded-sm bg-amberGold inline-block"></span>
            Kumulatif Riil
          </span>
          <span className="flex items-center gap-1.5 text-slateText-secondary">
            <span className="w-2.5 h-0.5 bg-slateText-muted inline-block"></span>
            Batas Target Ideal
          </span>
        </div>
      </div>

      <div className="overflow-visible relative pb-2">
        <div className={`grid ${getGridColsClass(chartData.length)} gap-1.5 sm:gap-2 pt-4 border-t border-obsidian-border/80 w-full`}>
          {chartData.map((b) => {
            const isToday = b.day === dayOfCycle;
            const isPastOrToday = b.day <= dayOfCycle;
            const idealHeight = Math.min(100, Math.round((b.ideal_pace / maxBudget) * 100));
            const actualHeight = Math.min(100, Math.round((b.cumulative_spent / maxBudget) * 100));

            return (
              <div
                key={b.day}
                className={`flex flex-col items-center group relative rounded-lg p-1 transition-all ${
                  isToday
                    ? "bg-amberGold/10 border border-amberGold/30"
                    : "hover:bg-obsidian-hover border border-transparent"
                }`}
              >
                <div className={`opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 z-30 ${getTooltipAlignClass(b.day, chartData.length)} w-48 sm:w-52 p-3 bg-obsidian-panel/95 backdrop-blur-md border border-obsidian-borderStrong rounded-xl shadow-2xl text-[11px] font-mono space-y-2 transition-opacity`}>
                  <div className="flex items-center justify-between border-b border-obsidian-border pb-1.5">
                    <span className="font-bold text-slateText-primary">Hari ke-{b.day}</span>
                    <span className="text-[10px] text-slateText-secondary font-medium">({formatTooltipDate(b.date)})</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slateText-secondary">Hari Ini:</span>
                      <span className={`font-semibold ${b.spent > idealDailyRate * 1.25 ? "text-coralFall font-bold" : "text-slateText-primary"}`}>
                        {formatRupiah(b.spent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slateText-secondary">Kumulatif:</span>
                      <span className={`font-bold ${b.cumulative_spent > b.ideal_pace ? "text-amberGold" : "text-mintRise"}`}>
                        {formatRupiah(b.cumulative_spent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slateText-secondary">Target Ideal:</span>
                      <span className="text-slateText-secondary font-medium">
                        {formatRupiah(b.ideal_pace)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full h-28 sm:h-32 bg-obsidian-panel rounded flex items-end relative overflow-hidden">
                  <div
                    style={{ bottom: `${idealHeight}%` }}
                    className="absolute left-0 right-0 border-b border-dashed border-slateText-muted/60 z-10"
                  ></div>
                  {isPastOrToday && (
                    <div
                      style={{ height: `${actualHeight}%` }}
                      className={`w-full transition-all duration-500 rounded-b ${
                        actualHeight > idealHeight
                          ? "bg-coralFall/80 group-hover:bg-coralFall"
                          : "bg-amberGold/80 group-hover:bg-amberGold"
                      }`}
                    ></div>
                  )}
                </div>

                <div className="mt-1.5 text-center">
                  <span
                    className={`text-[10px] sm:text-[11px] font-mono font-medium block ${
                      isToday ? "text-amberGold font-bold" : "text-slateText-secondary"
                    }`}
                  >
                    D{b.day}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-slateText-muted block font-mono">
                    {b.date.slice(8)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-obsidian-border/80 text-xs font-mono text-slateText-secondary">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span>Kecepatan Target:</span>
          <strong className="text-slateText-primary">{formatRupiah(idealDailyRate)} / hari</strong>
        </div>
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span>Kumulatif Target Hari Ini:</span>
          <strong className="text-slateText-primary">
            {formatRupiah(summary.safe_to_spend?.ideal_pace_today || 0)}
          </strong>
        </div>
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span>Realisasi Saat Ini:</span>
          <strong
            className={
              (summary.safe_to_spend?.pocket_spent || 0) >
              (summary.safe_to_spend?.ideal_pace_today || 0)
                ? "text-coralFall font-bold"
                : "text-mintRise font-bold"
            }
          >
            {formatRupiah(summary.safe_to_spend?.pocket_spent || 0)}
          </strong>
        </div>
      </div>
    </div>
  );
}