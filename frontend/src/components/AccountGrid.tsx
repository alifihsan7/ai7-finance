import React from "react";
import { CreditCard } from "lucide-react";

export interface AccountItem {
  id?: number;
  name: string;
  type?: string;
  tag?: string | null;
  color?: string;
  initial_balance?: number;
  current_balance?: number;
}

interface AccountGridProps {
  summary: {
    expense: number;
    accounts?: { account: string; balance: number; expense?: number }[];
    safe_to_spend?: {
      pocket_spent: number;
      pocket_remaining: number;
      cycle_days?: number;
      pocket_budget?: number;
    };
  };
  customAccounts?: AccountItem[];
  formatRupiah: (val: number) => string;
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  amberGold: { text: "text-amberGold", bg: "bg-amberGold", border: "border-amberGold/20" },
  cyanHub: { text: "text-cyanHub", bg: "bg-cyanHub", border: "border-cyanHub/20" },
  teal: { text: "text-teal-400", bg: "bg-teal-500", border: "border-teal-500/20" },
  purpleLock: { text: "text-purpleLock", bg: "bg-purpleLock", border: "border-purpleLock/20" },
  blue: { text: "text-blue-400", bg: "bg-blue-600", border: "border-blue-500/20" },
  coralFall: { text: "text-coralFall", bg: "bg-coralFall", border: "border-coralFall/20" },
};

