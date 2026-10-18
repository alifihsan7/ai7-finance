import React from "react";
import { CreditCard } from "lucide-react";

interface AccountGridProps {
  summary: {
    expense: number;
  };
  formatRupiah: (val: number) => string;
}

export function AccountGrid({ summary, formatRupiah }: AccountGridProps) {
  const accounts = [
    {
      name: "Mandiri",
      tag: "Saku Operasional",
      allocated: 825000,
      spent: summary.expense,
      accentColor: "text-amberGold",
      barColor: "bg-amberGold",
    },
    {
      name: "Bank Jago / Bibit",
      tag: "Subs & Investasi",
      allocated: 475000,
      spent: 0,
      accentColor: "text-mintRise",
      barColor: "bg-mintRise",
    },
    {
      name: "BRI 1",
      tag: "Hub & Dana Darurat",
      allocated: 100000,
      spent: 0,
      accentColor: "text-cyanHub",
      barColor: "bg-cyanHub",
    },
    {
      name: "BRI 2",
      tag: "Tabungan Terkunci",
      allocated: 100000,
      spent: 0,
      accentColor: "text-purpleLock",
      barColor: "bg-purpleLock",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {accounts.map((acc) => {
        const remaining = acc.allocated - acc.spent;
        const pctUsed = Math.min(100, Math.round((acc.spent / acc.allocated) * 100));
        return (
          <div
            key={acc.name}
            className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-5 transition-all shadow-xs"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-slateText-primary font-bold text-base flex items-center gap-2">
                  <CreditCard className={`w-4 h-4 ${acc.accentColor}`} />
                  {acc.name}
                </div>
                <div className="text-xs text-slateText-muted mt-1">{acc.tag}</div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-obsidian-panel text-slateText-secondary border border-obsidian-border">
                14 Hari
              </span>
            </div>

            <div className="mt-5">
              <div className="text-xs text-slateText-muted">Sisa Anggaran</div>
              <div className="text-2xl font-bold font-mono text-slateText-primary mt-0.5">
                {formatRupiah(remaining)}
              </div>
            </div>

            <div className="mt-4">
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
          </div>
        );
      })}
    </div>
  );
}
