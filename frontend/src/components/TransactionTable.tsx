import React from "react";

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  account: string;
  category: string;
  description: string;
  raw_text?: string;
  date: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  formatRupiah: (val: number) => string;
}

export function TransactionTable({ transactions, formatRupiah }: TransactionTableProps) {
  return (
    <div className="border border-obsidian-border rounded-xl overflow-hidden bg-obsidian-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-obsidian-border bg-obsidian-panel text-slateText-secondary font-medium">
              <th className="py-3.5 px-5">Tanggal</th>
              <th className="py-3.5 px-5">Keterangan</th>
              <th className="py-3.5 px-5">Kategori</th>
              <th className="py-3.5 px-5">Akun</th>
              <th className="py-3.5 px-5 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slateText-muted">
                  Tidak ada transaksi yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <tr key={tx.id} className="hover:bg-obsidian-hover transition">
                    <td className="py-3.5 px-5 text-slateText-secondary font-mono whitespace-nowrap text-xs sm:text-sm">
                      {tx.date}
                    </td>
                    <td className="py-3.5 px-5 text-slateText-primary font-medium">{tx.description}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-md text-xs bg-obsidian-panel border border-obsidian-border text-slateText-secondary font-mono">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slateText-secondary font-mono text-xs sm:text-sm">{tx.account}</td>
                    <td
                      className={`py-3.5 px-5 text-right font-mono font-bold whitespace-nowrap text-sm sm:text-base ${
                        isIncome ? "text-mintRise" : "text-coralFall"
                      }`}
                    >
                      {isIncome ? "+" : "-"} {formatRupiah(tx.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
