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
    accounts?: { account: string; balance: number }[];
    safe_to_spend?: {
      pocket_spent: number;
      pocket_remaining: number;
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

  const pocketSpent = summary.safe_to_spend?.pocket_spent ?? 0;

  // Akun utama bawaan siklus
  const defaultAccounts = [
    {
      name: "Mandiri",
      tag: "Saku Operasional (55%)",
      balance: balanceMap["Mandiri"] ?? 0,
      spent: pocketSpent,
      allocated: 825000,
      accentColor: "text-amberGold",
      barColor: "bg-amberGold",
      badge: "14 Hari",
    },
    {
      name: "Bank Jago",
      tag: "Subs & Tagihan (18.3%)",
      balance: balanceMap["Bank Jago"] ?? 0,
      spent: 265000,
      allocated: 275000,
      accentColor: "text-purple-400",
      barColor: "bg-purple-500",
      badge: "14 Hari",
    },
    {
      name: "Bibit",
      tag: "Investasi Portofolio (13.3%)",
      balance: balanceMap["Bibit"] ?? 0,
      spent: 0,
      allocated: 200000,
      accentColor: "text-teal-400",
      barColor: "bg-teal-500",
      badge: "Portofolio",
    },
    {
      name: "BRI 1",
      tag: "Hub & Dana Darurat (6.7%)",
      balance: balanceMap["BRI 1"] ?? 0,
      spent: 775583,
      allocated: 100000,
      accentColor: "text-cyanHub",
      barColor: "bg-cyanHub",
      badge: "14 Hari",
    },
    {
      name: "BRI 2",
      tag: "Tabungan Terkunci (6.7%)",
      balance: balanceMap["BRI 2"] ?? 0,
      spent: 0,
      allocated: 100000,
      accentColor: "text-purpleLock",
      barColor: "bg-purpleLock",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {allDisplayAccounts.map((acc) => {
        const hasPlafon = acc.allocated > 0;
        const pctUsed = hasPlafon ? Math.min(100, Math.round((acc.spent / acc.allocated) * 100)) : 0;
        
        return (
          <div
            key={acc.name}
            className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-5 transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slateText-primary font-bold text-base flex items-center gap-2">
                    <CreditCard className={`w-4 h-4 ${acc.accentColor}`} />
                    <span>{acc.name}</span>
                  </div>
                  <div className="text-xs text-slateText-muted mt-1">{acc.tag}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-obsidian-panel text-slateText-secondary border border-obsidian-border">
                  {acc.badge}
                </span>
              </div>

              <div className="mt-5">
                <div className="text-xs text-slateText-muted">Saldo Rekening</div>
                <div className="text-2xl font-bold font-mono text-slateText-primary mt-0.5">
                  {formatRupiah(acc.balance)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-obsidian-border/50">
              {acc.name === "Bibit" ? (
                <div>
                  <div className="flex justify-between text-xs text-teal-400 font-mono mb-1.5">
                    <span>Target Portofolio</span>
                    <span>+{formatRupiah(acc.allocated)}/siklus</span>
                  </div>
                  <div className="h-1.5 bg-obsidian-panel rounded-full overflow-hidden">
                    <div style={{ width: "100%" }} className="h-full bg-teal-500"></div>
                  </div>
                </div>
              ) : hasPlafon ? (
                <div>
                  <div className="flex justify-between text-xs text-slateText-secondary font-mono mb-1.5">
                    <span>Terpakai {pctUsed}%</span>
                    <span>Plafon: {formatRupiah(acc.allocated)}</span>
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
                <div className="flex items-center justify-between text-xs text-slateText-muted font-mono">
                  <span>Status</span>
                  <span className="text-mintRise">● Aktif</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
