import React from "react";
import { CreditCard } from "lucide-react";

interface AccountGridProps {
  summary: {
    expense: number;
    accounts?: { account: string; balance: number }[];
    safe_to_spend?: {
      pocket_spent: number;
      pocket_remaining: number;
    };
  };
  formatRupiah: (val: number) => string;
}

export function AccountGrid({ summary, formatRupiah }: AccountGridProps) {
  // Map balance riil dari summary.accounts
  const balanceMap = (summary.accounts || []).reduce<Record<string, number>>((acc, item) => {
    acc[item.account] = item.balance;
    return acc;
  }, {});

  const pocketSpent = summary.safe_to_spend?.pocket_spent ?? 0;

  const accounts = [
    {
      name: "Mandiri",
      tag: "Saku Operasional (55%)",
      balance: balanceMap["Mandiri"] ?? 0,
      spent: pocketSpent,
      allocated: 825000,
      accentColor: "text-amberGold",
      barColor: "bg-amberGold",
    },
    {
      name: "Bank Jago",
      tag: "Subs & Tagihan (18.3%)",
      balance: balanceMap["Bank Jago"] ?? 0,
      spent: 265000,
      allocated: 275000,
      accentColor: "text-purple-400",
      barColor: "bg-purple-500",
    },
    {
      name: "Bibit",
      tag: "Investasi Portofolio (13.3%)",
      balance: balanceMap["Bibit"] ?? 0,
      spent: 0,
      allocated: 200000,
      accentColor: "text-teal-400",
      barColor: "bg-teal-500",
    },
    {
      name: "BRI 1",
      tag: "Hub & Dana Darurat (6.7%)",
      balance: balanceMap["BRI 1"] ?? 0,
      spent: 775583,
      allocated: 100000,
      accentColor: "text-cyanHub",
      barColor: "bg-cyanHub",
    },
    {
      name: "BRI 2",
      tag: "Tabungan Terkunci (6.7%)",
      balance: balanceMap["BRI 2"] ?? 0,
      spent: 0,
      allocated: 100000,
      accentColor: "text-purpleLock",
      barColor: "bg-purpleLock",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {accounts.map((acc) => {
        const pctUsed = Math.min(100, Math.round((acc.spent / acc.allocated) * 100));
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
                    {acc.name}
                  </div>
                  <div className="text-xs text-slateText-muted mt-1">{acc.tag}</div>
                </div>
                {acc.name === "Bibit" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    Portofolio
                  </span>
                ) : acc.name === "BRI 2" ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Terkunci
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-obsidian-panel text-slateText-secondary border border-obsidian-border">
                    14 Hari
                  </span>
                )}
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
              ) : (
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
