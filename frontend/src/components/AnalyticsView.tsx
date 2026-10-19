import React, { useState } from "react";
import {
  TrendingUp,
  PiggyBank,
  Wallet,
  Utensils,
  Coffee,
  Shirt,
  Droplet,
  Repeat,
  ShoppingBag,
  Zap,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { BurnRateChart } from "./BurnRateChart";
import { Skeleton } from "./ui/Skeleton";

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface DailyTrendItem {
  date: string;
  income: number;
  expense: number;
}

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
  days_remaining: number;
  pocket_spent: number;
  safe_daily: number;
  pace_status: string;
  ideal_pace_today: number;
  burn_chart: CycleBurnDay[];
}

export interface AnalyticsSummary {
  period_type: string;
  period_label: string;
  start_date: string;
  end_date: string;
  month: string;
  year: number;
  month_num: number;
  income: number;
  expense: number;
  net: number;
  savings_rate: number;
  categories: CategorySummary[];
  accounts: {
    name: string;
    type: string;
    balance: number;
    expense?: number;
  }[];
  total_balance: number;
  daily_trend: DailyTrendItem[];
  safe_to_spend?: SafeToSpendInfo;
}

interface AnalyticsViewProps {
  summary: AnalyticsSummary;
  formatRupiah: (val: number) => string;
  loading?: boolean;
}

