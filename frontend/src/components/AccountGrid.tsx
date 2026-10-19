import React, { useState } from "react";
import { CreditCard, Trash2, AlertTriangle, X } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";
import { authFetch } from "@/lib/api";

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
      pocket_account?: string;
    };
  };
  customAccounts?: AccountItem[];
  formatRupiah: (val: number) => string;
  loading?: boolean;
  onAccountDeleted?: () => void;
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  amberGold: { text: "text-amberGold", bg: "bg-amberGold", border: "border-amberGold/20" },
  cyanHub: { text: "text-cyanHub", bg: "bg-cyanHub", border: "border-cyanHub/20" },
  teal: { text: "text-teal-400", bg: "bg-teal-500", border: "border-teal-500/20" },
  purpleLock: { text: "text-purpleLock", bg: "bg-purpleLock", border: "border-purpleLock/20" },
  blue: { text: "text-blue-400", bg: "bg-blue-600", border: "border-blue-500/20" },
  coralFall: { text: "text-coralFall", bg: "bg-coralFall", border: "border-coralFall/20" },
};

export function AccountGrid({ summary, customAccounts = [], formatRupiah, loading, onAccountDeleted }: AccountGridProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch(`/api/v1/accounts/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.detail || "Gagal menghapus rekening");
        setIsDeleting(false);
        return;
      }
      setConfirmDelete(null);
      if (onAccountDeleted) onAccountDeleted();
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus rekening");
    } finally {
      setIsDeleting(false);
    }
  };

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
  const pocketBudget = summary.safe_to_spend?.pocket_budget && summary.safe_to_spend.pocket_budget > 0
    ? summary.safe_to_spend.pocket_budget
    : 0;

  // Akun default generic jika user belum memiliki rekening kustom
  const genericDefaultAccounts = [
    {
      id: undefined,
      name: "Rekening Utama",
      tag: "Operasional & Belanja",
      balance: 0,
      spent: 0,
      allocated: 0,
      accentColor: "text-amberGold",
      barColor: "bg-amberGold",
      badge: cycleBadge,
      type: "operasional",
      isCustom: false,
    },
    {
      id: undefined,
      name: "Tabungan",
      tag: "Akun Simpanan",
      balance: 0,
      spent: 0,
      allocated: 0,
      accentColor: "text-purple-400",
      barColor: "bg-purple-500",
      badge: cycleBadge,
      type: "tabungan",
      isCustom: false,
    },
    {
      id: undefined,
      name: "Investasi",
      tag: "Investasi Portofolio",
      balance: 0,
      spent: 0,
      allocated: 0,
      accentColor: "text-teal-400",
      barColor: "bg-teal-500",
      badge: "Portofolio",
      type: "investasi",
      isCustom: false,
    },
    {
      id: undefined,
      name: "Dana Darurat",
      tag: "Cadangan Likuid",
      balance: 0,
      spent: 0,
      allocated: 0,
      accentColor: "text-cyanHub",
      barColor: "bg-cyanHub",
      badge: "Darurat",
      type: "darurat",
      isCustom: false,
    },
  ];

  const pocketAccountName = (summary.safe_to_spend?.pocket_account || "").toLowerCase();

  const allDisplayAccounts = customAccounts.length > 0
    ? customAccounts.map((ca) => {
        const colorScheme = COLOR_MAP[ca.color || "amberGold"] || COLOR_MAP.amberGold;
        const bal = ca.current_balance ?? balanceMap[ca.name] ?? 0;
        const isPocket = ca.name.toLowerCase() === pocketAccountName || (pocketAccountName === "" && ca.name.toLowerCase().includes("mandiri"));
        return {
          id: ca.id,
          name: ca.name,
          type: ca.type,
          tag: ca.tag || (ca.type === "investasi" ? "Pos Investasi" : ca.type === "tabungan" ? "Pos Tabungan" : "Rekening Operasional"),
          balance: bal,
          spent: isPocket ? pocketSpent : (expenseMap[ca.name] ?? 0),
          allocated: isPocket ? pocketBudget : 0,
          accentColor: colorScheme.text,
          barColor: colorScheme.bg,
          badge: isPocket ? cycleBadge : (ca.type ? ca.type.toUpperCase() : "AKUN"),
          isCustom: true,
        };
      })
    : genericDefaultAccounts;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-obsidian-card border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="w-20 h-4 rounded-full" />
                </div>
                <Skeleton className="w-12 h-4 rounded-full" />
              </div>
              <Skeleton className="w-32 h-3 rounded-full mt-2.5" />
              <div className="mt-4">
                <Skeleton className="w-28 h-6 rounded-full" />
                <Skeleton className="w-20 h-3 rounded-full mt-1.5" />
              </div>
            </div>
            <div className="pt-3 border-t border-white/[0.08]">
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
      {allDisplayAccounts.map((acc) => {
        const hasPlafon = acc.allocated > 0;
        const pctUsed = hasPlafon ? Math.min(100, Math.round((acc.spent / acc.allocated) * 100)) : 0;
        
        return (
          <div
            key={acc.name}
            className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl sm:rounded-3xl p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-center gap-2">
                <div className="relative group/name min-w-0 flex-1">
                  <div className="text-white font-bold text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                    <CreditCard className={`w-4 h-4 shrink-0 ${acc.accentColor}`} />
                    <span className="truncate cursor-default">{acc.name}</span>
                  </div>
                  {/* Tooltip Hover Nama Akun */}
                  <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-40 hidden group-hover/name:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111217]/95 backdrop-blur-md border border-white/[0.12] text-white text-xs shadow-2xl shadow-black/80 whitespace-nowrap max-w-[280px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="w-1.5 h-1.5 rounded-full bg-amberGold shrink-0" />
                    <span className="font-semibold text-white">{acc.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] whitespace-nowrap">
                    {acc.badge}
                  </span>
                  {acc.id && onAccountDeleted && (
                    <button
                      type="button"
                      title={`Hapus rekening ${acc.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: acc.id!, name: acc.name });
                      }}
                      className="p-1 rounded-full text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tag / Deskripsi selebar kartu penuh (mentok ke kanan) */}
              <div className="relative group/tag mt-1 w-full">
                <div className="text-xs text-zinc-400 truncate w-full cursor-default hover:text-zinc-300 transition-colors">
                  {acc.tag}
                </div>
                {/* Tooltip Hover Deskripsi Ber-Style */}
                {acc.tag && (
                  <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-40 hidden group-hover/tag:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111217]/95 backdrop-blur-md border border-white/[0.12] text-white text-xs shadow-2xl shadow-black/80 w-max max-w-[280px] break-words animate-in fade-in zoom-in-95 duration-150">
                    <div className="w-1.5 h-1.5 rounded-full bg-amberGold shrink-0" />
                    <span className="font-medium text-zinc-200 leading-snug">{acc.tag}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="text-[11px] text-zinc-400 font-medium">Saldo Rekening</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5 tracking-tight truncate">
                  {formatRupiah(acc.balance)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              {(acc.type === "investasi" || acc.name.toLowerCase().includes("invest") || acc.name.toLowerCase().includes("bibit")) ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5 text-[11px] text-teal-400 font-mono">
                    <span className="whitespace-nowrap">Target Portofolio</span>
                    <span className="whitespace-nowrap font-medium text-teal-300">+{formatRupiah(acc.allocated)}/siklus</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div style={{ width: "100%" }} className="h-full bg-teal-500 rounded-full"></div>
                  </div>
                </div>
              ) : hasPlafon ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-mono">
                    <span className="text-zinc-400 whitespace-nowrap">
                      Terpakai{" "}
                      <strong
                        className={
                          pctUsed > 85
                            ? "text-coralFall"
                            : pctUsed > 60
                            ? "text-amberGold"
                            : "text-white"
                        }
                      >
                        {pctUsed}%
                      </strong>
                    </span>
                    <span className="text-zinc-500 whitespace-nowrap text-right">
                      Plafon:{" "}
                      <strong className="text-zinc-300 font-medium">
                        {formatRupiah(acc.allocated)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctUsed}%` }}
                      className={`h-full rounded-full ${
                        pctUsed > 85 ? "bg-coralFall" : pctUsed > 60 ? "bg-amberGold" : acc.barColor
                      }`}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono py-1">
                  <span>Status</span>
                  <span className="text-mintRise shrink-0 whitespace-nowrap font-semibold">● Aktif</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal Konfirmasi Hapus Rekening */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-obsidian-panel border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-white">Hapus Rekening?</h3>
              </div>
              <button
                type="button"
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus rekening <strong className="text-amberGold font-mono">{confirmDelete.name}</strong>?
              Seluruh riwayat transaksi yang tercatat pada rekening ini akan ikut dihapus. Minimal Anda harus menyisakan 1 rekening aktif.
            </p>

            {deleteError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="px-4 py-2 rounded-full bg-obsidian-card hover:bg-obsidian-hover text-zinc-300 text-xs font-semibold border border-white/[0.08] transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Rekening"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
