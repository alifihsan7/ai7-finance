import React from "react";

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
}

const ACCOUNT_COLORS: Record<string, { bar: string; border: string; text: string }> = {
  "Mandiri": { bar: "bg-amberGold", border: "border-amberGold", text: "text-amberGold" },
  "Bank Jago": { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  "Jago": { bar: "bg-purple-500", border: "border-purple-500", text: "text-purple-400" },
  "Bibit": { bar: "bg-teal-500", border: "border-teal-500", text: "text-teal-400" },
  "BRI 1": { bar: "bg-cyanHub", border: "border-cyanHub", text: "text-cyanHub" },
  "BRI 2": { bar: "bg-purpleLock", border: "border-purpleLock", text: "text-purpleLock" },
};

const DEFAULT_BUCKETS: BucketAllocationItem[] = [
  { account: "Mandiri", percentage: 55.0, purpose: "Saku Harian" },
  { account: "Bank Jago", percentage: 18.3, purpose: "Subs & Bills" },
  { account: "Bibit", percentage: 13.3, purpose: "Portofolio" },
  { account: "BRI 1", percentage: 6.7, purpose: "Hub & Darurat" },
  { account: "BRI 2", percentage: 6.7, purpose: "Tabungan Kunci" },
];

export function StrataAllocationBar({
  cycleType = "biweekly",
  cycleDays = 14,
  totalSalary,
  buckets = DEFAULT_BUCKETS,
  formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`,
}: StrataAllocationBarProps) {
  // Determine standard baseline salary based on cycle duration if not explicitly passed
  const effectiveSalary = totalSalary && totalSalary > 0
    ? totalSalary
    : (cycleDays === 30 || cycleType === "monthly" ? 3000000 : 1500000);

  // Determine friendly formula badge
  const formulaLabel = cycleDays === 30 || cycleType === "monthly"
    ? "Monthly Formula (30 Hari)"
    : cycleDays === 7 || cycleType === "weekly"
    ? "Weekly Formula (7 Hari)"
    : cycleDays === 14 || cycleType === "biweekly"
    ? "Bi-Weekly Formula (14 Hari)"
    : `Formula ${cycleDays} Hari`;

  const activeBuckets = buckets && buckets.length > 0 ? buckets : DEFAULT_BUCKETS;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary">Distribusi Alokasi Anggaran</h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Plafon standar {formatRupiah(effectiveSalary)} / {cycleDays} hari langsung dipecah ke {activeBuckets.length} pos rekening & portofolio
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-amberGold px-2.5 py-1 rounded bg-amberGold/10 border border-amberGold/20 shrink-0 self-start sm:self-auto">
          {formulaLabel}
        </span>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="flex gap-1.5 h-6 rounded-lg overflow-hidden p-1 bg-obsidian-panel border border-obsidian-border">
        {activeBuckets.map((b, idx) => {
          const color = ACCOUNT_COLORS[b.account] || { bar: "bg-blue-500", border: "border-blue-500", text: "text-blue-400" };
          const isFirst = idx === 0;
          const isLast = idx === activeBuckets.length - 1;
          const showText = b.percentage >= 10;

          return (
            <div
              key={b.account}
              style={{ flex: b.percentage }}
              className={`${color.bar} ${isFirst ? "rounded-l-md" : ""} ${isLast ? "rounded-r-md" : ""} transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold ${
                b.account === "Mandiri" ? "text-obsidian-bg" : "text-white"
              }`}
              title={`${b.account}: ${b.percentage.toFixed(1)}%`}
            >
              {showText ? `${Math.round(b.percentage)}%` : ""}
            </div>
          );
        })}
      </div>

      {/* Account Cards Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 pt-1">
        {activeBuckets.map((b) => {
          const color = ACCOUNT_COLORS[b.account] || { bar: "bg-blue-500", border: "border-blue-500", text: "text-blue-400" };
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
                {formatRupiah(allocatedAmt)} • {shortPurpose}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}