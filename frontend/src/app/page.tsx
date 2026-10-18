"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Wallet,
  Bell,
  BarChart2,
  LayoutDashboard,
  ArrowLeftRight,
} from "lucide-react";
import { StrataAllocationBar } from "@/components/StrataAllocation";
import { AccountGrid } from "@/components/AccountGrid";
import { MandiriEnvelopes } from "@/components/MandiriEnvelopes";
import { BurnRateChart } from "@/components/BurnRateChart";
import { TransactionTable, Transaction } from "@/components/TransactionTable";
import { SubscriptionsView, SubscriptionItem, SubscriptionsData } from "@/components/SubscriptionsView";
import { TransferModal } from "@/components/TransferModal";
import { AddAccountModal } from "@/components/AddAccountModal";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { AccountItem } from "@/components/AccountGrid";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

import { PeriodSelector, PeriodOption } from "@/components/PeriodSelector";

interface MonthlySummary {
  period_type?: string;
  period_label?: string;
  start_date?: string;
  end_date?: string;
  month: string;
  income: number;
  expense: number;
  net: number;
  savings_rate: number;
  total_balance: number;
  accounts: { account: string; balance: number }[];
  categories: { category: string; total: number; count: number; percentage: number }[];
  safe_to_spend?: {
    cycle_start: string;
    cycle_end: string;
    day_of_cycle: number;
    days_remaining: number;
    pocket_budget: number;
    pocket_spent: number;
    pocket_remaining: number;
    safe_daily: number;
    pace_status: "ahead" | "on_track" | "warning";
    ideal_pace_today: number;
    burn_chart: {
      day: number;
      date: string;
      spent: number;
      cumulative_spent: number;
      ideal_pace: number;
    }[];
  };
}

const TX_ACCOUNT_OPTIONS = [
  { value: "Mandiri", label: "Mandiri (Saku Operasional)", color: "bg-blue-500", description: "Pos belanja harian & saku" },
  { value: "Bank Jago", label: "Bank Jago (Subs & Bills)", color: "bg-purple-500", description: "Pos langganan rutin" },
  { value: "Bibit", label: "Bibit (Investasi Reksadana/Saham)", color: "bg-teal-500", description: "Portofolio tabungan investasi" },
  { value: "BRI 1", label: "BRI 1 (Income Hub)", color: "bg-cyan-500", description: "Rekening penampung utama" },
  { value: "BRI 2", label: "BRI 2 (Nabung / Dana Dingin)", color: "bg-emerald-500", description: "Pos tabungan & investasi" },
  { value: "Cash", label: "Cash (Uang Tunai)", color: "bg-amber-500", description: "Uang tunai fisik" },
];

const TX_CATEGORY_OPTIONS = [
  { value: "Makanan & Minuman", label: "Makanan & Minuman" },
  { value: "Jajan / Ngopi", label: "Jajan / Ngopi" },
  { value: "Laundry", label: "Laundry" },
  { value: "Galon / Air", label: "Galon / Air" },
  { value: "Pendidikan & Tools", label: "Pendidikan & Tools" },
  { value: "Perawatan Diri", label: "Perawatan Diri" },
  { value: "Social & Hiburan", label: "Social & Hiburan" },
  { value: "Kesehatan & Gym", label: "Kesehatan & Gym" },
  { value: "Langganan & Servis", label: "Langganan & Servis" },
  { value: "Uang Saku Ortu", label: "Uang Saku Ortu" },
  { value: "Dana Darurat", label: "Dana Darurat" },
  { value: "Lainnya", label: "Lainnya" },
];

const SUB_CATEGORY_OPTIONS = [
  { value: "Produktivitas & AI", label: "Produktivitas & AI" },
  { value: "Hiburan / Streaming", label: "Hiburan / Streaming" },
  { value: "Cloud Backup", label: "Cloud Backup" },
  { value: "Gym & Fitness", label: "Gym & Fitness" },
  { value: "Tagihan Utilitas", label: "Tagihan Utilitas" },
  { value: "Lainnya", label: "Lainnya" },
];

const SUB_ACCOUNT_OPTIONS = [
  { value: "Jago", label: "Bank Jago (Subs)", color: "bg-purple-500" },
  { value: "Mandiri", label: "Mandiri (Saku)", color: "bg-blue-500" },
  { value: "BRI 1", label: "BRI 1 (Hub)", color: "bg-cyan-500" },
];

