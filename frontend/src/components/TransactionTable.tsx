import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";
import { getCategoryBadgeClasses } from "@/lib/categoryColors";

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
  loading?: boolean;
}

export function TransactionTable({
  transactions,
  formatRupiah,
  onEdit,
  onDelete,
  loading,
}: TransactionTableProps) {
  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className="border border-white/[0.08] rounded-3xl overflow-hidden bg-obsidian-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-obsidian-panel text-zinc-400 font-semibold text-xs uppercase tracking-wider">
              <th className="py-4 px-4 sm:px-6 whitespace-nowrap w-28">Tanggal</th>
              <th className="py-4 px-4 sm:px-6 min-w-[200px]">Keterangan</th>
              <th className="py-4 px-4 sm:px-6 whitespace-nowrap w-44">Kategori</th>
              <th className="py-4 px-4 sm:px-6 whitespace-nowrap w-32">Akun</th>
              <th className="py-4 px-4 sm:px-6 text-right whitespace-nowrap w-36">Nominal</th>
              {showActions && <th className="py-4 px-4 sm:px-6 text-center whitespace-nowrap w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <Skeleton className="w-20 h-4 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <Skeleton className="w-48 h-4 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <Skeleton className="w-24 h-4 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <Skeleton className="w-20 h-4 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <Skeleton className="w-24 h-4 rounded-full ml-auto" />
                  </td>
                  {showActions && (
                    <td className="py-4 px-4 sm:px-6 text-center">
                      <Skeleton className="w-14 h-4 rounded-full mx-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 6 : 5} className="py-12 text-center text-zinc-500">
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
                  <tr key={tx.id} className="hover:bg-white/[0.03] transition group">
                    <td className="py-4 px-4 sm:px-6 text-zinc-400 font-mono whitespace-nowrap text-xs sm:text-sm">
                      {tx.date}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-white font-medium min-w-[200px] leading-snug">
                      {tx.description}
                    </td>
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-medium border whitespace-nowrap ${
                          isTransfer
                            ? "bg-cyanHub/10 border-cyanHub/30 text-cyanHub"
                            : getCategoryBadgeClasses(tx.category)
                        }`}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-zinc-400 font-mono text-xs sm:text-sm whitespace-nowrap">
                      {tx.account}
                    </td>
                    <td
                      className={`py-4 px-4 sm:px-6 text-right font-mono font-black whitespace-nowrap text-sm sm:text-base ${
                        isPositive ? "text-mintRise" : isTransferOut ? "text-cyanHub" : "text-coralFall"
                      }`}
                    >
                      {isPositive ? "+" : "-"} {formatRupiah(tx.amount)}
                    </td>
                    {showActions && (
                      <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(tx)}
                              title="Edit Transaksi"
                              className="p-1.5 rounded-full text-zinc-400 hover:text-amberGold hover:bg-amberGold/10 border border-transparent hover:border-amberGold/20 transition cursor-pointer"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(tx)}
                              title="Hapus Transaksi"
                              className="p-1.5 rounded-full text-zinc-400 hover:text-coralFall hover:bg-coralFall/10 border border-transparent hover:border-coralFall/20 transition cursor-pointer"
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