export function AnalyticsView({ summary, formatRupiah, loading }: AnalyticsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<"all" | "major" | "minor">("all");

  const safe = summary.safe_to_spend;
  const cycleDays = safe?.cycle_days || 14;
  const dayOfCycle = safe?.day_of_cycle || 1;
  const daysRemaining = safe?.days_remaining || 0;
  const pocketBudget = safe?.pocket_budget || 825000;
  const pocketSpent = safe?.pocket_spent || 0;
  const safeDaily = safe?.safe_daily || 0;
  const paceStatus = safe?.pace_status || "on_track";

  // Calculate actual daily average spend for elapsed days
  const actualDailyAvg = dayOfCycle > 0 ? Math.round(pocketSpent / dayOfCycle) : 0;
  const idealDailyAvg = cycleDays > 0 ? Math.round(pocketBudget / cycleDays) : 0;

  // Format date helper
  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return "-";
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

  // Helper for category icons & styling
  const getCategoryMeta = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("makan") || lower.includes("food")) {
      return {
        icon: Utensils,
        color: "text-amberGold",
        bg: "bg-amberGold/10",
        border: "border-amberGold/30",
        barColor: "bg-amberGold",
      };
    }
    if (lower.includes("jajan") || lower.includes("kopi") || lower.includes("coffee")) {
      return {
        icon: Coffee,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/30",
        barColor: "bg-amber-400",
      };
    }
    if (lower.includes("laundry") || lower.includes("cuci")) {
      return {
        icon: Shirt,
        color: "text-sky-400",
        bg: "bg-sky-400/10",
        border: "border-sky-400/30",
        barColor: "bg-sky-400",
      };
    }
    if (lower.includes("galon") || lower.includes("air") || lower.includes("water")) {
      return {
        icon: Droplet,
        color: "text-cyan-400",
        bg: "bg-cyan-400/10",
        border: "border-cyan-400/30",
        barColor: "bg-cyan-400",
      };
    }
    if (lower.includes("langganan") || lower.includes("sub") || lower.includes("tagihan")) {
      return {
        icon: Repeat,
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        border: "border-purple-400/30",
        barColor: "bg-purple-400",
      };
    }
    if (lower.includes("belanja") || lower.includes("shop")) {
      return {
        icon: ShoppingBag,
        color: "text-pink-400",
        bg: "bg-pink-400/10",
        border: "border-pink-400/30",
        barColor: "bg-pink-400",
      };
    }
    if (lower.includes("listrik") || lower.includes("pulsa") || lower.includes("utilitas")) {
      return {
        icon: Zap,
        color: "text-yellow-400",
        bg: "bg-yellow-400/10",
        border: "border-yellow-400/30",
        barColor: "bg-yellow-400",
      };
    }
    return {
      icon: Tag,
      color: "text-slateText-secondary",
      bg: "bg-obsidian-panel",
      border: "border-obsidian-border",
      barColor: "bg-slate-400",
    };
  };

  // Filtered categories
  const filteredCategories = summary.categories.filter((c) => {
    if (categoryFilter === "major") return c.percentage >= 15;
    if (categoryFilter === "minor") return c.percentage < 15;
    return true;
  });

  // Find peak daily spend
  const peakDay = summary.daily_trend.reduce(
    (max, cur) => (cur.expense > max.expense ? cur : max),
    { date: "", expense: 0, income: 0 }
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. TOP METRICS KPI CARDS (Financial Health Matrix) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Pemasukan */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-obsidian-borderStrong transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slateText-secondary font-medium">Total Pemasukan Siklus</span>
            <div className="w-8 h-8 rounded-lg bg-mintRise/10 border border-mintRise/20 flex items-center justify-center text-mintRise">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-32 rounded-md" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-slateText-primary tracking-tight">
                {formatRupiah(summary.income)}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slateText-secondary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-mintRise"></span>
              <span>100% basis alokasi</span>
            </div>
          </div>
          <div className="pt-2 border-t border-obsidian-border/50 flex items-center justify-between text-[11px] text-slateText-muted">
            <span>Periode aktif</span>
            <span className="font-mono text-slateText-secondary">{formatDateIndo(summary.start_date)} – {formatDateIndo(summary.end_date)}</span>
          </div>
        </div>

        {/* Card 2: Total Pengeluaran */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-obsidian-borderStrong transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slateText-secondary font-medium">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-coralFall/10 border border-coralFall/20 flex items-center justify-center text-coralFall">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-32 rounded-md" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-slateText-primary tracking-tight">
                {formatRupiah(summary.expense)}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slateText-secondary font-mono">
              <span>Rasio belanja:</span>
              <strong className="text-slateText-primary">
                {summary.income > 0 ? ((summary.expense / summary.income) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>
          <div className="pt-2 border-t border-obsidian-border/50 flex items-center justify-between text-[11px] text-slateText-muted">
            <span>Rata-rata / hari</span>
            <span className="font-mono text-slateText-secondary">{formatRupiah(actualDailyAvg)} / hari</span>
          </div>
        </div>

        {/* Card 3: Net Cashflow / Sisa */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-obsidian-borderStrong transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slateText-secondary font-medium">Net Surplus Dana</span>
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
              summary.net >= 0
                ? "bg-mintRise/10 border-mintRise/20 text-mintRise"
                : "bg-coralFall/10 border-coralFall/20 text-coralFall"
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-32 rounded-md" />
            ) : (
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                summary.net >= 0 ? "text-mintRise" : "text-coralFall"
              }`}>
                {summary.net < 0 ? `-${formatRupiah(Math.abs(summary.net))}` : formatRupiah(summary.net)}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slateText-secondary font-mono">
              <span>Status arus kas:</span>
              <strong className={summary.net >= 0 ? "text-mintRise" : "text-coralFall"}>
                {summary.net >= 0 ? "Surplus Positif" : "Defisit Terjadi"}
              </strong>
            </div>
          </div>
          <div className="pt-2 border-t border-obsidian-border/50 flex items-center justify-between text-[11px] text-slateText-muted">
            <span>Sisa kuota harian</span>
            <span className="font-mono text-amberGold font-semibold">{formatRupiah(safeDaily)} / hari</span>
          </div>
        </div>

        {/* Card 4: Savings & Investment Rate */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-obsidian-borderStrong transition-colors shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slateText-secondary font-medium">Savings & Portfolio Rate</span>
            <div className="w-8 h-8 rounded-lg bg-amberGold/10 border border-amberGold/20 flex items-center justify-center text-amberGold">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-24 rounded-md" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono text-amberGold tracking-tight">
                {summary.savings_rate.toFixed(1)}%
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slateText-secondary font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amberGold"></span>
              {summary.savings_rate >= 20 ? "Target tercapai (≥20%)" : "Di bawah target (target 20%)"}
            </div>
          </div>
          <div className="pt-2 border-t border-obsidian-border/50 flex items-center justify-between text-[11px] text-slateText-muted">
            <span>Benchmark sehat</span>
            <span className="font-mono text-slateText-secondary">≥ 20% Income</span>
          </div>
        </div>
      </div>

      {/* 2. BURN-RATE TRAJECTORY CHART (Integrated interactive component) */}
      <BurnRateChart summary={summary} formatRupiah={formatRupiah} />

      {/* 3. DAILY SPENDING ACTIVITY & PULSE */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-mintRise" />
              <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
                Aktivitas Belanja Harian (Daily Spend Pulse)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
              Distribusi pengeluaran per hari sepanjang periode untuk mendeteksi lonjakan biaya
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            {peakDay.expense > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-coralFall/10 border border-coralFall/30 text-coralFall">
                Puncak: {formatDateIndo(peakDay.date)} ({formatRupiah(peakDay.expense)})
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-obsidian-panel border border-obsidian-border text-slateText-secondary">
              Ideal: {formatRupiah(idealDailyAvg)}/hari
            </span>
          </div>
        </div>

        {summary.daily_trend.length === 0 ? (
          <div className="text-center py-10 text-xs sm:text-sm text-slateText-muted font-mono">
            Belum ada aktivitas transaksi pada rentang periode ini.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Bars Container */}
            <div className="flex items-end gap-1.5 sm:gap-2 h-36 pt-6 px-1 border-b border-obsidian-border overflow-visible relative">
              {summary.daily_trend.map((d, idx) => {
                const maxVal = Math.max(...summary.daily_trend.map((t) => t.expense), idealDailyAvg, 1);
                const heightPct = Math.min(100, Math.max(8, Math.round((d.expense / maxVal) * 100)));
                const isOver = d.expense > idealDailyAvg * 1.25;
                const isZero = d.expense === 0;

                // Smart tooltip alignment to prevent edge clipping
                const isLeftEdge = idx <= 1;
                const isRightEdge = idx >= summary.daily_trend.length - 2;
                const alignClass = isLeftEdge ? "left-0" : isRightEdge ? "right-0" : "left-1/2 -translate-x-1/2";

                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className={`opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 z-30 ${alignClass} w-44 p-2.5 bg-obsidian-panel/95 backdrop-blur-md border border-obsidian-borderStrong rounded-xl shadow-xl text-[11px] font-mono space-y-1 transition-opacity`}>
                      <div className="font-bold text-slateText-primary border-b border-obsidian-border pb-1">
                        {formatDateIndo(d.date)}
                      </div>
                      <div className="flex justify-between text-slateText-secondary">
                        <span>Pengeluaran:</span>
                        <span className={`font-semibold ${isOver ? "text-coralFall font-bold" : "text-slateText-primary"}`}>
                          {formatRupiah(d.expense)}
                        </span>
                      </div>
                      {d.income > 0 && (
                        <div className="flex justify-between text-mintRise">
                          <span>Pemasukan:</span>
                          <span className="font-bold">+{formatRupiah(d.income)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        isZero
                          ? "bg-obsidian-panel border border-obsidian-border/50"
                          : isOver
                          ? "bg-coralFall/80 group-hover:bg-coralFall"
                          : "bg-amberGold/80 group-hover:bg-amberGold"
                      }`}
                    ></div>

                    {/* Date label */}
                    <div className="mt-2 text-center select-none">
                      <span className="text-[9px] sm:text-[10px] font-mono text-slateText-muted block">
                        {d.date.slice(8)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between text-[11px] font-mono text-slateText-muted pt-1">
              <span>Awal Siklus ({formatDateIndo(summary.start_date)})</span>
              <span>Akhir Siklus ({formatDateIndo(summary.end_date)})</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. EXPENSE CATEGORY BREAKDOWN (Interactive Grid Cards) */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
              Distribusi Kategori Pengeluaran
            </h3>
            <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
              Rincian pos biaya, porsi terhadap total belanja, dan frekuensi transaksi
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-obsidian-panel rounded-lg border border-obsidian-border text-xs font-mono">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-md transition ${
                categoryFilter === "all"
                  ? "bg-amberGold/20 text-amberGold font-semibold"
                  : "text-slateText-muted hover:text-slateText-secondary"
              }`}
            >
              Semua ({summary.categories.length})
            </button>
            <button
              onClick={() => setCategoryFilter("major")}
              className={`px-3 py-1 rounded-md transition ${
                categoryFilter === "major"
                  ? "bg-amberGold/20 text-amberGold font-semibold"
                  : "text-slateText-muted hover:text-slateText-secondary"
              }`}
            >
              Utama (≥15%)
            </button>
            <button
              onClick={() => setCategoryFilter("minor")}
              className={`px-3 py-1 rounded-md transition ${
                categoryFilter === "minor"
                  ? "bg-amberGold/20 text-amberGold font-semibold"
                  : "text-slateText-muted hover:text-slateText-secondary"
              }`}
            >
              Lainnya (&lt;15%)
            </button>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-xs sm:text-sm text-slateText-muted font-mono">
            Tidak ada kategori yang sesuai dengan filter ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredCategories.map((c) => {
              const meta = getCategoryMeta(c.category);
              const Icon = meta.icon;
              const avgSpend = c.count > 0 ? Math.round(c.total / c.count) : 0;

              return (
                <div
                  key={c.category}
                  className="bg-obsidian-panel border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-4 space-y-3 transition-colors shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${meta.bg} ${meta.border} border flex items-center justify-center ${meta.color} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-slateText-primary block truncate">
                          {c.category}
                        </span>
                        <span className="text-[11px] font-mono text-slateText-muted block">
                          {c.count} transaksi • Rata-rata {formatRupiah(avgSpend)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-slateText-primary">
                        {formatRupiah(c.total)}
                      </div>
                      <span className={`text-[11px] font-mono font-semibold ${meta.color}`}>
                        {c.percentage.toFixed(1)}% dari total
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 bg-obsidian-border/60 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, c.percentage)}%` }}
                        className={`h-full ${meta.barColor} transition-all duration-500 rounded-full`}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SMART FINANCIAL INSIGHTS & PACING ADVISORY */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amberGold" />
          <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
            Evaluasi & Insight Cerdas Siklus
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Pacing Assessment */}
          <div className="p-4 rounded-xl bg-obsidian-panel border border-obsidian-border space-y-2">
            <div className="flex items-center gap-2">
              {paceStatus === "ahead" ? (
                <CheckCircle2 className="w-4 h-4 text-mintRise" />
              ) : paceStatus === "on_track" ? (
                <ShieldCheck className="w-4 h-4 text-amberGold" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-coralFall" />
              )}
              <span className="text-xs font-bold text-slateText-primary font-mono uppercase tracking-wider">
                Status Kecepatan Belanja: {paceStatus.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-slateText-secondary leading-relaxed">
              {paceStatus === "ahead"
                ? `Laju belanja Anda sangat terkontrol. Pengeluaran aktual (${formatRupiah(pocketSpent)}) berada di bawah target ideal kumulatif (${formatRupiah(safe?.ideal_pace_today || 0)}), memberikan peluang surplus di akhir siklus.`
                : paceStatus === "on_track"
                ? `Laju belanja stabil dan sesuai rencana. Batas aman harian Anda saat ini adalah ${formatRupiah(safeDaily)} / hari untuk ${daysRemaining} hari ke depan.`
                : `Perhatian: Akumulasi belanja telah melampaui target ideal kumulatif. Disarankan membatasi pengeluaran non-primer agar sisa kuota ${formatRupiah(safeDaily)} / hari mencukupi hingga siklus berakhir.`}
            </p>
          </div>

          {/* Box 2: Dominant Category & Efficiency */}
          <div className="p-4 rounded-xl bg-obsidian-panel border border-obsidian-border space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amberGold" />
              <span className="text-xs font-bold text-slateText-primary font-mono uppercase tracking-wider">
                Sorotan Beban Anggaran
              </span>
            </div>
            <p className="text-xs text-slateText-secondary leading-relaxed">
              {summary.categories.length > 0 ? (
                <>
                  Pos pengeluaran terbesar periode ini adalah{" "}
                  <strong className="text-slateText-primary">
                    {summary.categories[0].category}
                  </strong>{" "}
                  dengan total {formatRupiah(summary.categories[0].total)} (
                  {summary.categories[0].percentage.toFixed(1)}% dari seluruh belanja).
                  {summary.categories[0].percentage > 40 &&
                    " Pos ini mendominasi proporsi anggaran, pastikan alokasi harian tetap terjaga."}
                </>
              ) : (
                "Belum ada data transaksi yang cukup untuk mengevaluasi kategori dominan."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
