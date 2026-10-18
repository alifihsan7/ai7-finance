"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  X,
  CreditCard,
} from "lucide-react";

interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  account: string;
  category: string;
  description: string;
  raw_text?: string;
  date: string;
}

interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  net: number;
  savings_rate: number;
  accounts: { account: string; balance: number }[];
  categories: { category: string; total: number; count: number; percentage: number }[];
}

export default function DeepSeaDashboard() {
  const [activeTab, setActiveTab] = useState<"all" | "Mandiri" | "Jago" | "BRI 1" | "BRI 2">("all");
  const [activeNav, setActiveNav] = useState<string>("Ringkasan");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for new transaction
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formAccount, setFormAccount] = useState("Mandiri");
  const [formCategory, setFormCategory] = useState("Makanan & Minuman");
  const [formDesc, setFormDesc] = useState("");

  // Live data
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      type: "expense",
      amount: 45000,
      account: "Mandiri",
      category: "Makanan & Minuman",
      description: "Nasi Padang + Es Teh",
      date: "2026-10-18",
    },
    {
      id: 2,
      type: "income",
      amount: 1500000,
      account: "BRI 1",
      category: "Uang Saku Ortu",
      description: "Transferan Gajian 2-Mingguan",
      date: "2026-10-18",
    },
    {
      id: 3,
      type: "expense",
      amount: 25000,
      account: "Mandiri",
      category: "Jajan / Ngopi",
      description: "Kopi Kenangan",
      date: "2026-10-17",
    },
  ]);

  const [summary, setSummary] = useState<MonthlySummary>({
    month: "2026-10",
    income: 1500000,
    expense: 70000,
    net: 1430000,
    savings_rate: 95.3,
    accounts: [
      { account: "Mandiri", balance: 755000 },
      { account: "Jago", balance: 475000 },
      { account: "BRI 1", balance: 100000 },
      { account: "BRI 2", balance: 100000 },
    ],
    categories: [
      { category: "Makanan & Minuman", total: 45000, count: 1, percentage: 64.3 },
      { category: "Jajan / Ngopi", total: 25000, count: 1, percentage: 35.7 },
    ],
  });

  // Fetch real data from backend API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, sumRes] = await Promise.all([
        fetch("/api/v1/transactions?limit=50"),
        fetch("/api/v1/analytics/summary"),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData) && txData.length > 0) {
          setTransactions(txData);
        }
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary((prev) => ({
          ...prev,
          ...sumData,
        }));
      }
    } catch {
      // Backend maybe offline or cross-origin dev; keep initial seed state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(formAmount.replace(/\D/g, ""), 10);
    if (!numAmount || !formDesc.trim()) return;

    const newTx: Transaction = {
      id: Date.now(),
      type: formType,
      amount: numAmount,
      account: formAccount,
      category: formCategory,
      description: formDesc.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    setTransactions((prev) => [newTx, ...prev]);
    setIsModalOpen(false);
    setFormAmount("");
    setFormDesc("");

    // Send to backend
    try {
      await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          amount: numAmount,
          account: formAccount,
          category: formCategory,
          description: formDesc.trim(),
        }),
      });
      fetchData();
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchTab = activeTab === "all" || tx.account.toLowerCase().includes(activeTab.toLowerCase());
      const matchSearch =
        !searchQuery ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.account.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [transactions, activeTab, searchQuery]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Envelopes calculation for Mandiri
  const mandiriExpenses = useMemo(() => {
    const expenses = {
      makan: 0,
      jajan: 0,
      laundry: 0,
      galon: 0,
    };
    transactions.forEach((tx) => {
      if (tx.type === "expense" && tx.account.toLowerCase().includes("mandiri")) {
        const cat = tx.category.toLowerCase();
        const desc = tx.description.toLowerCase();
        if (cat.includes("makan") || desc.includes("nasi") || desc.includes("ayam")) expenses.makan += tx.amount;
        else if (cat.includes("jajan") || desc.includes("kopi") || desc.includes("snack")) expenses.jajan += tx.amount;
        else if (cat.includes("laundry") || desc.includes("cuci")) expenses.laundry += tx.amount;
        else if (cat.includes("galon") || desc.includes("air")) expenses.galon += tx.amount;
      }
    });
    return expenses;
  }, [transactions]);

  return (
    <div className="min-h-screen bg-abyss text-foam flex flex-col md:flex-row antialiased font-sans">
      {/* LEFT RAIL NAVIGATION (Wailx Inspired) */}
      <aside className="w-full md:w-56 bg-trench border-r border-line p-5 md:min-h-screen flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="font-display font-semibold text-2xl tracking-tight text-foam flex items-center gap-1">
            ai7<span className="text-sodium text-3xl leading-none">.</span>finance
          </div>
          <div className="text-[11px] text-mist tracking-wider uppercase font-medium mt-1">
            Deep Sea System
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 border-l border-line flex flex-col space-y-1">
            {[
              { name: "Ringkasan", count: null },
              { name: "Alokasi Amplop", count: "4 pos" },
              { name: "Rekening & Akun", count: "4 akun" },
              { name: "Buku Transaksi", count: transactions.length },
              { name: "Analisis & Tren", count: null },
            ].map((item) => {
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={`flex justify-between items-center px-4 py-2 text-xs md:text-[13px] border-l-2 -ml-[1px] transition-all text-left ${
                    isActive
                      ? "text-foam border-sodium font-medium bg-shelf/30"
                      : "text-mist border-transparent hover:text-foam hover:border-line"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.count && (
                    <span className="text-[11px] text-sodium font-mono">{item.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Bot Status */}
        <div className="mt-8 pt-4 border-t border-line text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-foam font-medium text-sm">Alif Ihsan</span>
            <span className="flex items-center gap-1 text-[11px] text-rise">
              <span className="w-1.5 h-1.5 rounded-full bg-rise animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="text-mist text-[11px] leading-relaxed">
            Bot: <span className="text-foam/80 font-mono">@AI7Fin4nc3_bot</span>
            <br />
            Mode: <span className="text-sodium">Bi-Weekly Paycheck</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-xl md:text-2xl font-semibold text-foam">
                Ringkasan Portofolio & Alokasi
              </h1>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-shelf border border-line text-mist">
                11 Okt – 24 Okt (Hari 8/14)
              </span>
            </div>
            <p className="text-xs text-mist mt-1">
              Siklus berjalan 2-mingguan dengan pengawasan amplop belanja Mandiri
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="px-3 py-2 text-xs border border-line rounded bg-transparent text-mist hover:text-foam hover:bg-shelf transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              href="/api/v1/transactions/export"
              download
              className="px-3 py-2 text-xs border border-line rounded bg-transparent text-foam hover:bg-shelf transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-mist" />
              <span>Ekspor CSV</span>
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded bg-sodium text-[#1a1405] hover:bg-[#f7c767] transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi</span>
            </button>
          </div>
        </div>

        {/* HERO ESTIMATED TOTAL ASSETS (Wailx Inspired) */}
        <div className="py-6 border-b border-line">
          <div className="text-xs text-mist font-medium tracking-wide">
            ESTIMATED TOTAL ASSETS (NET WORTH)
          </div>
          <div className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foam my-1.5">
            {formatRupiah(summary.income - summary.expense)}{" "}
            <span className="text-sm sm:text-base font-normal text-mist tracking-normal">
              IDR
            </span>
          </div>
          <div className="text-xs text-mist flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-rise flex items-center font-mono">
              ▲ {formatRupiah(summary.income)} gajian siklus ini
            </span>
            <span className="text-line">•</span>
            <span className="text-fall flex items-center font-mono">
              ▼ {formatRupiah(summary.expense)} total pengeluaran
            </span>
            <span className="text-line">•</span>
            <span className="text-mist font-mono">
              Savings rate: <strong className="text-foam">{summary.savings_rate}%</strong>
            </span>
          </div>
        </div>

        {/* STRATA ALOKASI GAJIAN BAR (Segmented Wailx Style) */}
        <div className="py-6 border-b border-line">
          <div className="flex justify-between items-center mb-2.5">
            <div className="text-xs text-mist font-medium">
              DISTRIBUSI ALOKASI GAJIAN (Rp 1.500.000 / 2 MINGGU)
            </div>
            <div className="text-[11px] text-sodium font-mono">Formula Excel User</div>
          </div>

          {/* Segmented Bar */}
          <div className="flex gap-1 h-4 rounded overflow-hidden p-0.5 bg-trench border border-line">
            <div
              style={{ flex: 55 }}
              className="bg-sodium rounded-l-sm transition-all hover:brightness-110"
              title="Mandiri: 55% (Rp 825.000)"
            ></div>
            <div
              style={{ flex: 31.7 }}
              className="bg-rise transition-all hover:brightness-110"
              title="Bank Jago: 31.7% (Rp 475.000)"
            ></div>
            <div
              style={{ flex: 6.7 }}
              className="bg-[#4aa3b8] transition-all hover:brightness-110"
              title="BRI 1: 6.7% (Rp 100.000)"
            ></div>
            <div
              style={{ flex: 6.7 }}
              className="bg-[#a9c4a0] rounded-r-sm transition-all hover:brightness-110"
              title="BRI 2: 6.7% (Rp 100.000)"
            ></div>
          </div>

          {/* Strata Labels */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-1 text-xs">
            <div className="border-l-2 border-sodium pl-2">
              <div className="text-foam font-medium">Mandiri (55.0%)</div>
              <div className="text-mist font-mono text-[11px]">Rp 825.000 • Saku Harian</div>
            </div>
            <div className="border-l-2 border-rise pl-2">
              <div className="text-foam font-medium">Jago / Bibit (31.7%)</div>
              <div className="text-mist font-mono text-[11px]">Rp 475.000 • Subs & Invest</div>
            </div>
            <div className="border-l-2 border-[#4aa3b8] pl-2">
              <div className="text-foam font-medium">BRI 1 (6.7%)</div>
              <div className="text-mist font-mono text-[11px]">Rp 100.000 • Hub / Darurat</div>
            </div>
            <div className="border-l-2 border-[#a9c4a0] pl-2">
              <div className="text-foam font-medium">BRI 2 (6.7%)</div>
              <div className="text-mist font-mono text-[11px]">Rp 100.000 • Tabungan Kunci</div>
            </div>
          </div>
        </div>

        {/* 4 REKENING OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-6 border-b border-line">
          {[
            {
              name: "Mandiri",
              tag: "Saku Operasional",
              allocated: 825000,
              spent: summary.expense,
              accent: "border-sodium/50",
            },
            {
              name: "Bank Jago / Bibit",
              tag: "Subs & Portofolio",
              allocated: 475000,
              spent: 0,
              accent: "border-rise/50",
            },
            {
              name: "BRI 1",
              tag: "Hub & Dana Darurat",
              allocated: 100000,
              spent: 0,
              accent: "border-[#4aa3b8]/50",
            },
            {
              name: "BRI 2",
              tag: "Tabungan Terkunci",
              allocated: 100000,
              spent: 0,
              accent: "border-[#a9c4a0]/50",
            },
          ].map((acc) => {
            const remaining = acc.allocated - acc.spent;
            const pctUsed = Math.min(100, Math.round((acc.spent / acc.allocated) * 100));
            return (
              <div
                key={acc.name}
                className={`bg-trench border border-line rounded p-4 relative overflow-hidden group hover:border-mist/40 transition`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-foam font-medium text-sm flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-mist" />
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-mist mt-0.5">{acc.tag}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-shelf text-mist border border-line">
                    2 Minggu
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] text-mist">Sisa Anggaran</div>
                  <div className="font-display text-lg font-semibold text-foam font-mono">
                    {formatRupiah(remaining)}
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-mist font-mono mb-1">
                    <span>Terpakai {pctUsed}%</span>
                    <span>Plapon: {formatRupiah(acc.allocated)}</span>
                  </div>
                  <div className="h-1 bg-shelf rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctUsed}%` }}
                      className={`h-full ${
                        pctUsed > 85 ? "bg-fall" : pctUsed > 60 ? "bg-sodium" : "bg-rise"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MID SECTION: AMPLOP BELANJA MANDIRI BREAKDOWN */}
        <div className="py-6 border-b border-line">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-foam uppercase tracking-wide">
                Amplop Belanja Mandiri (Alokasi Rp 825.000)
              </h3>
              <p className="text-xs text-mist mt-0.5">
                Monitoring limit pos pengeluaran harian agar tidak boncos sebelum gajian berikutnya
              </p>
            </div>
            <span className="text-xs text-sodium font-mono">Reset per 14 hari</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Makan",
                limit: 450000,
                spent: mandiriExpenses.makan || 45000,
                note: "Makan harian warung / kost",
              },
              {
                title: "Jajan & Kopi",
                limit: 100000,
                spent: mandiriExpenses.jajan || 25000,
                note: "Ngopi, camilan, nongkrong",
              },
              {
                title: "Laundry",
                limit: 70000,
                spent: mandiriExpenses.laundry || 0,
                note: "Cuci pakaian mingguan",
              },
              {
                title: "Galon & Air",
                limit: 44000,
                spent: mandiriExpenses.galon || 0,
                note: "Air minum isi ulang",
              },
            ].map((env) => {
              const rem = env.limit - env.spent;
              const pct = Math.min(100, Math.round((env.spent / env.limit) * 100));
              return (
                <div key={env.title} className="bg-trench border border-line rounded p-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-foam font-medium text-xs">{env.title}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        pct > 80
                          ? "bg-fall/10 border-fall/40 text-fall"
                          : "bg-shelf border-line text-mist"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 text-base font-display font-semibold text-foam font-mono">
                    {formatRupiah(rem)}{" "}
                    <span className="text-[10px] text-mist font-normal">sisa</span>
                  </div>
                  <div className="h-1 bg-shelf rounded-full overflow-hidden mt-2">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full ${pct > 80 ? "bg-fall" : "bg-sodium"}`}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-mist font-mono mt-1.5">
                    <span>Budget: {formatRupiah(env.limit)}</span>
                    <span>Terpakai: {formatRupiah(env.spent)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SECTION: TRANSACTIONS TABLE */}
        <div className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-line w-full sm:w-auto pb-1 sm:pb-0 overflow-x-auto">
              {(
                [
                  { id: "all", label: "Semua Akun" },
                  { id: "Mandiri", label: "Mandiri" },
                  { id: "Jago", label: "Bank Jago" },
                  { id: "BRI 1", label: "BRI 1" },
                  { id: "BRI 2", label: "BRI 2" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-xs px-3 py-1.5 border-b-2 font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-foam border-sodium"
                      : "text-mist border-transparent hover:text-foam"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-mist absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi / ket..."
                className="w-full bg-trench border border-line rounded pl-8 pr-3 py-1.5 text-xs text-foam placeholder-mist focus:outline-none focus:border-sodium transition font-mono"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-line rounded overflow-hidden bg-trench">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-shelf/50 text-mist font-medium">
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">Keterangan</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Akun</th>
                    <th className="py-2.5 px-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-mist">
                        Tidak ada transaksi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      return (
                        <tr key={tx.id} className="hover:bg-shelf/40 transition">
                          <td className="py-2.5 px-4 text-mist font-mono whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-2.5 px-4 text-foam font-medium">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-shelf border border-line text-mist font-mono">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-mist font-mono">
                            {tx.account}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono font-medium whitespace-nowrap ${
                              isIncome ? "text-rise" : "text-fall"
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
        </div>
      </main>

      {/* QUICK ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-trench border border-line rounded-lg w-full max-w-md p-5 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-mist hover:text-foam"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-display font-semibold text-base text-foam mb-1">
              Catat Transaksi Baru
            </h3>
            <p className="text-xs text-mist mb-4">
              Transaksi otomatis tersimpan ke PostgreSQL & memotong budget rekening
            </p>

            <form onSubmit={handleCreateTransaction} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-shelf p-1 rounded border border-line">
                <button
                  type="button"
                  onClick={() => setFormType("expense")}
                  className={`py-1.5 text-xs font-medium rounded transition ${
                    formType === "expense"
                      ? "bg-fall text-abyss font-semibold"
                      : "text-mist hover:text-foam"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`py-1.5 text-xs font-medium rounded transition ${
                    formType === "income"
                      ? "bg-rise text-abyss font-semibold"
                      : "text-mist hover:text-foam"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] text-mist mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 25000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-abyss border border-line rounded px-3 py-2 text-sm text-foam font-mono focus:outline-none focus:border-sodium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] text-mist mb-1">Keterangan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nasi Goreng Spesial"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-abyss border border-line rounded px-3 py-2 text-xs text-foam focus:outline-none focus:border-sodium"
                />
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-mist mb-1">Akun / Rekening</label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full bg-abyss border border-line rounded px-2.5 py-2 text-xs text-foam focus:outline-none focus:border-sodium"
                  >
                    <option value="Mandiri">Mandiri (Saku)</option>
                    <option value="Jago">Bank Jago</option>
                    <option value="BRI 1">BRI 1 (Hub)</option>
                    <option value="BRI 2">BRI 2 (Nabung)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-mist mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-abyss border border-line rounded px-2.5 py-2 text-xs text-foam focus:outline-none focus:border-sodium"
                  >
                    <option value="Makanan & Minuman">Makanan & Minuman</option>
                    <option value="Jajan / Ngopi">Jajan / Ngopi</option>
                    <option value="Laundry">Laundry</option>
                    <option value="Galon / Air">Galon / Air</option>
                    <option value="Uang Saku Ortu">Uang Saku Ortu</option>
                    <option value="Langganan & Servis">Langganan & Servis</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-mist hover:text-foam border border-line rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-sodium text-abyss hover:bg-[#f7c767] rounded transition"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
