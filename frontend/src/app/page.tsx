"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  X,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
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

export default function ObsidianDashboard() {
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

  // Live / initial seed data
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
      description: "Kopi Kenangan Mantan",
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
      // Offline fallback
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
      console.error("API Error:", err);
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
    <div className="min-h-screen bg-obsidian-bg text-slateText-primary flex flex-col md:flex-row antialiased font-sans">
      {/* SIDEBAR NAVIGATION (Clean Obsidian Slate) */}
      <aside className="w-full md:w-64 bg-obsidian-panel border-r border-obsidian-border p-6 md:min-h-screen flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amberGold/15 border border-amberGold/40 flex items-center justify-center text-amberGold font-mono font-bold text-base">
              A7
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight text-slateText-primary leading-none">
                ai7<span className="text-amberGold">.</span>finance
              </div>
              <div className="text-xs text-slateText-muted tracking-wider uppercase font-medium mt-1">
                Obsidian Slate
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="mt-9 flex flex-col space-y-1.5">
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
                  className={`flex justify-between items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive
                      ? "text-slateText-primary bg-obsidian-hover border border-obsidian-borderStrong text-amberGold shadow-xs"
                      : "text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-card"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.count && (
                    <span className="text-xs text-amberGold font-mono px-2 py-0.5 rounded-md bg-amberGold/10 border border-amberGold/20">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Bot Status */}
        <div className="mt-8 pt-5 border-t border-obsidian-border text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slateText-primary font-semibold text-sm">Alif Ihsan</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-mintRise font-medium px-2 py-0.5 rounded-full bg-mintRise/10 border border-mintRise/20">
              <span className="w-1.5 h-1.5 rounded-full bg-mintRise animate-pulse"></span>
              Live Synced
            </span>
          </div>
          <div className="text-xs text-slateText-secondary space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slateText-muted">Telegram Bot</span>
              <span className="font-mono text-slateText-primary">@AI7Fin4nc3_bot</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slateText-muted">Siklus</span>
              <span className="text-amberGold font-medium">Bi-Weekly 14 Hari</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto space-y-8">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-obsidian-border">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slateText-primary">
                Ringkasan Portofolio & Alokasi
              </h1>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-obsidian-card border border-obsidian-border text-slateText-secondary">
                11 Okt – 24 Okt (Hari 8/14)
              </span>
            </div>
            <p className="text-sm text-slateText-secondary mt-1.5">
              Sistem keuangan 2-mingguan terintegrasi PostgreSQL & Telegram Bot
            </p>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-obsidian-border rounded-lg bg-obsidian-card text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover hover:border-obsidian-borderStrong transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amberGold" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <a
              href="/api/v1/transactions/export"
              download
              className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-obsidian-border rounded-lg bg-obsidian-card text-slateText-primary hover:bg-obsidian-hover hover:border-obsidian-borderStrong transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-slateText-muted" />
              <span>Ekspor CSV</span>
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amberGold text-[#0B0D11] hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Catat Transaksi</span>
            </button>
          </div>
        </div>

        {/* HERO METRIC: TOTAL ASSETS / NET WORTH */}
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-6 sm:p-8 relative overflow-hidden">
          <div className="text-xs sm:text-sm font-semibold text-slateText-muted uppercase tracking-wider">
            Total Kekayaan Bersih (Net Worth)
          </div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slateText-primary my-3 font-mono">
            {formatRupiah(summary.income - summary.expense)}{" "}
            <span className="text-base sm:text-lg font-normal text-slateText-muted tracking-normal">
              IDR
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm pt-2 border-t border-obsidian-border/80">
            <span className="inline-flex items-center gap-1.5 text-mintRise font-mono font-medium">
              <ArrowUpRight className="w-4 h-4" />
              {formatRupiah(summary.income)} gajian siklus ini
            </span>
            <span className="text-obsidian-borderStrong">•</span>
            <span className="inline-flex items-center gap-1.5 text-coralFall font-mono font-medium">
              <ArrowDownRight className="w-4 h-4" />
              {formatRupiah(summary.expense)} total belanja
            </span>
            <span className="text-obsidian-borderStrong">•</span>
            <span className="text-slateText-secondary font-mono">
              Tingkat Tabungan: <strong className="text-slateText-primary">{summary.savings_rate}%</strong>
            </span>
          </div>
        </div>

        {/* STRATA ALOKASI GAJIAN (Wailx Inspired Segmented Bar) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slateText-primary">
                Distribusi Alokasi Uang Saku
              </h2>
              <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
                Plafon standar Rp 1.500.000 / 14 hari langsung dipecah ke 4 rekening
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-amberGold px-2.5 py-1 rounded bg-amberGold/10 border border-amberGold/20">
              Bi-Weekly Formula
            </span>
          </div>

          {/* High-Contrast Segmented Bar */}
          <div className="flex gap-1.5 h-6 rounded-lg overflow-hidden p-1 bg-obsidian-panel border border-obsidian-border">
            <div
              style={{ flex: 55 }}
              className="bg-amberGold rounded-l-md transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold text-obsidian-bg"
              title="Mandiri: 55% (Rp 825.000)"
            >
              55%
            </div>
            <div
              style={{ flex: 31.7 }}
              className="bg-mintRise transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold text-obsidian-bg"
              title="Bank Jago: 31.7% (Rp 475.000)"
            >
              31.7%
            </div>
            <div
              style={{ flex: 6.7 }}
              className="bg-cyanHub transition-all hover:brightness-110"
              title="BRI 1: 6.7% (Rp 100.000)"
            ></div>
            <div
              style={{ flex: 6.7 }}
              className="bg-purpleLock rounded-r-md transition-all hover:brightness-110"
              title="BRI 2: 6.7% (Rp 100.000)"
            ></div>
          </div>

          {/* Strata Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="border-l-2 border-amberGold pl-3 py-0.5">
              <div className="text-slateText-primary font-semibold text-sm">Mandiri (55.0%)</div>
              <div className="text-slateText-secondary font-mono text-xs mt-0.5">
                Rp 825.000 • Saku Harian
              </div>
            </div>
            <div className="border-l-2 border-mintRise pl-3 py-0.5">
              <div className="text-slateText-primary font-semibold text-sm">Jago / Bibit (31.7%)</div>
              <div className="text-slateText-secondary font-mono text-xs mt-0.5">
                Rp 475.000 • Subs & Invest
              </div>
            </div>
            <div className="border-l-2 border-cyanHub pl-3 py-0.5">
              <div className="text-slateText-primary font-semibold text-sm">BRI 1 (6.7%)</div>
              <div className="text-slateText-secondary font-mono text-xs mt-0.5">
                Rp 100.000 • Hub & Darurat
              </div>
            </div>
            <div className="border-l-2 border-purpleLock pl-3 py-0.5">
              <div className="text-slateText-primary font-semibold text-sm">BRI 2 (6.7%)</div>
              <div className="text-slateText-secondary font-mono text-xs mt-0.5">
                Rp 100.000 • Tabungan Kunci
              </div>
            </div>
          </div>
        </div>

        {/* 4 CORE ACCOUNT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: "Mandiri",
              tag: "Saku Operasional",
              allocated: 825000,
              spent: summary.expense,
              accentColor: "text-amberGold",
              barColor: "bg-amberGold",
            },
            {
              name: "Bank Jago / Bibit",
              tag: "Subs & Investasi",
              allocated: 475000,
              spent: 0,
              accentColor: "text-mintRise",
              barColor: "bg-mintRise",
            },
            {
              name: "BRI 1",
              tag: "Hub & Dana Darurat",
              allocated: 100000,
              spent: 0,
              accentColor: "text-cyanHub",
              barColor: "bg-cyanHub",
            },
            {
              name: "BRI 2",
              tag: "Tabungan Terkunci",
              allocated: 100000,
              spent: 0,
              accentColor: "text-purpleLock",
              barColor: "bg-purpleLock",
            },
          ].map((acc) => {
            const remaining = acc.allocated - acc.spent;
            const pctUsed = Math.min(100, Math.round((acc.spent / acc.allocated) * 100));
            return (
              <div
                key={acc.name}
                className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-5 transition-all shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-slateText-primary font-bold text-base flex items-center gap-2">
                      <CreditCard className={`w-4 h-4 ${acc.accentColor}`} />
                      {acc.name}
                    </div>
                    <div className="text-xs text-slateText-muted mt-1">{acc.tag}</div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-obsidian-panel text-slateText-secondary border border-obsidian-border">
                    14 Hari
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-xs text-slateText-muted">Sisa Anggaran</div>
                  <div className="text-2xl font-bold font-mono text-slateText-primary mt-0.5">
                    {formatRupiah(remaining)}
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slateText-secondary font-mono mb-1.5">
                    <span>Terpakai {pctUsed}%</span>
                    <span>Plafon: {formatRupiah(acc.allocated)}</span>
                  </div>
                  <div className="h-1.5 bg-obsidian-panel rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctUsed}%` }}
                      className={`h-full ${
                        pctUsed > 85 ? "bg-coralFall" : pctUsed > 60 ? "bg-amberGold" : acc.barColor
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AMPLOP BELANJA MANDIRI BREAKDOWN */}
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
            {[
              {
                title: "Makan Harian",
                limit: 450000,
                spent: mandiriExpenses.makan || 45000,
                note: "Warung, kost, resto",
              },
              {
                title: "Jajan & Kopi",
                limit: 100000,
                spent: mandiriExpenses.jajan || 25000,
                note: "Ngopi, cemilan santai",
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

        {/* TRANSAKSI TERAKHIR (Data Grid) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-obsidian-border w-full sm:w-auto pb-1.5 overflow-x-auto">
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
                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-slateText-primary bg-obsidian-card border border-obsidian-borderStrong font-semibold shadow-xs"
                      : "text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slateText-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi / keterangan..."
                className="w-full bg-obsidian-card border border-obsidian-border rounded-lg pl-9 pr-3.5 py-2 text-sm text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-amberGold transition font-mono"
              />
            </div>
          </div>

          {/* Table Container */}
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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slateText-muted">
                        Tidak ada transaksi yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-obsidian-hover transition"
                        >
                          <td className="py-3.5 px-5 text-slateText-secondary font-mono whitespace-nowrap text-xs sm:text-sm">
                            {tx.date}
                          </td>
                          <td className="py-3.5 px-5 text-slateText-primary font-medium">
                            {tx.description}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="px-2.5 py-1 rounded-md text-xs bg-obsidian-panel border border-obsidian-border text-slateText-secondary font-mono">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-slateText-secondary font-mono text-xs sm:text-sm">
                            {tx.account}
                          </td>
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
        </div>
      </main>

      {/* QUICK ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-obsidian-card border border-obsidian-borderStrong rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slateText-muted hover:text-slateText-primary"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slateText-primary mb-1">
              Catat Transaksi Baru
            </h3>
            <p className="text-xs text-slateText-secondary mb-5">
              Tersimpan langsung ke database PostgreSQL & otomatis memotong amplop anggaran
            </p>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-obsidian-panel p-1 rounded-lg border border-obsidian-border">
                <button
                  type="button"
                  onClick={() => setFormType("expense")}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition ${
                    formType === "expense"
                      ? "bg-coralFall text-[#0B0D11] shadow-xs"
                      : "text-slateText-secondary hover:text-slateText-primary"
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`py-2 text-xs sm:text-sm font-semibold rounded-md transition ${
                    formType === "income"
                      ? "bg-mintRise text-[#0B0D11] shadow-xs"
                      : "text-slateText-secondary hover:text-slateText-primary"
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slateText-secondary mb-1.5">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 25000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3.5 py-2.5 text-base text-slateText-primary font-mono focus:outline-none focus:border-amberGold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slateText-secondary mb-1.5">
                  Keterangan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nasi Padang + Es Teh"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3.5 py-2 text-sm text-slateText-primary focus:outline-none focus:border-amberGold"
                />
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slateText-secondary mb-1.5">
                    Akun Rekening
                  </label>
                  <select
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3 py-2 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold"
                  >
                    <option value="Mandiri">Mandiri (Saku)</option>
                    <option value="Jago">Bank Jago</option>
                    <option value="BRI 1">BRI 1 (Hub)</option>
                    <option value="BRI 2">BRI 2 (Nabung)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slateText-secondary mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3 py-2 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold"
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

              {/* Modal Buttons */}
              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold bg-amberGold text-[#0B0D11] hover:bg-amber-400 rounded-lg transition"
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
