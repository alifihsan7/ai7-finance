import React from "react";
import { Edit2, Trash2 } from "lucide-react";

export interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer_in" | "transfer_out";
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
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export function TransactionTable({
  transactions,
  formatRupiah,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className="border border-obsidian-border rounded-xl overflow-hidden bg-obsidian-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-obsidian-border bg-obsidian-panel text-slateText-secondary font-medium">
              <th className="py-3.5 px-4 sm:px-5 whitespace-nowrap w-28">Tanggal</th>
              <th className="py-3.5 px-4 sm:px-5 min-w-[200px]">Keterangan</th>
              <th className="py-3.5 px-4 sm:px-5 whitespace-nowrap w-44">Kategori</th>
              <th className="py-3.5 px-4 sm:px-5 whitespace-nowrap w-32">Akun</th>
              <th className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap w-36">Nominal</th>
              {showActions && <th className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-obsidian-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 6 : 5} className="py-10 text-center text-slateText-muted">
                  Tidak ada transaksi yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isIncome = tx.type === "income";
                const isTransferIn = tx.type === "transfer_in";
                const isTransferOut = tx.type === "transfer_out";
                const isPositive = isIncome || isTransferIn;
                const isTransfer = isTransferIn || isTransferOut;

                return (
                  <tr key={tx.id} className="hover:bg-obsidian-hover transition group">
                    <td className="py-3.5 px-4 sm:px-5 text-slateText-secondary font-mono whitespace-nowrap text-xs sm:text-sm">
                      {tx.date}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-slateText-primary font-medium min-w-[200px] leading-snug">
                      {tx.description}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono border whitespace-nowrap ${
                          isTransfer
                            ? "bg-cyanHub/10 border-cyanHub/30 text-cyanHub"
                            : "bg-obsidian-panel border-obsidian-border text-slateText-secondary"
                        }`}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-slateText-secondary font-mono text-xs sm:text-sm whitespace-nowrap">
                      {tx.account}
                    </td>
                    <td
                      className={`py-3.5 px-4 sm:px-5 text-right font-mono font-bold whitespace-nowrap text-sm sm:text-base ${
                        isPositive ? "text-mintRise" : isTransferOut ? "text-cyanHub" : "text-coralFall"
                      }`}
                    >
                      {isPositive ? "+" : "-"} {formatRupiah(tx.amount)}
                    </td>
                    {showActions && (
                      <td className="py-3.5 px-4 sm:px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(tx)}
                              title="Edit Transaksi"
                              className="p-1.5 rounded-lg text-slateText-muted hover:text-amberGold hover:bg-amberGold/10 border border-transparent hover:border-amberGold/20 transition"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(tx)}
                              title="Hapus Transaksi"
                              className="p-1.5 rounded-lg text-slateText-muted hover:text-coralFall hover:bg-coralFall/10 border border-transparent hover:border-coralFall/20 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
