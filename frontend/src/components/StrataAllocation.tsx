import React from "react";
import { Skeleton } from "./ui/Skeleton";

export interface BucketAllocationItem {
  account: string;
  percentage: number;
  purpose?: string;
}

interface StrataAllocationBarProps {
  cycleType?: string;
  cycleDays?: number;
  totalSalary?: number;
  buckets?: BucketAllocationItem[];
  formatRupiah?: (val: number) => string;
  loading?: boolean;
}

const ACCOUNT_COLORS: Record<string, { bar: string; border: string; text: string }> = {
  "Kebutuhan Pokok": { bar: "bg-amberGold", border: "border-amberGold", text: "text-amberGold" },
  "Tagihan & Rutin": { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  "Tabungan & Investasi": { bar: "bg-teal-500", border: "border-teal-500", text: "text-teal-400" },
  "Dana Darurat": { bar: "bg-cyanHub", border: "border-cyanHub", text: "text-cyanHub" },
  "Mandiri": { bar: "bg-amberGold", border: "border-amberGold", text: "text-amberGold" },
  "Bank Jago": { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  "Jago": { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  "Bibit": { bar: "bg-teal-500", border: "border-teal-500", text: "text-teal-400" },
  "BRI 1": { bar: "bg-cyanHub", border: "border-cyanHub", text: "text-cyanHub" },
  "BRI 2": { bar: "bg-coralFall", border: "border-coralFall", text: "text-coralFall" },
};

const COLOR_PALETTE = [
  { bar: "bg-amberGold", border: "border-amberGold", text: "text-amberGold" },
  { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  { bar: "bg-teal-500", border: "border-teal-500", text: "text-teal-400" },
  { bar: "bg-cyanHub", border: "border-cyanHub", text: "text-cyanHub" },
  { bar: "bg-blue-500", border: "border-blue-500", text: "text-blue-400" },
  { bar: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400" },
  { bar: "bg-coralFall", border: "border-coralFall", text: "text-coralFall" },
];

function getBucketColor(account: string, idx: number) {
  if (ACCOUNT_COLORS[account]) return ACCOUNT_COLORS[account];
  return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

const DEFAULT_BUCKETS: BucketAllocationItem[] = [
  { account: "Rekening Utama", percentage: 50.0, purpose: "Belanja & Operasional" },
  { account: "Tabungan", percentage: 30.0, purpose: "Simpanan & Cadangan" },
  { account: "Investasi", percentage: 20.0, purpose: "Pertumbuhan Aset" },
];

export function StrataAllocationBar({
  cycleType = "biweekly",
  cycleDays = 14,
  totalSalary,
  buckets = DEFAULT_BUCKETS,
  formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`,
  loading,
}: StrataAllocationBarProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <Skeleton className="w-48 h-5 rounded-md" />
            <Skeleton className="w-72 h-3.5 rounded-md mt-1.5" />
          </div>
          <Skeleton className="w-36 h-6 rounded-lg" />
        </div>
        <Skeleton className="w-full h-6 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-obsidian-card border border-obsidian-border space-y-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-md" />
              </div>
              <Skeleton className="w-20 h-4 rounded-md" />
              <Skeleton className="w-12 h-3 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Determine standard baseline salary based on cycle duration if explicitly passed
  const effectiveSalary = totalSalary && totalSalary > 0 ? totalSalary : 0;

  // Determine friendly formula badge
  const formulaLabel = cycleDays === 30 || cycleType === "monthly" || cycleType === "monthly_date"
    ? `Formula Bulanan (${cycleDays} Hari)`
    : cycleDays === 7 || cycleType === "weekly"
    ? "Formula Mingguan (7 Hari)"
    : cycleDays === 14 || cycleType === "biweekly"
    ? "Formula 2-Mingguan (14 Hari)"
    : `Formula Anggaran (${cycleDays} Hari)`;

  const activeBuckets = buckets && buckets.length > 0 ? buckets : DEFAULT_BUCKETS;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary">Distribusi Alokasi Anggaran</h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            {effectiveSalary > 0
              ? `Alokasi anggaran ${formatRupiah(effectiveSalary)} / ${cycleDays} hari dipecah ke ${activeBuckets.length} pos rekening`
              : `Proporsi alokasi dipecah ke ${activeBuckets.length} pos rekening sesuai rasio alur gajian`}
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-amberGold px-3 py-1 rounded-lg bg-amberGold/15 border border-amberGold/30 shrink-0 self-start sm:self-center">
          {formulaLabel}
        </span>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="flex gap-1.5 h-6 rounded-lg overflow-hidden p-1 bg-obsidian-panel border border-obsidian-border shadow-inner">
        {activeBuckets.map((b, idx) => {
          const color = getBucketColor(b.account, idx);
          const isFirst = idx === 0;
          const isLast = idx === activeBuckets.length - 1;
          const showText = b.percentage >= 4;

          return (
            <div
              key={b.account}
              style={{ flex: b.percentage }}
              className={`${color.bar} ${isFirst ? "rounded-l-md" : ""} ${isLast ? "rounded-r-md" : ""} transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold shadow-xs`}
              title={`${b.account}: ${b.percentage.toFixed(1)}%`}
            >
              {showText ? (
                <span className={`text-[10px] leading-none select-none font-bold ${b.account === "Mandiri" ? "text-slate-950 font-black" : "text-white drop-shadow-xs"}`}>
                  {b.percentage < 10 ? b.percentage.toFixed(1) : Math.round(b.percentage)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Account Cards Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
        {activeBuckets.map((b, idx) => {
          const color = getBucketColor(b.account, idx);
          const allocatedAmt = Math.round((b.percentage / 100) * effectiveSalary);
          const shortPurpose = b.purpose
            ? b.purpose.split("(")[0].trim()
            : "Alokasi Pos";

          return (
            <div
              key={b.account}
              className={`border-l-2 ${color.border} pl-3 py-0.5 min-w-0`}
            >
              <div className="text-slateText-primary font-semibold text-xs sm:text-sm truncate">
                {b.account} ({b.percentage.toFixed(1)}%)
              </div>
              <div className="text-slateText-secondary font-mono text-[11px] sm:text-xs mt-0.5 truncate">
                {effectiveSalary > 0
                  ? `${formatRupiah(allocatedAmt)} • ${shortPurpose}`
                  : `${b.percentage.toFixed(1)}% • ${shortPurpose}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}