export function AccountGrid({ summary, customAccounts = [], formatRupiah }: AccountGridProps) {
  // Map balance riil dari summary.accounts
  const balanceMap = (summary.accounts || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.account] = item.balance;
    return acc;
  }, {});

  // Map expense riil dari summary.accounts
  const expenseMap = (summary.accounts || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.account] = item.expense ?? 0;
    return acc;
  }, {});

  const pocketSpent = summary.safe_to_spend?.pocket_spent ?? 0;
  const cycleDays = summary.safe_to_spend?.cycle_days ?? 14;
  const cycleBadge = `${cycleDays} Hari`;
  const baselineSalary = cycleDays === 30 ? 3000000 : (cycleDays === 7 ? 750000 : 1500000);
  const pocketBudget = summary.safe_to_spend?.pocket_budget && summary.safe_to_spend.pocket_budget > 0
    ? summary.safe_to_spend.pocket_budget
    : Math.round(baselineSalary * 0.55);

  // Akun utama bawaan siklus
  const defaultAccounts = [
    {
      name: "Mandiri",
      tag: "Saku Operasional (55%)",
      balance: balanceMap["Mandiri"] ?? 0,
      spent: pocketSpent,
      allocated: pocketBudget,
      accentColor: "text-amberGold",
      barColor: "bg-amberGold",
      badge: cycleBadge,
    },
    {
      name: "Bank Jago",
      tag: "Subs & Tagihan (18.3%)",
      balance: balanceMap["Bank Jago"] ?? 0,
      spent: expenseMap["Bank Jago"] ?? 0,
      allocated: Math.round(baselineSalary * 0.183),
      accentColor: "text-purple-400",
      barColor: "bg-purple-500",
      badge: cycleBadge,
    },
    {
      name: "Bibit",
      tag: "Investasi Portofolio (13.3%)",
      balance: balanceMap["Bibit"] ?? 0,
      spent: expenseMap["Bibit"] ?? 0,
      allocated: Math.round(baselineSalary * 0.133),
      accentColor: "text-teal-400",
      barColor: "bg-teal-500",
      badge: "Portofolio",
    },
    {
      name: "BRI 1",
      tag: "Hub & Dana Darurat (6.7%)",
      balance: balanceMap["BRI 1"] ?? 0,
      spent: expenseMap["BRI 1"] ?? 0,
      allocated: Math.round(baselineSalary * 0.067),
      accentColor: "text-cyanHub",
      barColor: "bg-cyanHub",
      badge: cycleBadge,
    },
    {
      name: "BRI 2",
      tag: "Tabungan Terkunci (6.7%)",
      balance: balanceMap["BRI 2"] ?? 0,
      spent: expenseMap["BRI 2"] ?? 0,
      allocated: Math.round(baselineSalary * 0.067),
      accentColor: "text-coralFall",
      barColor: "bg-coralFall",
      badge: "Terkunci",
    },
  ];

  const defaultNames = new Set(
    defaultAccounts
      .map((a) => a.name.toLowerCase())
      .concat(["jago", "bank jago", "mandiri", "bibit", "bri 1", "bri 2", "cash"])
  );

  // Tambahkan rekening kustom dinamis yang didaftarkan user
  const dynamicAccounts = customAccounts
    .filter((ca) => !defaultNames.has(ca.name.toLowerCase()) && ca.name.toLowerCase() !== "cash")
    .map((ca) => {
      const colorScheme = COLOR_MAP[ca.color || "amberGold"] || COLOR_MAP.amberGold;
      const bal = ca.current_balance ?? balanceMap[ca.name] ?? 0;
      return {
        name: ca.name,
        tag: ca.tag || (ca.type === "investasi" ? "Pos Investasi" : ca.type === "tabungan" ? "Pos Tabungan" : "Rekening Pribadi"),
        balance: bal,
        spent: 0,
        allocated: 0,
        accentColor: colorScheme.text,
        barColor: colorScheme.bg,
        badge: ca.type ? ca.type.toUpperCase() : "AKUN",
        isCustom: true,
      };
    });

  const allDisplayAccounts = [...defaultAccounts, ...dynamicAccounts];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      {allDisplayAccounts.map((acc) => {
        const hasPlafon = acc.allocated > 0;
        const pctUsed = hasPlafon ? Math.min(100, Math.round((acc.spent / acc.allocated) * 100)) : 0;
        
        return (
          <div
            key={acc.name}
            className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-slateText-primary font-bold text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                    <CreditCard className={`w-4 h-4 shrink-0 ${acc.accentColor}`} />
                    <span className="truncate">{acc.name}</span>
                  </div>
                  <div className="text-xs text-slateText-muted mt-0.5 truncate">{acc.tag}</div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-md bg-obsidian-panel text-slateText-secondary border border-obsidian-border shrink-0 whitespace-nowrap">
                  {acc.badge}
                </span>
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="text-xs text-slateText-muted">Saldo Rekening</div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-slateText-primary mt-0.5 tracking-tight truncate">
                  {formatRupiah(acc.balance)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-obsidian-border/50">
              {acc.name === "Bibit" ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5 text-[11px] text-teal-400 font-mono">
                    <span className="whitespace-nowrap">Target Portofolio</span>
                    <span className="whitespace-nowrap font-medium text-teal-300">+{formatRupiah(acc.allocated)}/siklus</span>
                  </div>
                  <div className="h-1.5 bg-obsidian-panel rounded-full overflow-hidden">
                    <div style={{ width: "100%" }} className="h-full bg-teal-500"></div>
                  </div>
                </div>
              ) : hasPlafon ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-mono">
                    <span className="text-slateText-secondary whitespace-nowrap">
                      Terpakai{" "}
                      <strong
                        className={
                          pctUsed > 85
                            ? "text-coralFall"
                            : pctUsed > 60
                            ? "text-amberGold"
                            : "text-slateText-primary"
                        }
                      >
                        {pctUsed}%
                      </strong>
                    </span>
                    <span className="text-slateText-muted whitespace-nowrap text-right">
                      Plafon:{" "}
                      <strong className="text-slateText-primary font-medium">
                        {formatRupiah(acc.allocated)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-1.5 bg-obsidian-panel rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctUsed}%` }}
                      className={`h-full ${
                        pctUsed > 85 ? "bg-coralFall" : pctUsed > 60 ? "bg-amberGold" : acc.barColor
                      }`}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-slateText-muted font-mono py-1">
                  <span>Status</span>
                  <span className="text-mintRise shrink-0 whitespace-nowrap">● Aktif</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
