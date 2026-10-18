import React from "react";

interface MandiriEnvelopesProps {
  mandiriExpenses: {
    makan: number;
    jajan: number;
    laundry: number;
    galon: number;
  };
  formatRupiah: (val: number) => string;
}

export function MandiriEnvelopes({ mandiriExpenses, formatRupiah }: MandiriEnvelopesProps) {
  const envelopes = [
    {
      title: "Makan Harian",
      limit: 450000,
      spent: mandiriExpenses.makan,
    },
    {
      title: "Jajan & Kopi",
      limit: 100000,
      spent: mandiriExpenses.jajan,
    },
    {
      title: "Laundry",
      limit: 70000,
      spent: mandiriExpenses.laundry,
    },
    {
      title: "Galon & Air",
      limit: 44000,
      spent: mandiriExpenses.galon,
    },
  ];

  return (
    <div className="bg-obsidian-panel border border-obsidian-border rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary">
            Amplop Belanja Mandiri (Plafon Rp 825.000)
          </h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Monitoring limit pos belanja harian agar pengeluaran terkontrol sampai gajian berikutnya
          </p>
        </div>
        <span className="text-xs text-amberGold font-mono font-medium px-2.5 py-1 rounded bg-amberGold/10 border border-amberGold/20">
          Reset Tiap 14 Hari
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {envelopes.map((env) => {
          const rem = env.limit - env.spent;
          const pct = Math.min(100, Math.round((env.spent / env.limit) * 100));
          return (
            <div
              key={env.title}
              className="bg-obsidian-card border border-obsidian-border rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-slateText-primary font-semibold text-sm">{env.title}</span>
                <span
                  className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
                    pct > 80
                      ? "bg-coralFall/10 border-coralFall/30 text-coralFall"
                      : "bg-obsidian-panel border-obsidian-border text-slateText-secondary"
                  }`}
                >
                  {pct}%
                </span>
              </div>

              <div>
                <div className="text-xl font-bold font-mono text-slateText-primary">
                  {formatRupiah(rem)}
                </div>
                <div className="text-xs text-slateText-muted mt-0.5">Sisa saldo pos</div>
              </div>

              <div className="h-1.5 bg-obsidian-panel rounded-full overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full ${pct > 80 ? "bg-coralFall" : "bg-amberGold"}`}
                ></div>
              </div>

              <div className="flex justify-between items-center text-xs text-slateText-muted font-mono pt-1">
                <span>Limit: {formatRupiah(env.limit)}</span>
                <span>Pakai: {formatRupiah(env.spent)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