export default function ObsidianDashboard() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeNav, setActiveNav] = useState<string>("Ringkasan");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaycheckModalOpen, setIsPaycheckModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [customAccounts, setCustomAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>({
    id: "cycle_current",
    type: "cycle",
    label: "Siklus 14 Hari (Aktif)",
    start: "2026-10-11",
    end: "2026-10-24",
    is_current: true,
  });
  const [paycheckLoading, setPaycheckLoading] = useState(false);
  const [subToDelete, setSubToDelete] = useState<number | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paycheckTotal, setPaycheckTotal] = useState<string>("1500000");

  // Form state for new transaction
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Makanan & Minuman");
  const [formAccount, setFormAccount] = useState("Mandiri");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form state for new subscription
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCategory, setSubCategory] = useState("Produktivitas & AI");
  const [subAccount, setSubAccount] = useState("Jago");
  const [subBillingDay, setSubBillingDay] = useState("1");
  const [subNotes, setSubNotes] = useState("");

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
    expense: 265000,
    net: 1235000,
    savings_rate: 82.3,
    total_balance: 4355049,
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
    safe_to_spend: {
      cycle_start: "2026-10-18",
      cycle_end: "2026-10-31",
      day_of_cycle: 1,
      days_remaining: 14,
      pocket_budget: 825000,
      pocket_spent: 70000,
      pocket_remaining: 755000,
      safe_daily: 53928,
      pace_status: "ahead",
      ideal_pace_today: 58928,
      burn_chart: Array.from({ length: 14 }).map((_, i) => ({
        day: i + 1,
        date: `2026-10-${String(18 + i).padStart(2, "0")}`,
        spent: i === 0 ? 70000 : 0,
        cumulative_spent: 70000,
        ideal_pace: Math.round((825000 / 14) * (i + 1)),
      })),
    },
  });

  const [subsData, setSubsData] = useState<SubscriptionsData>({
    total_monthly_commitment: 404990,
    active_count: 3,
    upcoming_this_week: 2,
    items: [
      {
        id: 1,
        name: "ChatGPT Plus",
        amount: 335000,
        category: "Produktivitas & AI",
        account: "Jago",
        billing_cycle: "monthly",
        billing_day: 19,
        is_active: true,
        days_until_due: 1,
        next_billing_date: "2026-10-19",
        notes: "Kartu debit Jago",
      },
      {
        id: 2,
        name: "Spotify Premium",
        amount: 54990,
        category: "Hiburan / Musik",
        account: "Jago",
        billing_cycle: "monthly",
        billing_day: 25,
        is_active: true,
        days_until_due: 7,
        next_billing_date: "2026-10-25",
        notes: "Autodebet bulanan",
      },
      {
        id: 3,
        name: "iCloud Storage 50GB",
        amount: 15000,
        category: "Cloud Backup",
        account: "Jago",
        billing_cycle: "monthly",
        billing_day: 12,
        is_active: true,
        days_until_due: 25,
        next_billing_date: "2026-11-12",
        notes: "Apple ID backup",
      },
    ],
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      const periodParams = new URLSearchParams();
      periodParams.append("period_type", selectedPeriod.type);
      if (selectedPeriod.start) periodParams.append("start", selectedPeriod.start);
      if (selectedPeriod.end) periodParams.append("end", selectedPeriod.end);
      if (selectedPeriod.month) periodParams.append("month", selectedPeriod.month);

      const txParams = new URLSearchParams();
      txParams.append("limit", "100");
      if (selectedPeriod.start) txParams.append("start_date", selectedPeriod.start);
      if (selectedPeriod.end) txParams.append("end_date", selectedPeriod.end);

      const [txRes, sumRes, subRes, accRes] = await Promise.all([
        fetch(`/api/v1/transactions?${txParams.toString()}`),
        fetch(`/api/v1/analytics/summary?${periodParams.toString()}`),
        fetch("/api/v1/subscriptions"),
        fetch("/api/v1/accounts"),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData)) {
          setTransactions(txData);
        }
      }

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubsData(subData);
      }

      if (accRes.ok) {
        const accData = await accRes.json();
        if (Array.isArray(accData)) {
          setCustomAccounts(accData);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Dynamic account options for modals
  const availableAccountOptions = useMemo(() => {
    const list = [...TX_ACCOUNT_OPTIONS];
    const existing = new Set(list.map((o) => o.value.toLowerCase()));
    customAccounts.forEach((ca) => {
      if (!existing.has(ca.name.toLowerCase())) {
        list.push({
          value: ca.name,
          label: `${ca.name} (${ca.tag || "Akun Tambahan"})`,
          color: ca.color === "cyanHub" ? "bg-cyan-500" : ca.color === "teal" ? "bg-teal-500" : ca.color === "purpleLock" ? "bg-purple-500" : ca.color === "blue" ? "bg-blue-600" : ca.color === "coralFall" ? "bg-rose-500" : "bg-amber-500",
          description: ca.tag || "Rekening kustom",
        });
      }
    });
    return list;
  }, [customAccounts]);

  // Dynamic tab list for transaction filtering
  const allAccountTabs = useMemo(() => {
    const tabs = [
      { id: "all", label: "Semua" },
      { id: "Mandiri", label: "Mandiri" },
      { id: "Jago", label: "Bank Jago" },
      { id: "Bibit", label: "Bibit" },
      { id: "BRI 1", label: "BRI 1" },
      { id: "BRI 2", label: "BRI 2" },
    ];
    const existing = new Set(tabs.map((t) => t.id.toLowerCase()));
    customAccounts.forEach((ca) => {
      if (!existing.has(ca.name.toLowerCase()) && ca.name.toLowerCase() !== "cash") {
        tabs.push({ id: ca.name, label: ca.name });
      }
    });
    return tabs;
  }, [customAccounts]);

  const mandiriExpenses = useMemo(() => {
    const expenses = { makan: 0, jajan: 0, laundry: 0, galon: 0 };
    transactions.forEach((tx) => {
      if (tx.type === "expense" && tx.account.toLowerCase().includes("mandiri")) {
        const cat = tx.category.toLowerCase();
        if (cat.includes("makan")) expenses.makan += tx.amount;
        else if (cat.includes("jajan") || cat.includes("ngopi")) expenses.jajan += tx.amount;
        else if (cat.includes("laundry")) expenses.laundry += tx.amount;
        else if (cat.includes("galon") || cat.includes("air")) expenses.galon += tx.amount;
      }
    });
    return expenses;
  }, [transactions]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(formAmount.replace(/\D/g, ""), 10);
    if (!numAmount || !formDesc.trim()) return;

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
          date: formDate || new Date().toISOString().split("T")[0],
        }),
      });
      fetchData();
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(subAmount.replace(/\D/g, ""), 10);
    const day = parseInt(subBillingDay, 10);
    if (!numAmount || !subName.trim() || !day) return;

    setIsSubModalOpen(false);
    setSubName("");
    setSubAmount("");
    setSubNotes("");

    try {
      await fetch("/api/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subName.trim(),
          amount: numAmount,
          category: subCategory,
          account: subAccount,
          billing_day: day,
          notes: subNotes.trim() || undefined,
        }),
      });
      fetchData();
    } catch (err) {
      console.error("Subscription Create Error:", err);
    }
  };

  const handleDeleteSubscription = (id: number) => {
    setSubToDelete(id);
  };

  const handleConfirmDeleteSubscription = async () => {
    if (!subToDelete) return;
    try {
      setDeleteLoading(true);
      await fetch(`/api/v1/subscriptions/${subToDelete}`, { method: "DELETE" });
      await fetchData();
      setSubToDelete(null);
    } catch (err) {
      console.error("Delete subscription error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      setDeleteLoading(true);
      await fetch(`/api/v1/transactions/${txToDelete.id}`, { method: "DELETE" });
      await fetchData();
      setTxToDelete(null);
    } catch (err) {
      console.error("Delete transaction error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleSubscription = async (sub: SubscriptionItem) => {
    try {
      await fetch(`/api/v1/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sub.is_active }),
      });
      fetchData();
    } catch (err) {
      console.error("Toggle subscription error:", err);
    }
  };

  const handleExecutePaycheck = async () => {
    const numAmount = parseInt(paycheckTotal.replace(/\D/g, ""), 10) || 1500000;
    try {
      setPaycheckLoading(true);
      const res = await fetch("/api/v1/transactions/paycheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: numAmount,
          note: "Gajian 2-Mingguan",
        }),
      });
      if (res.ok) {
        setIsPaycheckModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error("Paycheck API Error:", err);
    } finally {
      setPaycheckLoading(false);
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

  return (
    <div className="h-screen bg-obsidian-bg text-slateText-primary flex flex-col md:flex-row antialiased font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION (Matching user screenshot exactly) */}
      <aside className="w-full md:w-68 lg:w-72 bg-obsidian-panel border-r border-obsidian-border p-5 lg:p-6 md:h-screen flex flex-col justify-between shrink-0 overflow-y-hidden">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src="/ai7-icon-rounded.svg"
              alt="AI7 Finance"
              className="w-9 h-9 rounded-lg border border-obsidian-border shadow-xs shrink-0"
            />
            <div>
              <div className="font-bold text-lg tracking-tight text-slateText-primary leading-none whitespace-nowrap">
                ai7<span className="text-amberGold">.</span>finance
              </div>
              <div className="text-xs text-slateText-muted tracking-wider uppercase font-medium mt-1 whitespace-nowrap">
                Obsidian Slate
              </div>
            </div>
          </div>

          {/* Navigation Items (Direct Match to Screenshot) */}
          <nav className="mt-8 flex flex-col space-y-1">
            {[
              { name: "Ringkasan", icon: LayoutDashboard, count: null },
              { name: "Alokasi Amplop", icon: Layers, count: "4" },
              { name: "Rekening & Akun", icon: Wallet, count: (customAccounts.length || 5).toString() },
              { name: "Buku Transaksi", icon: CreditCard, count: transactions.length },
              { name: "Langganan & Tagihan", icon: Bell, count: subsData.items.length },
              { name: "Analisis & Tren", icon: BarChart2, count: null },
            ].map((item) => {
              const isActive = activeNav === item.name;
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveNav(item.name)}
                  className={`flex justify-between items-center w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left whitespace-nowrap select-none ${
                    isActive
                      ? "text-slateText-primary bg-obsidian-hover border border-obsidian-borderStrong text-amberGold shadow-xs font-semibold"
                      : "text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-card"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amberGold" : "text-slateText-muted"}`} />
                    <span className="truncate whitespace-nowrap">{item.name}</span>
                  </span>
                  {item.count !== null && (
                    <span className="text-xs text-amberGold font-mono px-2 py-0.5 rounded-md bg-amberGold/10 border border-amberGold/20 whitespace-nowrap shrink-0 ml-2">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
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
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        {/* Dynamic Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-obsidian-border">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slateText-primary">
                {activeNav === "Ringkasan" && "Ringkasan Portofolio & Alokasi"}
                {activeNav === "Alokasi Amplop" && "Alokasi Amplop & Plafon Belanja"}
                {activeNav === "Rekening & Akun" && "Daftar Rekening & Saldo Akun"}
                {activeNav === "Buku Transaksi" && "Buku Transaksi Lengkap (Ledger)"}
                {activeNav === "Langganan & Tagihan" && "Pelacak Langganan & Tagihan Rutin"}
                {activeNav === "Analisis & Tren" && "Analisis Tren & Burn-Rate Pengeluaran"}
              </h1>
              <PeriodSelector
                currentPeriod={selectedPeriod}
                onSelectPeriod={(p) => setSelectedPeriod(p)}
              />
            </div>
            <p className="text-sm text-slateText-secondary mt-1.5">
              {activeNav === "Ringkasan" && "Sistem keuangan 2-mingguan terintegrasi PostgreSQL & Telegram Bot"}
              {activeNav === "Alokasi Amplop" && "Monitoring plafon belanja 4 amplop Mandiri & pos pendukung"}
              {activeNav === "Rekening & Akun" && "Kekayaan bersih terbagi dalam seluruh rekening aktif dengan alokasi khusus"}
              {activeNav === "Buku Transaksi" && "Histori seluruh pencatatan pengeluaran & pemasukan real-time"}
              {activeNav === "Langganan & Tagihan" && "Kelola komitmen tagihan berulang dari pos Bank Jago (31.7%)"}
              {activeNav === "Analisis & Tren" && "Evaluasi kecepatan belanja kumulatif vs batas aman harian"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="px-3 py-2 text-xs sm:text-sm font-medium border border-obsidian-border rounded-lg bg-obsidian-card text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover hover:border-obsidian-borderStrong transition inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? "animate-spin text-amberGold" : ""}`} />
              <span className="hidden sm:inline whitespace-nowrap">Refresh</span>
            </button>
            <a
              href="/api/v1/transactions/export"
              download
              className="px-3 py-2 text-xs sm:text-sm font-medium border border-obsidian-border rounded-lg bg-obsidian-card text-slateText-primary hover:bg-obsidian-hover hover:border-obsidian-borderStrong transition inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-slateText-muted shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Ekspor CSV</span>
            </a>
            {activeNav === "Langganan & Tagihan" ? (
              <button
                onClick={() => setIsSubModalOpen(true)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amberGold text-[#0B0D11] hover:bg-amber-400 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="whitespace-nowrap">Tambah Tagihan</span>
              </button>
            ) : activeNav === "Rekening & Akun" ? (
              <>
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-cyanHub/15 text-cyanHub border border-cyanHub/40 hover:bg-cyanHub/25 transition inline-flex items-center justify-center gap-2 shadow-xs shrink-0 whitespace-nowrap"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0 text-cyanHub" />
                  <span className="whitespace-nowrap font-semibold">Transfer Antar Akun</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amberGold text-[#0B0D11] hover:bg-amber-400 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">Catat Transaksi</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsPaycheckModalOpen(true)}
                  className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-mintRise/15 text-mintRise border border-mintRise/40 hover:bg-mintRise/25 transition inline-flex items-center justify-center gap-2 shadow-xs shrink-0 whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-mintRise" />
                  <span className="whitespace-nowrap font-semibold">Gajian Masuk</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amberGold text-[#0B0D11] hover:bg-amber-400 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">Catat Transaksi</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: RINGKASAN */}
        {/* ============================================================== */}
        {activeNav === "Ringkasan" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Net Worth */}
              <div className="lg:col-span-7 bg-obsidian-card border border-obsidian-border rounded-xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-semibold text-slateText-muted uppercase tracking-wider">
                      Total Kekayaan Bersih (Net Worth)
                    </span>
                    <span className="text-xs font-mono font-medium text-amberGold px-2 py-0.5 rounded bg-amberGold/10 border border-amberGold/20">
                      Seluruh 5 Rekening
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slateText-primary my-3 font-mono">
                    {formatRupiah(summary.total_balance ?? (summary.income - summary.expense))}{" "}
                    <span className="text-sm sm:text-base font-normal text-slateText-muted tracking-normal">
                      IDR
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm pt-3 border-t border-obsidian-border/80">
                  <span className="inline-flex items-center gap-1.5 text-mintRise font-mono font-medium">
                    <ArrowUpRight className="w-4 h-4" />
                    {formatRupiah(summary.income)} pemasukan periode ini
                  </span>
                  <span className="text-obsidian-borderStrong">•</span>
                  <span className="inline-flex items-center gap-1.5 text-coralFall font-mono font-medium">
                    <ArrowDownRight className="w-4 h-4" />
                    {formatRupiah(summary.expense)} belanja
                  </span>
                  <span className="text-obsidian-borderStrong">•</span>
                  <span className="inline-flex items-center gap-1.5 text-slateText-secondary font-mono font-medium">
                    Net: {formatRupiah(summary.income - summary.expense)}
                  </span>
                </div>
              </div>

              {/* Safe-to-Spend */}
              <div className="lg:col-span-5 bg-obsidian-panel border border-obsidian-border rounded-xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-semibold text-slateText-muted uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amberGold" />
                      Batas Belanja Aman Harian
                    </span>
                    <span
                      className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${
                        summary.safe_to_spend?.pace_status === "warning"
                          ? "text-coralFall bg-coralFall/10 border-coralFall/20"
                          : "text-mintRise bg-mintRise/10 border-mintRise/20"
                      }`}
                    >
                      {summary.safe_to_spend?.pace_status === "warning" ? "🔴 Agak Boros" : "🟢 Pace Aman"}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amberGold my-3 font-mono">
                    {formatRupiah(summary.safe_to_spend?.safe_daily || 55000)}{" "}
                    <span className="text-sm sm:text-base font-normal text-slateText-muted tracking-normal">
                      / hari
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-obsidian-border/80 text-xs font-mono">
                  <div className="flex justify-between text-slateText-secondary">
                    <span>Sisa Kuota Mandiri:</span>
                    <strong className="text-slateText-primary font-bold">
                      {formatRupiah(summary.safe_to_spend?.pocket_remaining || 0)} / Rp 825.000
                    </strong>
                  </div>
                  <div className="flex justify-between text-slateText-secondary">
                    <span>Rentang Waktu:</span>
                    <span className="text-slateText-primary">
                      {summary.safe_to_spend?.days_remaining === 0
                        ? "Periode Berakhir"
                        : `Hari ke-${summary.safe_to_spend?.day_of_cycle || 1} (${summary.safe_to_spend?.days_remaining || 0} hari tersisa)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <StrataAllocationBar />
            <AccountGrid summary={summary} customAccounts={customAccounts} formatRupiah={formatRupiah} />
            <MandiriEnvelopes mandiriExpenses={mandiriExpenses} formatRupiah={formatRupiah} />
            <BurnRateChart summary={summary} formatRupiah={formatRupiah} />

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base sm:text-lg font-bold text-slateText-primary">Transaksi Terakhir</h2>
                <button
                  onClick={() => setActiveNav("Buku Transaksi")}
                  className="text-xs text-amberGold hover:underline font-medium"
                >
                  Buka Buku Transaksi Lengkap ({transactions.length}) →
                </button>
              </div>
              <TransactionTable
                transactions={transactions.slice(0, 5)}
                formatRupiah={formatRupiah}
                onEdit={(tx) => setTxToEdit(tx)}
                onDelete={(tx) => setTxToDelete(tx)}
              />
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ALOKASI AMPLOP */}
        {/* ============================================================== */}
        {activeNav === "Alokasi Amplop" && (
          <div className="space-y-8">
            <StrataAllocationBar />
            <MandiriEnvelopes mandiriExpenses={mandiriExpenses} formatRupiah={formatRupiah} />

            {/* Pos Jago & Pos BRI */}
            <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
                    Amplop Bank Jago (Plafon Rp 475.000 • 31.7%)
                  </h3>
                  <p className="text-xs text-slateText-secondary mt-0.5">
                    Khusus autodebet tagihan rutin dan portofolio investasi Bibit
                  </p>
                </div>
                <button
                  onClick={() => setActiveNav("Langganan & Tagihan")}
                  className="text-xs text-amberGold hover:underline font-mono"
                >
                  Atur Tagihan ({subsData.items.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-obsidian-panel border border-obsidian-border rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slateText-primary text-sm">Tagihan & Langganan Digital</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-mintRise">
                      Autodebet
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slateText-primary">
                    {formatRupiah(subsData.total_monthly_commitment)} / bln
                  </div>
                  <div className="text-xs text-slateText-muted">
                    {subsData.active_count} langganan aktif ({subsData.upcoming_this_week} jatuh tempo pekan ini)
                  </div>
                </div>

                <div className="bg-obsidian-panel border border-obsidian-border rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slateText-primary text-sm">Bibit & Investasi Reksadana</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-cyanHub">
                      Pertumbuhan Aset
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slateText-primary">
                    {formatRupiah(Math.max(0, 475000 - subsData.total_monthly_commitment))}
                  </div>
                  <div className="text-xs text-slateText-muted">
                    Sisa alokasi Jago setelah tagihan bulanan
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
                <div className="text-cyanHub font-bold text-sm">BRI 1 • Hub Transfer & Dana Darurat (6.7%)</div>
                <div className="text-2xl font-bold font-mono text-slateText-primary">Rp 100.000</div>
                <p className="text-xs text-slateText-muted">Disimpan sebagai cadangan likuid jika ada kebutuhan mendesak.</p>
              </div>
              <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
                <div className="text-purpleLock font-bold text-sm">BRI 2 • Tabungan Terkunci (6.7%)</div>
                <div className="text-2xl font-bold font-mono text-slateText-primary">Rp 100.000</div>
                <p className="text-xs text-slateText-muted">Tidak boleh disentuh untuk operasional harian / tujuan jangka panjang.</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: REKENING & AKUN */}
        {/* ============================================================== */}
        {activeNav === "Rekening & Akun" && (
          <div className="space-y-8">
            <AccountGrid summary={summary} customAccounts={customAccounts} formatRupiah={formatRupiah} />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-base text-slateText-primary">Histori Transaksi per Rekening</h3>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-cyanHub/10 border border-cyanHub/30 text-cyanHub hover:bg-cyanHub/20 transition inline-flex items-center gap-1.5 font-mono"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Pindah Saldo</span>
                  </button>
                  <button
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amberGold/10 border border-amberGold/30 text-amberGold hover:bg-amberGold/20 transition inline-flex items-center gap-1.5 font-mono font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Akun</span>
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {allAccountTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-mono transition ${
                        activeTab === tab.id
                          ? "bg-amberGold text-[#0B0D11] font-bold"
                          : "bg-obsidian-card border border-obsidian-border text-slateText-secondary hover:text-slateText-primary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <TransactionTable
                transactions={filteredTransactions}
                formatRupiah={formatRupiah}
                onEdit={(tx) => setTxToEdit(tx)}
                onDelete={(tx) => setTxToDelete(tx)}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: BUKU TRANSAKSI */}
        {/* ============================================================== */}
        {activeNav === "Buku Transaksi" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-1.5 border-b border-obsidian-border w-full sm:w-auto pb-1.5 overflow-x-auto">
                {allAccountTabs.map((tab) => (
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

            <TransactionTable
              transactions={filteredTransactions}
              formatRupiah={formatRupiah}
              onEdit={(tx) => setTxToEdit(tx)}
              onDelete={(tx) => setTxToDelete(tx)}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: LANGGANAN & TAGIHAN RUTIN */}
        {/* ============================================================== */}
        {activeNav === "Langganan & Tagihan" && (
          <SubscriptionsView
            subsData={subsData}
            formatRupiah={formatRupiah}
            onOpenModal={() => setIsSubModalOpen(true)}
            onToggleActive={handleToggleSubscription}
            onDelete={handleDeleteSubscription}
          />
        )}

        {/* ============================================================== */}
        {/* VIEW 6: ANALISIS & TREN */}
        {/* ============================================================== */}
        {activeNav === "Analisis & Tren" && (
          <div className="space-y-8">
            <BurnRateChart summary={summary} formatRupiah={formatRupiah} />

            <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-6 space-y-5">
              <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
                Distribusi Kategori Pengeluaran Bulan Ini
              </h3>
              <div className="space-y-3.5">
                {summary.categories.map((c) => (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="font-medium text-slateText-primary">
                        {c.category} ({c.count} transaksi)
                      </span>
                      <span className="font-mono font-bold text-amberGold">
                        {formatRupiah(c.total)} ({c.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-obsidian-panel rounded-full overflow-hidden border border-obsidian-border">
                      <div
                        style={{ width: `${c.percentage}%` }}
                        className="h-full bg-amberGold transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* QUICK ADD TRANSACTION MODAL */}
      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Catat Transaksi Baru"
        subtitle="Tersimpan langsung ke database PostgreSQL & otomatis memotong amplop anggaran"
        icon={<Plus className="w-5 h-5" />}
        accent={formType === "expense" ? "coral" : "mint"}
        maxWidth="md"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-obsidian-panel p-1 rounded-xl border border-obsidian-border">
            <button
              type="button"
              onClick={() => setFormType("expense")}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
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
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                formType === "income"
                  ? "bg-mintRise text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              Pemasukan
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Nominal Transaksi
            </label>
            <CurrencyInput
              value={formAmount}
              onChange={setFormAmount}
              placeholder="0"
              required
              accent={formType === "expense" ? "coral" : "mint"}
              quickAmounts={
                formType === "expense"
                  ? [15000, 25000, 50000, 100000]
                  : [500000, 1000000, 1500000]
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Nasi Padang + Es Teh"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Akun Rekening
              </label>
              <CustomSelect
                value={formAccount}
                onChange={setFormAccount}
                options={availableAccountOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <CustomSelect
                value={formCategory}
                onChange={setFormCategory}
                options={TX_CATEGORY_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary font-mono focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-obsidian-border/50 mt-5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0B0D11] hover:brightness-110 rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer ${
                formType === "expense" ? "bg-coralFall" : "bg-mintRise"
              }`}
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </CustomModal>

      {/* QUICK ADD SUBSCRIPTION MODAL */}
      <CustomModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title="Tambah Langganan / Tagihan Rutin"
        subtitle="Dialokasikan ke pos Bank Jago (31.7%) dan dipantau tanggal jatuh temponya"
        icon={<Bell className="w-5 h-5" />}
        accent="amber"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Nama Layanan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Netflix, Spotify, Gym, ChatGPT"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Nominal / Bulan
              </label>
              <CurrencyInput
                value={subAmount}
                onChange={setSubAmount}
                placeholder="0"
                required
                accent="amber"
                quickAmounts={[25000, 50000, 100000, 200000]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Jatuh Tempo (Tgl 1-31)
              </label>
              <input
                type="number"
                required
                min={1}
                max={31}
                placeholder="Contoh: 25"
                value={subBillingDay}
                onChange={(e) => setSubBillingDay(e.target.value)}
                className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary font-mono focus:outline-none focus:border-amberGold transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <CustomSelect
                value={subCategory}
                onChange={setSubCategory}
                options={SUB_CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Akun Autodebet
              </label>
              <CustomSelect
                value={subAccount}
                onChange={setSubAccount}
                options={SUB_ACCOUNT_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Share family plan / Kartu debit Jago"
              value={subNotes}
              onChange={(e) => setSubNotes(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-obsidian-border/50 mt-5">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-amberGold text-[#0B0D11] hover:brightness-110 rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer"
            >
              Simpan Tagihan
            </button>
          </div>
        </form>
      </CustomModal>

      {/* GAJIAN AUTO-SPLIT MODAL */}
      <CustomModal
        isOpen={isPaycheckModalOpen}
        onClose={() => setIsPaycheckModalOpen(false)}
        title="Alokasi Gajian Otomatis (Auto-Split)"
        subtitle="Siklus 14 hari baru • Distribusi formula langsung ke 4 rekening"
        icon={<Sparkles className="w-5 h-5" />}
        accent="mint"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Nominal Transferan Masuk
            </label>
            <CurrencyInput
              value={paycheckTotal}
              onChange={setPaycheckTotal}
              placeholder="1500000"
              accent="mint"
              quickAmounts={[1000000, 1500000, 2000000, 2500000]}
            />
          </div>

          <div className="p-4 rounded-xl bg-obsidian-panel border border-obsidian-border space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-obsidian-border">
              <span className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
                Total Alokasi Dihitung
              </span>
              <span className="font-mono font-extrabold text-xl text-mintRise">
                Rp {parseInt(paycheckTotal.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {(() => {
                const total = parseInt(paycheckTotal.replace(/\D/g, "") || "0", 10);
                const mandiri = Math.round(total * 0.55);
                const jago = Math.round(total * 0.317);
                const bri1 = Math.round(total * 0.067);
                const bri2 = total - mandiri - jago - bri1;
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amberGold"></span>
                        <span className="font-medium text-slateText-primary">Mandiri (55.0%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slateText-primary">Rp {mandiri.toLocaleString("id-ID")}</span>
                        <div className="text-[11px] text-slateText-muted">Makan, Jajan, Laundry, Galon</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-mintRise"></span>
                        <span className="font-medium text-slateText-primary">Bank Jago / Bibit (31.7%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slateText-primary">Rp {jago.toLocaleString("id-ID")}</span>
                        <div className="text-[11px] text-slateText-muted">Subs Netflix/Spotify & Bibit</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyanHub"></span>
                        <span className="font-medium text-slateText-primary">BRI 1 (6.7%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slateText-primary">Rp {bri1.toLocaleString("id-ID")}</span>
                        <div className="text-[11px] text-slateText-muted">Hub & Dana Darurat</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purpleLock"></span>
                        <span className="font-medium text-slateText-primary">BRI 2 (6.6%)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slateText-primary">Rp {bri2.toLocaleString("id-ID")}</span>
                        <div className="text-[11px] text-slateText-muted">Tabungan Terkunci</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-obsidian-border/50">
            <button
              type="button"
              onClick={() => setIsPaycheckModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecutePaycheck}
              disabled={paycheckLoading}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{paycheckLoading ? "Menyimpan ke DB..." : "Konfirmasi & Split Sekarang"}</span>
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accountOptions={availableAccountOptions}
        onSuccess={fetchData}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* Confirm Delete Subscription Modal */}
      <ConfirmModal
        isOpen={subToDelete !== null}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleConfirmDeleteSubscription}
        title="Hapus Langganan?"
        message="Apakah kamu yakin ingin menghapus tagihan rutin ini? Data akan dihapus dari pemantauan bulanan."
        confirmText="Hapus Tagihan"
        loading={deleteLoading}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={txToEdit !== null}
        onClose={() => setTxToEdit(null)}
        transaction={txToEdit}
        onSuccess={fetchData}
        accountOptions={availableAccountOptions}
        categoryOptions={TX_CATEGORY_OPTIONS}
      />

      {/* Confirm Delete Transaction Modal */}
      <ConfirmModal
        isOpen={txToDelete !== null}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleConfirmDeleteTransaction}
        title="Hapus Transaksi?"
        message={`Apakah kamu yakin ingin menghapus transaksi "${txToDelete?.description}" senilai ${
          txToDelete ? formatRupiah(txToDelete.amount) : "Rp 0"
        }? Saldo rekening terkait akan otomatis disesuaikan.`}
        confirmText="Hapus Transaksi"
        loading={deleteLoading}
      />
    </div>
  );
}
