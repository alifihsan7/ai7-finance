import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Tag,
} from "lucide-react";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";
import { Skeleton } from "./ui/Skeleton";
import { TransactionTable, Transaction } from "./TransactionTable";
import { CategoryItem } from "./ManageCategoriesModal";

interface AccountTab {
  id: string;
  label: string;
}

interface TransactionLedgerViewProps {
  transactions: Transaction[];
  accounts: AccountTab[];
  categories?: CategoryItem[];
  currentCycle?: {
    start_date: string;
    end_date: string;
    label: string;
  };
  formatRupiah: (val: number) => string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onOpenAddModal: () => void;
  onOpenManageCategories?: () => void;
  loading?: boolean;
}

export function TransactionLedgerView({
  transactions,
  accounts,
  categories,
  currentCycle,
  formatRupiah,
  onEdit,
  onDelete,
  onOpenAddModal,
  onOpenManageCategories,
  loading,
}: TransactionLedgerViewProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAccount, setActiveAccount] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Dynamic Categories from API categories + available transactions
  const categoryOptions: SelectOption[] = useMemo(() => {
    const apiCats = categories ? categories.map((c) => c.name) : [];
    const txCats = transactions.map((tx) => tx.category).filter(Boolean);
    const uniqueCats = Array.from(new Set([...apiCats, ...txCats])).sort();

    return [
      { value: "all", label: "Semua Kategori" },
      ...uniqueCats.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [categories, transactions]);

  // Type filter options
  const typeOptions: SelectOption[] = [
    { value: "all", label: "Semua Tipe Transaksi" },
    { value: "expense", label: "Pengeluaran Saja (-)" },
    { value: "income", label: "Pemasukan Saja (+)" },
    { value: "transfer", label: "Transfer Antar Rekening (⇄)" },
  ];

  // Date preset options
  const dateOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: "all", label: "Semua Waktu" },
    ];
    if (currentCycle?.start_date && currentCycle?.end_date) {
      opts.push({
        value: "cycle",
        label: `Siklus Aktif (${currentCycle.label || "Saat Ini"})`,
      });
    }
    opts.push(
      { value: "this_month", label: "Bulan Ini" },
      { value: "last_7_days", label: "7 Hari Terakhir" },
      { value: "last_30_days", label: "30 Hari Terakhir" },
      { value: "custom", label: "Rentang Tanggal Kustom..." }
    );
    return opts;
  }, [currentCycle]);

  // Sort options
  const sortOptions: SelectOption[] = [
    { value: "date-desc", label: "Tanggal: Terbaru → Terlama" },
    { value: "date-asc", label: "Tanggal: Terlama → Terbaru" },
    { value: "amount-desc", label: "Nominal: Terbesar → Terkecil" },
    { value: "amount-asc", label: "Nominal: Terkecil → Terbesar" },
  ];

  // Helper date filters
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchAcc = (tx.account || "").toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchAcc) return false;
      }

      // 2. Account Filter
      if (activeAccount !== "all") {
        const txAcc = (tx.account || "").toLowerCase();
        const tab = activeAccount.toLowerCase();
        const matchTab =
          txAcc === tab ||
          txAcc.includes(tab) ||
          (tab.includes("jago") && txAcc.includes("jago"));
        if (!matchTab) return false;
      }

      // 3. Type Filter
      if (typeFilter !== "all") {
        if (typeFilter === "expense" && tx.type !== "expense") return false;
        if (typeFilter === "income" && tx.type !== "income") return false;
        if (
          typeFilter === "transfer" &&
          tx.type !== "transfer_in" &&
          tx.type !== "transfer_out"
        )
          return false;
      }

      // 4. Category Filter
      if (categoryFilter !== "all") {
        if (tx.category !== categoryFilter) return false;
      }

      // 5. Date Filter
      if (dateFilter === "cycle" && currentCycle?.start_date && currentCycle?.end_date) {
        if (tx.date < currentCycle.start_date || tx.date > currentCycle.end_date) return false;
      } else if (dateFilter === "this_month") {
        if (!tx.date.startsWith(currentYearMonth)) return false;
      } else if (dateFilter === "last_7_days") {
        if (tx.date < sevenDaysAgoStr || tx.date > todayStr) return false;
      } else if (dateFilter === "last_30_days") {
        if (tx.date < thirtyDaysAgoStr || tx.date > todayStr) return false;
      } else if (dateFilter === "custom") {
        if (customStartDate && tx.date < customStartDate) return false;
        if (customEndDate && tx.date > customEndDate) return false;
      }

      return true;
    });
  }, [
    transactions,
    searchQuery,
    activeAccount,
    typeFilter,
    categoryFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    currentCycle,
    currentYearMonth,
    sevenDaysAgoStr,
    thirtyDaysAgoStr,
    todayStr,
  ]);

  // Sort filtered transactions
  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      if (sortBy === "date-desc") {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.id - a.id;
      }
      if (sortBy === "date-asc") {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.id - b.id;
      }
      if (sortBy === "amount-desc") {
        return b.amount - a.amount;
      }
      if (sortBy === "amount-asc") {
        return a.amount - b.amount;
      }
      return 0;
    });
    return list;
  }, [filteredTransactions, sortBy]);

  // Pagination Slicing
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Quick Stats Agregat Real-Time
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === "income" || tx.type === "transfer_in") {
        income += tx.amount;
      } else if (tx.type === "expense" || tx.type === "transfer_out") {
        expense += tx.amount;
      }
    });

    const net = income - expense;
    return {
      count: filteredTransactions.length,
      income,
      expense,
      net,
    };
  }, [filteredTransactions]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (activeAccount !== "all") count++;
    if (typeFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (sortBy !== "date-desc") count++;
    return count;
  }, [searchQuery, activeAccount, typeFilter, categoryFilter, dateFilter, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveAccount("all");
    setTypeFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("date-desc");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* 1. QUICK-STATS KPI BAR (REAL-TIME AGGREGATES) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transaksi */}
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-xs font-medium truncate">Total Transaksi</span>
            <Receipt className="w-4 h-4 text-amberGold shrink-0" />
          </div>
          <div className="mt-2.5">
            {loading ? (
              <Skeleton className="h-7 w-20 rounded-full" />
            ) : (
              <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                {stats.count}{" "}
                <span className="text-xs font-normal text-zinc-400">item</span>
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {activeFiltersCount > 0 ? "Berdasarkan filter aktif" : "Seluruh catatan kas"}
            </p>
          </div>
        </div>

        {/* Total Pemasukan */}
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-xs font-medium truncate">Total Pemasukan</span>
            <div className="w-6 h-6 rounded-full bg-mintRise/15 border border-mintRise/30 flex items-center justify-center text-mintRise shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <Skeleton className="h-7 w-28 rounded-full" />
            ) : (
              <div className="text-xl sm:text-2xl font-black font-mono text-mintRise tracking-tight truncate">
                +{formatRupiah(stats.income)}
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Kas masuk & transfer terima
            </p>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-xs font-medium truncate">Total Pengeluaran</span>
            <div className="w-6 h-6 rounded-full bg-coralFall/15 border border-coralFall/30 flex items-center justify-center text-coralFall shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <Skeleton className="h-7 w-28 rounded-full" />
            ) : (
              <div className="text-xl sm:text-2xl font-black font-mono text-coralFall tracking-tight truncate">
                -{formatRupiah(stats.expense)}
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Belanja & transfer keluar
            </p>
          </div>
        </div>

        {/* Arus Kas Bersih (Net Flow) */}
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-xs font-medium truncate">Arus Kas Bersih</span>
            <div className="w-6 h-6 rounded-full bg-cyanHub/15 border border-cyanHub/30 flex items-center justify-center text-cyanHub shrink-0">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <Skeleton className="h-7 w-28 rounded-full" />
            ) : (
              <div
                className={`text-xl sm:text-2xl font-black font-mono tracking-tight truncate ${
                  stats.net >= 0 ? "text-mintRise" : "text-coralFall"
                }`}
              >
                {stats.net >= 0 ? "+" : "-"}
                {formatRupiah(Math.abs(stats.net))}
              </div>
            )}
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {stats.net >= 0 ? "Surplus kas terfilter" : "Defisit kas terfilter"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. FILTER & CONTROL PANEL */}
      <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
        {/* Top Control Bar: Search & Account Pills */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {/* Account Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 w-full lg:w-auto max-w-full">
            {accounts.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveAccount(tab.id);
                  setCurrentPage(1);
                }}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeAccount === tab.id
                    ? "text-slate-950 bg-amberGold font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Quick Add */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari transaksi, ket, atau akun..."
                className="w-full bg-obsidian-card border border-white/[0.08] rounded-2xl pl-10 pr-8 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amberGold transition font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Kelola Kategori Button */}
            {onOpenManageCategories && (
              <button
                type="button"
                onClick={onOpenManageCategories}
                className="px-3.5 py-2 bg-obsidian-card hover:bg-obsidian-hover text-zinc-200 hover:text-amberGold font-medium text-xs sm:text-sm rounded-2xl border border-white/[0.08] hover:border-amberGold/30 transition shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                title="Kelola Kategori Transaksi"
              >
                <Tag className="w-4 h-4 text-amberGold" />
                <span className="inline">Kelola Kategori</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-amberGold text-slate-950 hover:bg-amber-300 font-bold text-xs sm:text-sm rounded-2xl transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Catat Transaksi</span>
            </button>
          </div>
        </div>

        {/* Bottom Filter Controls: Type, Category, Date, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/[0.08]">
          {/* Filter Tipe Transaksi */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Tipe Transaksi
            </label>
            <CustomSelect
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
              options={typeOptions}
              accent="amber"
              className="text-xs"
            />
          </div>

          {/* Filter Kategori */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Kategori
            </label>
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setCurrentPage(1);
              }}
              options={categoryOptions}
              accent="amber"
              className="text-xs"
            />
          </div>

          {/* Filter Rentang Tanggal */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Rentang Waktu
            </label>
            <CustomSelect
              value={dateFilter}
              onChange={(val) => {
                setDateFilter(val);
                setCurrentPage(1);
              }}
              options={dateOptions}
              accent="amber"
              className="text-xs"
            />
          </div>

          {/* Pengurutan (Sort By) */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Urutkan Berdasarkan
            </label>
            <CustomSelect
              value={sortBy}
              onChange={(val) => {
                setSortBy(val);
                setCurrentPage(1);
              }}
              options={sortOptions}
              accent="amber"
              className="text-xs"
            />
          </div>
        </div>

        {/* Conditional Custom Date Range Picker */}
        {dateFilter === "custom" && (
          <div className="p-3.5 rounded-2xl bg-obsidian-card border border-white/[0.08] flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Calendar className="w-4 h-4 text-amberGold shrink-0" />
              <span className="font-medium">Rentang Tanggal Kustom:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-obsidian-panel border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amberGold"
              />
              <span className="text-zinc-500 text-xs">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-obsidian-panel border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amberGold"
              />
            </div>
          </div>
        )}

        {/* Active Filters Bar & Reset Action */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <Filter className="w-3.5 h-3.5 text-amberGold" />
              <span>
                Menampilkan hasil dengan{" "}
                <strong className="text-amberGold font-mono">{activeFiltersCount}</strong> filter aktif
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-300 hover:text-coralFall hover:bg-coralFall/10 border border-white/[0.08] hover:border-coralFall/30 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. TRANSACTION TABLE */}
      <div className="space-y-3">
        <TransactionTable
          transactions={paginatedTransactions}
          formatRupiah={formatRupiah}
          onEdit={onEdit}
          onDelete={onDelete}
          loading={loading}
        />

        {/* 4. PAGINATION FOOTER */}
        {sortedTransactions.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-1 text-xs text-zinc-400 font-mono">
            <div>
              Menampilkan{" "}
              <strong className="text-white">
                {(currentPage - 1) * pageSize + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-white">
                {Math.min(currentPage * pageSize, sortedTransactions.length)}
              </strong>{" "}
              dari{" "}
              <strong className="text-white">
                {sortedTransactions.length}
              </strong>{" "}
              transaksi terfilter
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-white/[0.08] bg-obsidian-card hover:bg-white/[0.06] text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3.5 py-1.5 rounded-xl bg-obsidian-card border border-white/[0.08] text-white font-bold">
                {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-white/[0.08] bg-obsidian-card hover:bg-white/[0.06] text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
