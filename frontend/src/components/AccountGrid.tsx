import React, { useState } from "react";
import { CreditCard, Trash2, AlertTriangle, X, Edit2 } from "lucide-react";
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
  onEditAccount?: (acc: AccountItem) => void;
}

/* Luma icon wells — circular dark icon on a tinted smoked ring. */
const COLOR_MAP: Record<string, { text: string; ring: string }> = {
  amberGold: { text: "text-luma-gold", ring: "bg-luma-gold/10 border-luma-gold/30" },
  cyanHub: { text: "text-luma-gold", ring: "bg-luma-gold/10 border-luma-gold/30" },
  teal: { text: "text-luma-sage", ring: "bg-luma-sage/10 border-luma-sage/30" },
  purpleLock: { text: "text-luma-coral", ring: "bg-luma-coral/10 border-luma-coral/30" },
  blue: { text: "text-luma-ivory", ring: "bg-white/[0.06] border-white/[0.12]" },
  coralFall: { text: "text-luma-coral", ring: "bg-luma-coral/10 border-luma-coral/30" },
  ember: { text: "text-luma-ember", ring: "bg-luma-ember/10 border-luma-ember/30" },
  sage: { text: "text-luma-sage", ring: "bg-luma-sage/10 border-luma-sage/30" },
};

