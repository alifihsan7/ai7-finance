"use client";

import React, { useState, useMemo } from "react";
import {
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { CategoryItem } from "./ManageCategoriesModal";
import { CATEGORY_COLORS, getCategoryColorDef } from "@/lib/categoryColors";
import { Skeleton } from "./ui/Skeleton";
import { CustomModal } from "./ui/CustomModal";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";
import { authFetch } from "@/lib/api";

interface SummaryCategoryItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface CategoryGridProps {
  categories: CategoryItem[];
  summaryCategories?: SummaryCategoryItem[];
  formatRupiah: (val: number) => string;
  loading?: boolean;
  onCategoriesUpdated?: () => void;
  transactions?: { category?: string }[];
  onOpenManageCategories?: () => void;
}

export function CategoryGrid({
  categories,
  summaryCategories = [],
  formatRupiah,
  loading = false,
  onCategoriesUpdated,
  transactions = [],
}: CategoryGridProps) {
  const [filterTab, setFilterTab] = useState<"all" | "expense" | "income">("all");

  // Modal Add state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"expense" | "income">("expense");
  const [addColor, setAddColor] = useState("amberGold");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Modal Edit state
  const [editingCat, setEditingCat] = useState<{
    id: number;
    name: string;
    type: "expense" | "income";
    color: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"expense" | "income">("expense");
  const [editColor, setEditColor] = useState("amberGold");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal Delete state
  const [deletingCat, setDeletingCat] = useState<{
    id: number;
    name: string;
    type: "expense" | "income";
    count?: number;
  } | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState("Lainnya");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Combine categories with spending data from summary
  const combinedCards = useMemo(() => {
    const list: {
      id: string | number;
      name: string;
      type: "expense" | "income";
      color: string;
      total: number;
      count: number;
      percentage: number;
    }[] = [];

    const seenNames = new Set<string>();

    // 1. Defined categories from API
    (categories || []).forEach((c) => {
      seenNames.add(c.name.toLowerCase());
      const stats = summaryCategories.find(
        (sc) => sc.category.toLowerCase() === c.name.toLowerCase()
      );
      list.push({
        id: c.id,
        name: c.name,
        type: (c.type as "expense" | "income") || "expense",
        color: c.color,
        total: stats ? stats.total : 0,
        count: stats ? stats.count : 0,
        percentage: stats ? stats.percentage : 0,
      });
    });

    // 2. Summary categories not yet explicitly in categories table
    (summaryCategories || []).forEach((sc, idx) => {
      if (!seenNames.has(sc.category.toLowerCase())) {
        seenNames.add(sc.category.toLowerCase());
        list.push({
          id: `legacy-${idx}-${sc.category}`,
          name: sc.category,
          type: "expense",
          color: "amberGold",
          total: sc.total,
          count: sc.count,
          percentage: sc.percentage,
        });
      }
    });

    // Sort: categories with spend/count first (descending by total), then alphabetically
    return list.sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.name.localeCompare(b.name);
    });
  }, [categories, summaryCategories]);

  // Filtered by tab
  const filteredList = useMemo(() => {
    if (filterTab === "all") return combinedCards;
    return combinedCards.filter((c) => c.type === filterTab);
  }, [combinedCards, filterTab]);

  const expenseCount = combinedCards.filter((c) => c.type === "expense").length;
  const incomeCount = combinedCards.filter((c) => c.type === "income").length;

  // Resolve category ID helper
  const resolveCategoryId = (c: (typeof combinedCards)[0]): number | null => {
    if (typeof c.id === "number") return c.id;
    const match = (categories || []).find(
      (cat) => cat.name.toLowerCase() === c.name.toLowerCase()
    );
    return match ? match.id : null;
  };

  // Open Edit Modal
  const handleOpenEdit = (c: (typeof combinedCards)[0]) => {
    const catId = resolveCategoryId(c);
    if (catId === null) return;
    setEditingCat({
      id: catId,
      name: c.name,
      type: c.type,
      color: c.color || "amberGold",
    });
    setEditName(c.name);
    setEditType(c.type);
    setEditColor(c.color || "amberGold");
    setEditError(null);
  };

  // Open Delete Modal
  const handleOpenDelete = (c: (typeof combinedCards)[0]) => {
    const catId = resolveCategoryId(c);
    if (catId === null) return;

    const sameTypeCats = (categories || [])
      .filter((cat) => cat.type === c.type && cat.id !== catId)
      .map((cat) => cat.name);
    const defaultFallback = c.type === "expense" ? "Lainnya" : "Pemasukan Lain";
    const initialFallback = sameTypeCats.includes(defaultFallback)
      ? defaultFallback
      : sameTypeCats[0] || defaultFallback;

    setFallbackCategory(initialFallback);
    setDeletingCat({
      id: catId,
      name: c.name,
      type: c.type,
      count: c.count,
    });
    setDeleteError(null);
  };

  // Handle Add Category Submit
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = addName.trim();
    if (!cleanName) {
      setAddError("Nama kategori tidak boleh kosong.");
      return;
    }

    setAddLoading(true);
    setAddError(null);
    try {
      const res = await authFetch("/api/v1/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          type: addType,
          color: addColor,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Gagal menambahkan kategori (${res.status})`);
      }
      setAddName("");
      setAddColor("amberGold");
      setIsAddModalOpen(false);
      onCategoriesUpdated?.();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Terjadi kesalahan saat menambahkan kategori.");
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Update Category Submit
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      setEditError("Nama kategori tidak boleh kosong.");
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      const res = await authFetch(`/api/v1/categories/${editingCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          type: editType,
          color: editColor,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Gagal memperbarui kategori (${res.status})`);
      }
      setEditingCat(null);
      onCategoriesUpdated?.();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui kategori.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingCat) return;
    setDeleteLoading(true);
    setDeleteError(null);

    let count = deletingCat.count || 0;
    if (transactions && transactions.length > 0) {
      const targetName = deletingCat.name.trim().toLowerCase();
      count = transactions.filter(
        (tx) => (tx.category || "").trim().toLowerCase() === targetName
      ).length;
    }

    let deleteUrl = `/api/v1/categories/${deletingCat.id}`;
    if (count > 0 || fallbackCategory) {
      deleteUrl += `?fallback_to=${encodeURIComponent(fallbackCategory.trim())}`;
    }

    try {
      const res = await authFetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Gagal menghapus kategori (${res.status})`);
      }
      setDeletingCat(null);
      onCategoriesUpdated?.();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus kategori.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Active tx count for delete modal
  const activeDeleteTxCount = useMemo(() => {
    if (!deletingCat) return 0;
    if (transactions && transactions.length > 0) {
      const targetName = deletingCat.name.trim().toLowerCase();
      const count = transactions.filter(
        (tx) => (tx.category || "").trim().toLowerCase() === targetName
      ).length;
      if (count > 0) return count;
    }
    return deletingCat.count || 0;
  }, [deletingCat, transactions]);

  // Fallback select options for delete modal
  const fallbackSelectOptions: SelectOption[] = useMemo(() => {
    if (!deletingCat) return [];
    const sameTypeCats = (categories || [])
      .filter((c) => c.type === deletingCat.type && c.id !== deletingCat.id)
      .map((c) => c.name);

    const defaultFallback = deletingCat.type === "expense" ? "Lainnya" : "Pemasukan Lain";
    if (!sameTypeCats.includes(defaultFallback)) {
      sameTypeCats.push(defaultFallback);
    }
    return sameTypeCats.map((name) => ({ value: name, label: name }));
  }, [deletingCat, categories]);

  return (
    <section className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-5 sm:p-7 space-y-5 shadow-sm">
      {/* Header Flex Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amberGold" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Kategori Belanja & Pemasukan
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Daftar pos alokasi transaksi beserta nominal belanja periode ini.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-obsidian-card rounded-full border border-white/[0.08] text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-full transition cursor-pointer min-h-[32px] ${
                filterTab === "all"
                  ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Semua ({combinedCards.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("expense")}
              className={`px-3 py-1 rounded-full transition cursor-pointer min-h-[32px] ${
                filterTab === "expense"
                  ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Belanja ({expenseCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("income")}
              className={`px-3 py-1 rounded-full transition cursor-pointer min-h-[32px] ${
                filterTab === "income"
                  ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Masuk ({incomeCount})
            </button>
          </div>

          {/* + Tambah Kategori Button */}
          <button
            type="button"
            onClick={() => {
              setAddType(filterTab === "income" ? "income" : "expense");
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 bg-amberGold text-slate-950 hover:bg-amber-300 font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 min-h-[38px]"
            title="Tambah kategori transaksi baru"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span className="whitespace-nowrap">Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="w-24 h-4 rounded-full" />
                    <Skeleton className="w-16 h-3 rounded-full" />
                  </div>
                </div>
                <Skeleton className="w-16 h-4 rounded-full" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-obsidian-card/40 rounded-2xl border border-white/[0.06] text-zinc-400 text-xs sm:text-sm space-y-3">
          <p>Belum ada kategori yang sesuai dengan filter ini.</p>
          <button
            type="button"
            onClick={() => {
              setAddType(filterTab === "income" ? "income" : "expense");
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amberGold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-300 transition cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredList.map((c) => {
            const colorDef = getCategoryColorDef(c.color);
            const isExpense = c.type === "expense";
            const avgSpend = c.count > 0 ? Math.round(c.total / c.count) : 0;

            return (
              <div
                key={c.id}
                className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 sm:p-5 space-y-3 transition-all duration-200 shadow-xs flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl ${colorDef.badgeBg} ${colorDef.badgeBorder} border flex items-center justify-center shrink-0`}
                      >
                        {isExpense ? (
                          <ArrowUpRight className={`w-4 h-4 ${colorDef.badgeText}`} />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-mintRise" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-white block truncate" title={c.name}>
                          {c.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              isExpense
                                ? "bg-white/[0.06] text-zinc-400"
                                : "bg-mintRise/15 text-mintRise"
                            }`}
                          >
                            {isExpense ? "Belanja" : "Masuk"}
                          </span>
                          <span>•</span>
                          <span>{c.count} tx</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-sm text-white">
                        {formatRupiah(c.total)}
                      </div>
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          c.percentage > 0 ? colorDef.badgeText : "text-zinc-500"
                        }`}
                      >
                        {c.percentage > 0 ? `${c.percentage.toFixed(1)}%` : "0% total"}
                      </span>
                    </div>
                  </div>

                  {/* Transaction metadata or subtitle + Tactile In-Card Action Buttons */}
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-1">
                    <span className="truncate pr-2">
                      {c.count > 0
                        ? `Rata-rata ${formatRupiah(avgSpend)}/tx`
                        : "Belum ada transaksi"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(c);
                        }}
                        title={`Edit kategori ${c.name}`}
                        aria-label={`Edit kategori ${c.name}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-amberGold hover:bg-amberGold/15 border border-transparent hover:border-amberGold/30 transition-all duration-150 cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(c);
                        }}
                        title={`Hapus kategori ${c.name}`}
                        aria-label={`Hapus kategori ${c.name}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all duration-150 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${c.percentage > 0 ? Math.min(100, Math.max(4, c.percentage)) : 0}%`,
                      }}
                      className={`h-full ${colorDef.dotClass} transition-all duration-500 rounded-full`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TAMBAH KATEGORI */}
      <CustomModal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!addLoading) {
            setIsAddModalOpen(false);
            setAddError(null);
          }
        }}
        title="Tambah Kategori Baru"
        subtitle="Buat pos alokasi transaksi baru untuk pengeluaran atau pemasukan."
        icon={<Plus className="w-5 h-5 text-amberGold" />}
        accent="amber"
        maxWidth="md"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          {/* Tipe Selector: Expense vs Income */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Tipe Kategori</label>
            <div className="grid grid-cols-2 gap-2 bg-obsidian-card p-1 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setAddType("expense")}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  addType === "expense"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pengeluaran (Belanja)
              </button>
              <button
                type="button"
                onClick={() => setAddType("income")}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  addType === "income"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pemasukan (Masuk)
              </button>
            </div>
          </div>

          {/* Nama Kategori */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nama Kategori</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Contoh: Makan Harian, Langganan AI, Hiburan"
              className="w-full bg-obsidian-card border border-white/[0.08] focus:border-amberGold/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition"
              autoFocus
            />
          </div>

          {/* Pilihan Warna */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Warna Aksen</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORY_COLORS.map((col) => {
                const isSelected = addColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setAddColor(col.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? "border-amberGold bg-amberGold/15 text-white"
                        : "border-white/[0.08] bg-obsidian-card text-zinc-400 hover:text-white hover:border-white/[0.2]"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${col.dotClass}`} />
                    <span className="truncate">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {addError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={addLoading}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={addLoading || !addName.trim()}
              className="px-4 py-2 bg-amberGold text-slate-950 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Kategori</span>
            </button>
          </div>
        </form>
      </CustomModal>

      {/* MODAL EDIT KATEGORI */}
      <CustomModal
        isOpen={!!editingCat}
        onClose={() => {
          if (!editLoading) {
            setEditingCat(null);
            setEditError(null);
          }
        }}
        title="Edit Kategori"
        subtitle="Perubahan nama otomatis diperbarui ke seluruh riwayat transaksi terkait."
        icon={<Edit2 className="w-5 h-5 text-amberGold" />}
        accent="amber"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateCategory} className="space-y-4">
          {/* Tipe Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Tipe Kategori</label>
            <div className="grid grid-cols-2 gap-2 bg-obsidian-card p-1 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditType("expense")}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  editType === "expense"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pengeluaran (Belanja)
              </button>
              <button
                type="button"
                onClick={() => setEditType("income")}
                className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  editType === "income"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Pemasukan (Masuk)
              </button>
            </div>
          </div>

          {/* Nama Kategori */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nama Kategori</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nama kategori"
              className="w-full bg-obsidian-card border border-white/[0.08] focus:border-amberGold/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition"
            />
          </div>

          {/* Pilihan Warna */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Warna Aksen</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORY_COLORS.map((col) => {
                const isSelected = editColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setEditColor(col.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? "border-amberGold bg-amberGold/15 text-white"
                        : "border-white/[0.08] bg-obsidian-card text-zinc-400 hover:text-white hover:border-white/[0.2]"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${col.dotClass}`} />
                    <span className="truncate">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {editError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setEditingCat(null)}
              disabled={editLoading}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editLoading || !editName.trim()}
              className="px-4 py-2 bg-amberGold text-slate-950 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </CustomModal>

      {/* MODAL HAPUS KATEGORI */}
      <CustomModal
        isOpen={!!deletingCat}
        onClose={() => {
          if (!deleteLoading) {
            setDeletingCat(null);
            setDeleteError(null);
          }
        }}
        title="Hapus Kategori"
        subtitle="Konfirmasi penghapusan pos alokasi kategori transaksi."
        icon={<Trash2 className="w-5 h-5 text-coralFall" />}
        accent="coral"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-obsidian-card border border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-xs text-zinc-400">Kategori Target</div>
              <div className="text-sm font-bold text-white mt-0.5">{deletingCat?.name}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                deletingCat?.type === "expense"
                  ? "bg-rose-500/15 text-rose-300"
                  : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {deletingCat?.type === "expense" ? "Belanja" : "Pemasukan"}
            </span>
          </div>

          {activeDeleteTxCount > 0 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amberGold/10 border border-amberGold/25 text-amberGold text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Kategori ini digunakan oleh <strong>{activeDeleteTxCount} transaksi</strong>.
                  Pilih kategori tujuan (fallback) untuk memindahkan seluruh transaksi tersebut:
                </span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Pindahkan Transaksi Ke</label>
                <CustomSelect
                  value={fallbackCategory}
                  onChange={(val) => setFallbackCategory(val)}
                  options={fallbackSelectOptions}
                  placeholder="Pilih kategori fallback..."
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 leading-relaxed">
              Kategori ini belum memiliki transaksi pada periode aktif. Apakah Anda yakin ingin menghapus kategori <strong>{deletingCat?.name}</strong> secara permanen?
            </p>
          )}

          {deleteError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setDeletingCat(null)}
              disabled={deleteLoading}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Hapus Kategori</span>
            </button>
          </div>
        </div>
      </CustomModal>
    </section>
  );
}
