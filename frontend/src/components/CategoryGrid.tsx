"use client";

import React, { useState, useMemo } from "react";
import { Tag, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { CategoryItem } from "./ManageCategoriesModal";
import { getCategoryColorDef } from "@/lib/categoryColors";
import { Skeleton } from "./ui/Skeleton";

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
  onOpenManageCategories: () => void;
}

export function CategoryGrid({
  categories,
  summaryCategories = [],
  formatRupiah,
  loading = false,
  onOpenManageCategories,
}: CategoryGridProps) {
  const [filterTab, setFilterTab] = useState<"all" | "expense" | "income">("all");

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

          {/* Kelola Kategori Button */}
          <button
            type="button"
            onClick={onOpenManageCategories}
            className="px-3.5 py-2 bg-obsidian-card hover:bg-obsidian-hover text-zinc-200 hover:text-amberGold font-semibold text-xs sm:text-sm rounded-2xl border border-white/[0.08] hover:border-amberGold/30 transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 min-h-[44px]"
            title="Buka panel kelola pos kategori"
          >
            <Tag className="w-4 h-4 text-amberGold shrink-0" />
            <span className="whitespace-nowrap">Kelola Kategori</span>
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
            onClick={onOpenManageCategories}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amberGold text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-300 transition cursor-pointer min-h-[44px]"
          >
            <Tag className="w-3.5 h-3.5" />
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
                className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 sm:p-5 space-y-3 transition-all duration-200 shadow-xs flex flex-col justify-between"
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

                  {/* Transaction metadata or subtitle */}
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-1">
                    <span>
                      {c.count > 0
                        ? `Rata-rata ${formatRupiah(avgSpend)}/tx`
                        : "Belum ada transaksi periode ini"}
                    </span>
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
    </section>
  );
}