export function AccountGrid({ summary, customAccounts = [], formatRupiah, loading, onAccountDeleted, onEditAccount }: AccountGridProps) {
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
      colorKey: "ember",
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
      colorKey: "sage",
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
      colorKey: "sage",
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
      colorKey: "amberGold",
      badge: "Darurat",
      type: "darurat",
      isCustom: false,
    },
  ];

  const pocketAccountName = (summary.safe_to_spend?.pocket_account || "").toLowerCase();
  const lumaKeyFor = (color?: string) => {
    if (color === "teal") return "sage";
    if (color === "purpleLock" || color === "coralFall") return "coralFall";
    if (color === "blue" || color === "cyanHub") return "blue";
    if (color === "amberGold") return "amberGold";
    return "ember";
  };

  const allDisplayAccounts = customAccounts.length > 0
    ? customAccounts.map((ca) => {
        const colorKey = lumaKeyFor(ca.color);
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
          colorKey,
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
            className="luma-glass !rounded-3xl p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-9 h-9 rounded-full" />
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
        const scheme = COLOR_MAP[acc.colorKey] || COLOR_MAP.ember;
        const isInvest = (acc.type || "").toLowerCase() === "investasi"
          || acc.name.toLowerCase().includes("invest")
          || acc.name.toLowerCase().includes("bibit");

        return (
          <div
            key={acc.name}
            className="luma-glass !rounded-3xl p-5 hover:border-white/[0.18] transition-all duration-200 flex flex-col justify-between"
          >
            <div className="min-w-0">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${scheme.ring}`}
                  >
                    <CreditCard className={`w-4 h-4 ${scheme.text}`} />
                  </span>
                  <span className="text-luma-ivory font-bold text-sm sm:text-base break-words leading-snug flex-1">
                    {acc.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] sm:text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-white/[0.06] text-luma-smoke border border-white/[0.08] whitespace-nowrap">
                    {acc.badge}
                  </span>
                  {acc.id && onEditAccount && (
                    <button
                      type="button"
                      title={`Edit rekening ${acc.name}`}
                      aria-label={`Edit rekening ${acc.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const found = customAccounts.find((c) => c.id === acc.id);
                        onEditAccount(
                          found || {
                            id: acc.id,
                            name: acc.name,
                            type: acc.type,
                            tag: acc.tag,
                            color: "amberGold",
                            current_balance: acc.balance,
                          }
                        );
                      }}
                      className="luma-touch min-w-[44px] inline-flex items-center justify-center rounded-full text-luma-smoke hover:text-luma-gold hover:bg-luma-gold/10 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {acc.id && onAccountDeleted && (
                    <button
                      type="button"
                      title={`Hapus rekening ${acc.name}`}
                      aria-label={`Hapus rekening ${acc.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ id: acc.id!, name: acc.name });
                      }}
                      className="luma-touch min-w-[44px] inline-flex items-center justify-center rounded-full text-luma-smoke hover:text-luma-coral hover:bg-luma-coral/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tag / Deskripsi — full wrap, never clipped */}
              <div className="text-xs text-luma-smoke mt-2 w-full break-words leading-relaxed">
                {acc.tag}
              </div>

              <div className="mt-4">
                <div className="text-[11px] text-luma-smoke font-semibold uppercase tracking-[0.1em]">
                  Saldo Rekening
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-luma-ivory mt-1 tracking-tight break-words tabular-nums">
                  {formatRupiah(acc.balance)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              {isInvest ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5 text-[11px] text-luma-sage font-mono">
                    <span className="whitespace-nowrap">Target Portofolio</span>
                    <span className="whitespace-nowrap font-semibold tabular-nums">+{formatRupiah(acc.allocated)}/siklus</span>
                  </div>
                  <div className="h-1.5 bg-black/25 rounded-full overflow-hidden">
                    <div style={{ width: "100%" }} className="h-full bg-luma-sage rounded-full"></div>
                  </div>
                </div>
              ) : hasPlafon ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] font-mono">
                    <span className="text-luma-smoke whitespace-nowrap">
                      Terpakai{" "}
                      <strong
                        className={
                          pctUsed > 85
                            ? "text-luma-coral"
                            : pctUsed > 60
                            ? "text-luma-gold"
                            : "text-luma-ivory"
                        }
                      >
                        {pctUsed}%
                      </strong>
                    </span>
                    <span className="text-luma-smoke whitespace-nowrap text-right tabular-nums">
                      Plafon:{" "}
                      <strong className="text-luma-ivory font-medium">
                        {formatRupiah(acc.allocated)}
                      </strong>
                    </span>
                  </div>
                  <div
                    className="h-1.5 bg-black/25 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pctUsed}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Pemakaian ${acc.name} ${pctUsed} persen`}
                  >
                    <div
                      style={{ width: `${pctUsed}%` }}
                      className={`h-full rounded-full ${
                        pctUsed > 85 ? "bg-luma-coral" : pctUsed > 60 ? "bg-luma-gold" : "bg-luma-ember"
                      }`}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-luma-smoke font-mono py-1">
                  <span>Status</span>
                  <span className="text-luma-sage shrink-0 whitespace-nowrap font-semibold">Aman · Aktif</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal Konfirmasi Hapus Rekening — Luma smoked glass */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-label="Hapus rekening">
          <div className="luma-hero max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-luma-coral">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-sm text-luma-ivory">Hapus Rekening?</h3>
              </div>
              <button
                type="button"
                aria-label="Tutup dialog"
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="luma-touch min-w-[44px] inline-flex items-center justify-center rounded-full text-luma-smoke hover:text-luma-ivory transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-luma-smoke leading-relaxed">
              Apakah Anda yakin ingin menghapus rekening <strong className="text-luma-gold font-mono">{confirmDelete.name}</strong>?
              Seluruh riwayat transaksi yang tercatat pada rekening ini akan ikut dihapus. Minimal Anda harus menyisakan 1 rekening aktif.
            </p>

            {deleteError && (
              <div className="p-3 rounded-2xl bg-luma-coral/10 border border-luma-coral/30 text-luma-coral text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setConfirmDelete(null); setDeleteError(null); }}
                className="luma-touch px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-luma-smoke hover:text-luma-ivory text-xs font-semibold border border-white/[0.1] transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="luma-touch px-4 py-2 rounded-full bg-luma-coral hover:brightness-110 text-luma-charcoal text-xs font-bold transition inline-flex items-center gap-1.5 disabled:opacity-50"
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
