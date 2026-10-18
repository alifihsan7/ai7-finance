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
  ShieldCheck,
  Layers,
  Wallet,
  Bell,
  BarChart2,
  LayoutDashboard,
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Calendar,
  Menu,
  X,
  FileSpreadsheet,
  ExternalLink,
  Target,
  AlertCircle,
} from "lucide-react";
import { StrataAllocationBar } from "@/components/StrataAllocation";
import { AccountGrid } from "@/components/AccountGrid";
import { MandiriEnvelopes } from "@/components/MandiriEnvelopes";
import { BurnRateChart } from "@/components/BurnRateChart";
import { TransactionTable, Transaction } from "@/components/TransactionTable";
import { SubscriptionsView, SubscriptionItem, SubscriptionsData } from "@/components/SubscriptionsView";
import { GoalsView } from "@/components/GoalsView";
import { AddGoalModal } from "@/components/AddGoalModal";
import { EditGoalModal, GoalItem } from "@/components/EditGoalModal";
import { TransferModal } from "@/components/TransferModal";
import { AddAccountModal } from "@/components/AddAccountModal";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { EditSubscriptionModal } from "@/components/EditSubscriptionModal";
import PaycheckModal from "@/components/PaycheckModal";
import { AccountItem } from "@/components/AccountGrid";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

import { PeriodSelector, PeriodOption } from "@/components/PeriodSelector";
import { AuthModal } from "@/components/AuthModal";
import { OnboardingWizardModal } from "@/components/OnboardingWizardModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { authFetch, getAuthToken, setStoredUser, setAuthToken, UserProfile } from "@/lib/api";

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
  accounts: { account: string; balance: number; expense?: number }[];
  categories: { category: string; total: number; count: number; percentage: number }[];
  safe_to_spend?: {
    cycle_start: string;
    cycle_end: string;
    cycle_type?: string;
    cycle_days?: number;
    pocket_account?: string;
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [customAccounts, setCustomAccounts] = useState<AccountItem[]>([]);
  const availableAccountNames = useMemo(() => {
    const defaults = ["BRI 2", "Bibit", "BRI 1", "Mandiri", "Bank Jago"];
    const customs = customAccounts.map((a) => a.name);
    return Array.from(new Set([...defaults, ...customs]));
  }, [customAccounts]);
  const [loading, setLoading] = useState(false);

  // Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>({
    id: "cycle_current",
    type: "cycle",
    label: "Memuat Siklus...",
    start: "",
    end: "",
    is_current: true,
  });
  const [activePaycheckSession, setActivePaycheckSession] = useState<{
    id: number;
    total_amount: number;
    date: string;
    status: string;
    completed_steps: number;
    total_steps: number;
    progress_percentage: number;
  } | null>(null);
  const [subToDelete, setSubToDelete] = useState<number | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalItem | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const [subCategory, setSubCategory] = useState("Gym & Fitness");
  const [subAccount, setSubAccount] = useState("Jago");
  const [subBillingType, setSubBillingType] = useState<"fixed_day" | "exact_date">("fixed_day");
  const [subBillingDay, setSubBillingDay] = useState("1");
  const [subExactDueDate, setSubExactDueDate] = useState("");
  const [subNotes, setSubNotes] = useState("");
  const [subToEdit, setSubToEdit] = useState<SubscriptionItem | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [summary, setSummary] = useState<MonthlySummary>({
    month: "",
    income: 0,
    expense: 0,
    net: 0,
    savings_rate: 0,
    total_balance: 0,
    accounts: [],
    categories: [],
  });

  const [subsData, setSubsData] = useState<SubscriptionsData>({
    total_monthly_commitment: 0,
    active_count: 0,
    upcoming_this_week: 0,
    items: [],
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setCurrentUser(null);
          setStoredUser(null);
          setIsAuthModalOpen(true);
          setLoading(false);
          return;
        }

        const res = await authFetch("/api/v1/auth/me");
        if (res.ok) {
          const u = await res.json();
          setCurrentUser(u);
          setStoredUser(u);
          if (!u.is_onboarded) {
            setIsOnboardingModalOpen(true);
          }
        } else {
          // Token tidak valid atau kedaluwarsa
          setAuthToken(null);
          setStoredUser(null);
          setCurrentUser(null);
          setIsAuthModalOpen(true);
        }
      } catch {
        setAuthToken(null);
        setStoredUser(null);
        setCurrentUser(null);
        setIsAuthModalOpen(true);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  const fetchData = async () => {
    const token = getAuthToken();
    if (!token) {
      setTransactions([]);
      setSummary({
        month: "",
        income: 0,
        expense: 0,
        net: 0,
        savings_rate: 0,
        total_balance: 0,
        accounts: [],
        categories: [],
      });
      setSubsData({
        total_monthly_commitment: 0,
        active_count: 0,
        upcoming_this_week: 0,
        items: [],
      });
      setCustomAccounts([]);
      setGoals([]);
      setActivePaycheckSession(null);
      setLoading(false);
      return;
    }

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

      const [txRes, sumRes, subRes, accRes, goalRes, sessRes] = await Promise.all([
        authFetch(`/api/v1/transactions?${txParams.toString()}`),
        authFetch(`/api/v1/analytics/summary?${periodParams.toString()}`),
        authFetch("/api/v1/subscriptions"),
        authFetch("/api/v1/accounts"),
        authFetch("/api/v1/goals"),
        authFetch("/api/v1/paycheck/session/active"),
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
        if (!selectedPeriod.start && sumData.start_date) {
          setSelectedPeriod({
            id: `cycle_${sumData.start_date}`,
            type: sumData.period_type || "cycle",
            label: sumData.period_label || "Siklus Aktif",
            start: sumData.start_date,
            end: sumData.end_date,
            is_current: true,
          });
        }
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

      if (goalRes.ok) {
        const goalData = await goalRes.json();
        if (Array.isArray(goalData)) {
          setGoals(goalData);
        }
      }

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData && sessData.id && sessData.status === "in_progress") {
          setActivePaycheckSession(sessData);
        } else {
          setActivePaycheckSession(null);
        }
      } else {
        setActivePaycheckSession(null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [selectedPeriod, currentUser]);

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
    const existing = new Set(["mandiri", "bank jago", "jago", "bibit", "bri 1", "bri 2", "cash"]);
    customAccounts.forEach((ca) => {
      const lower = ca.name.toLowerCase().trim();
      if (!existing.has(lower)) {
        existing.add(lower);
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
      { id: "Bank Jago", label: "Bank Jago" },
      { id: "Bibit", label: "Bibit" },
      { id: "BRI 1", label: "BRI 1" },
      { id: "BRI 2", label: "BRI 2" },
    ];
    // Map known aliases so both "jago" and "bank jago" match the same item
    const existing = new Set(["all", "mandiri", "bank jago", "jago", "bibit", "bri 1", "bri 2", "cash"]);
    customAccounts.forEach((ca) => {
      const lower = ca.name.toLowerCase().trim();
      if (!existing.has(lower)) {
        existing.add(lower);
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
      await authFetch("/api/v1/transactions", {
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
    if (!numAmount || !subName.trim()) return;
    if (subBillingType === "fixed_day" && !day) return;
    if (subBillingType === "exact_date" && !subExactDueDate) return;

    setIsSubModalOpen(false);
    setSubName("");
    setSubAmount("");
    setSubNotes("");
    setSubBillingType("fixed_day");
    setSubExactDueDate("");

    try {
      const payload: Record<string, unknown> = {
        name: subName.trim(),
        amount: numAmount,
        category: subCategory,
        account: subAccount,
        billing_type: subBillingType,
        notes: subNotes.trim() || undefined,
      };

      if (subBillingType === "exact_date") {
        payload.exact_due_date = subExactDueDate;
        const parsed = new Date(subExactDueDate);
        if (!isNaN(parsed.getDate())) {
          payload.billing_day = parsed.getDate();
        }
      } else {
        payload.billing_day = day;
      }

      await authFetch("/api/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      await authFetch(`/api/v1/subscriptions/${subToDelete}`, { method: "DELETE" });
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
      await authFetch(`/api/v1/transactions/${txToDelete.id}`, { method: "DELETE" });
      await fetchData();
      setTxToDelete(null);
    } catch (err) {
      console.error("Delete transaction error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      setDeleteLoading(true);
      await authFetch(`/api/v1/goals/${goalToDelete}`, { method: "DELETE" });
      await fetchData();
      setGoalToDelete(null);
    } catch (err) {
      console.error("Delete goal error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleSubscription = async (sub: SubscriptionItem) => {
    try {
      await authFetch(`/api/v1/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sub.is_active }),
      });
      fetchData();
    } catch (err) {
      console.error("Toggle subscription error:", err);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txAcc = tx.account.toLowerCase();
      const tab = activeTab.toLowerCase();
      const matchTab =
        activeTab === "all" ||
        txAcc.includes(tab) ||
        (tab.includes("jago") && txAcc.includes("jago"));
      const matchSearch =
        !searchQuery ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.account.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [transactions, activeTab, searchQuery]);

  return (
    <div className="h-screen h-[100dvh] bg-obsidian-bg text-slateText-primary flex flex-col md:flex-row antialiased font-sans overflow-hidden">
      {/* DESKTOP/TABLET SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-56 lg:w-64 xl:w-72 bg-obsidian-panel border-r border-obsidian-border p-4 sm:p-5 lg:p-6 md:h-screen flex-col justify-between shrink-0 overflow-y-hidden">
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
              { name: "Target Finansial", icon: Target, count: goals.length },
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
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setIsProfileModalOpen(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className="w-full p-2.5 rounded-xl bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-slateText-primary font-semibold text-xs truncate group-hover:text-emerald-400 transition-colors">
                    {currentUser ? currentUser.full_name : "Masuk / Akun"}
                  </p>
                  <p className="text-[10px] text-slateText-muted font-mono truncate">
                    {currentUser ? `@${currentUser.username}` : "Mode Tamu"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-mintRise font-medium px-2 py-0.5 rounded-full bg-mintRise/10 border border-mintRise/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-mintRise animate-pulse"></span>
                Active
              </span>
            </div>
            <div className="text-[11px] text-slateText-secondary space-y-1.5 pt-1.5 border-t border-obsidian-border/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slateText-muted shrink-0 text-[11px]">Telegram</span>
                <span className="font-mono text-slateText-primary text-[10px] truncate text-right">
                  {currentUser?.telegram_chat_id ? `ID: ${currentUser.telegram_chat_id}` : "Belum Taut"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slateText-muted shrink-0 text-[11px]">Siklus</span>
                <span
                  className="text-amberGold font-medium text-[10px] truncate text-right max-w-[140px]"
                  title={summary.period_label || "Siklus Anggaran"}
                >
                  {summary.period_label
                    ? summary.period_label.replace(/^Siklus\s+/i, "").replace(/\s+202\d\)/, ")")
                    : "Siklus Anggaran"}
                </span>
              </div>
              {summary.safe_to_spend && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slateText-muted">
                      Hari ke-{summary.safe_to_spend.day_of_cycle || 1}/{summary.safe_to_spend.cycle_days || 14}
                    </span>
                    <span className="text-amberGold font-mono font-semibold">
                      {Math.min(100, Math.round(((summary.safe_to_spend.day_of_cycle || 1) / (summary.safe_to_spend.cycle_days || 14)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-obsidian-panel rounded-full overflow-hidden border border-obsidian-border/40">
                    <div
                      className="h-full bg-gradient-to-r from-amberGold/80 to-amberGold rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((summary.safe_to_spend.day_of_cycle || 1) / (summary.safe_to_spend.cycle_days || 14)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>
      </aside>

      {/* MOBILE STICKY TOP APP BAR */}
      <header className="md:hidden sticky top-0 z-30 w-full bg-obsidian-panel/95 backdrop-blur-md border-b border-obsidian-border px-3.5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/ai7-icon-rounded.svg"
            alt="AI7 Finance"
            className="w-7 h-7 rounded-lg border border-obsidian-border shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-sm tracking-tight text-slateText-primary leading-none truncate">
              ai7<span className="text-amberGold">.</span>finance
            </div>
            <div className="text-[10px] font-mono text-amberGold tracking-wider font-semibold mt-0.5 truncate">
              {activeNav}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-1.5 text-slateText-secondary hover:text-slateText-primary bg-obsidian-card border border-obsidian-border rounded-lg transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amberGold" : ""}`} />
          </button>
          <button
            onClick={() => setIsPaycheckModalOpen(true)}
            title="Gajian Masuk"
            className="px-2 py-1.5 bg-mintRise/15 text-mintRise border border-mintRise/30 font-semibold text-[11px] rounded-lg transition shadow-xs active:scale-95 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Gajian</span>
          </button>
          <button
            onClick={() => {
              if (currentUser) {
                setIsProfileModalOpen(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            title={currentUser ? currentUser.full_name : "Masuk / Akun"}
            className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 active:scale-95"
          >
            {currentUser ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
          </button>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            title="Buka Menu"
            className="p-1.5 text-slateText-secondary hover:text-slateText-primary bg-obsidian-card border border-obsidian-border rounded-lg transition active:scale-95"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[280px] max-w-[85vw] bg-obsidian-panel border-r border-obsidian-border p-5 flex flex-col justify-between h-full z-10 overflow-y-auto">
            <div>
              {/* Header with Close */}
              <div className="flex items-center justify-between pb-4 border-b border-obsidian-border">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/ai7-icon-rounded.svg"
                    alt="AI7 Finance"
                    className="w-8 h-8 rounded-lg border border-obsidian-border shadow-xs shrink-0"
                  />
                  <div>
                    <div className="font-bold text-base tracking-tight text-slateText-primary leading-none">
                      ai7<span className="text-amberGold">.</span>finance
                    </div>
                    <div className="text-[10px] text-slateText-muted tracking-wider uppercase font-medium mt-1">
                      Obsidian Slate
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slateText-muted hover:text-slateText-primary hover:bg-obsidian-card transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="mt-5 flex flex-col space-y-1.5">
                {[
                  { name: "Ringkasan", icon: LayoutDashboard, count: null },
                  { name: "Target Finansial", icon: Target, count: goals.length },
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
                      onClick={() => {
                        setActiveNav(item.name);
                        setIsMobileDrawerOpen(false);
                      }}
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

              {/* Quick Actions inside Drawer */}
              <div className="mt-6 pt-4 border-t border-obsidian-border space-y-2">
                <span className="text-[11px] font-semibold text-slateText-muted uppercase tracking-wider block mb-1">
                  Aksi Cepat
                </span>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-cyanHub/15 text-cyanHub border border-cyanHub/30 hover:bg-cyanHub/25 transition"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" />
                  <span>Transfer Antar Rekening</span>
                </button>
                <a
                  href="/api/v1/transactions/export"
                  download
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg bg-obsidian-card border border-obsidian-border text-slateText-secondary hover:text-slateText-primary transition"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Ekspor CSV Transaksi</span>
                </a>
                <a
                  href="https://docs.google.com/spreadsheets/d/1yq0SQLZ9QVUTeRksKNJtDKTyDGxUKn5fkUVnBxplhn4/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">Google Sheets Rapor</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400/70" />
                </a>
              </div>
            </div>

            {/* Profile Footer */}
            <div className="pt-4 border-t border-obsidian-border text-xs mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slateText-primary font-semibold">{currentUser?.full_name || "Pengguna AI7"}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-mintRise font-medium px-2 py-0.5 rounded-full bg-mintRise/10 border border-mintRise/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-mintRise animate-pulse"></span>
                  Live Synced
                </span>
              </div>
              <div className="text-slateText-muted space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0">Telegram</span>
                  <span className="font-mono text-slateText-primary text-[10px] truncate text-right">
                    {currentUser?.telegram_chat_id ? `ID: ${currentUser.telegram_chat_id}` : "Belum Taut"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0">Siklus</span>
                  <span className="text-amberGold font-medium text-[10px] truncate text-right">
                    {summary.period_label
                      ? summary.period_label.replace(/^Siklus\s+/i, "").replace(/\s+202\d\)/, ")")
                      : `${summary.safe_to_spend?.cycle_days || 30} Hari`}
                  </span>
                </div>
                {summary.safe_to_spend && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span>
                        Hari ke-{summary.safe_to_spend.day_of_cycle || 1}/{summary.safe_to_spend.cycle_days || 14}
                      </span>
                      <span className="text-amberGold font-mono font-semibold">
                        {Math.min(100, Math.round(((summary.safe_to_spend.day_of_cycle || 1) / (summary.safe_to_spend.cycle_days || 14)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-obsidian-panel rounded-full overflow-hidden border border-obsidian-border/40">
                      <div
                        className="h-full bg-gradient-to-r from-amberGold/80 to-amberGold rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round(((summary.safe_to_spend.day_of_cycle || 1) / (summary.safe_to_spend.cycle_days || 14)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-obsidian-panel/95 backdrop-blur-md border-t border-obsidian-border px-3 py-1 flex items-center justify-around safe-bottom shadow-2xl">
        <button
          onClick={() => setActiveNav("Ringkasan")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
            activeNav === "Ringkasan"
              ? "text-amberGold font-semibold"
              : "text-slateText-secondary hover:text-slateText-primary"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Ringkasan</span>
        </button>

        <button
          onClick={() => setActiveNav("Alokasi Amplop")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
            activeNav === "Alokasi Amplop"
              ? "text-amberGold font-semibold"
              : "text-slateText-secondary hover:text-slateText-primary"
          }`}
        >
          <Layers className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Amplop</span>
        </button>

        {/* Center Floating Plus Action */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-amberGold text-[#0B0D11] shadow-lg shadow-amberGold/30 flex items-center justify-center font-bold active:scale-90 transition border-2 border-obsidian-panel shrink-0"
          title="Catat Transaksi Baru"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          onClick={() => setActiveNav("Buku Transaksi")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
            activeNav === "Buku Transaksi"
              ? "text-amberGold font-semibold"
              : "text-slateText-secondary hover:text-slateText-primary"
          }`}
        >
          <CreditCard className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Buku Kas</span>
        </button>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition min-w-[56px] ${
            ["Rekening & Akun", "Target Finansial", "Langganan & Tagihan", "Analisis & Tren"].includes(activeNav)
              ? "text-amberGold font-semibold"
              : "text-slateText-secondary hover:text-slateText-primary"
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5 shrink-0" />
            {["Rekening & Akun", "Target Finansial", "Langganan & Tagihan", "Analisis & Tren"].includes(activeNav) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amberGold"></span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">Menu</span>
        </button>
      </nav>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-3.5 sm:p-5 md:p-6 lg:p-8 xl:p-10 pb-24 md:pb-10 max-w-7xl mx-auto w-full space-y-5 sm:space-y-8">
        
        {/* Guest Mode Banner */}
        {!currentUser && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#181C26] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Mode Tamu (Belum Masuk)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Silakan masuk atau buat akun baru untuk mengakses pencatatan keuangan pribadi Anda secara aman.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
            >
              Masuk / Daftar Sekarang
            </button>
          </div>
        )}

        {/* Dynamic Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-6 border-b border-obsidian-border">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slateText-primary">
                {activeNav === "Ringkasan" && "Ringkasan Portofolio & Alokasi"}
                {activeNav === "Target Finansial" && "Target Finansial & Milestone Tabungan"}
                {activeNav === "Alokasi Amplop" && "Alokasi Amplop & Plafon Belanja"}
                {activeNav === "Rekening & Akun" && "Daftar Rekening & Saldo Akun"}
                {activeNav === "Buku Transaksi" && "Buku Transaksi Lengkap (Ledger)"}
                {activeNav === "Langganan & Tagihan" && "Pelacak Langganan & Tagihan Rutin"}
                {activeNav === "Analisis & Tren" && "Analisis Tren & Burn-Rate Pengeluaran"}
              </h1>
              <PeriodSelector
                key={`${selectedPeriod.id}_${currentUser?.id || 1}`}
                currentPeriod={selectedPeriod}
                onSelectPeriod={(p) => setSelectedPeriod(p)}
              />
            </div>
            <p className="text-sm text-slateText-secondary mt-1.5">
              {activeNav === "Ringkasan" && "Sistem keuangan terintegrasi PostgreSQL & Telegram Bot (@AI7Fin4nc3_bot)"}
              {activeNav === "Target Finansial" && "Pantau akumulasi target dana dingin BRI 2, portofolio Bibit, dan pencapaian finansial"}
              {activeNav === "Alokasi Amplop" && "Monitoring plafon belanja 4 amplop Mandiri & pos pendukung"}
              {activeNav === "Rekening & Akun" && "Kekayaan bersih terbagi dalam seluruh rekening aktif dengan alokasi khusus"}
              {activeNav === "Buku Transaksi" && "Histori seluruh pencatatan pengeluaran & pemasukan real-time"}
              {activeNav === "Langganan & Tagihan" && "Kelola komitmen tagihan berulang dari pos Bank Jago (31.7%)"}
              {activeNav === "Analisis & Tren" && "Evaluasi kecepatan belanja kumulatif vs batas aman harian"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full xl:w-auto">
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
            <a
              href="https://docs.google.com/spreadsheets/d/1yq0SQLZ9QVUTeRksKNJtDKTyDGxUKn5fkUVnBxplhn4/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-xs sm:text-sm font-medium border border-emerald-500/30 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="Buka Google Sheets Rapor"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Google Sheets</span>
            </a>
            <button
              onClick={() => {
                if (currentUser) {
                  setIsProfileModalOpen(true);
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              title="Profil & Pengaturan Akun"
              className="px-3 py-2 text-xs sm:text-sm font-medium border border-obsidian-border rounded-lg bg-obsidian-card text-slateText-primary hover:bg-obsidian-hover hover:border-obsidian-borderStrong transition inline-flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                {currentUser ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="hidden sm:inline font-semibold">
                {currentUser ? currentUser.full_name : "Masuk / Akun"}
              </span>
            </button>
            {activeNav === "Target Finansial" ? (
              <button
                onClick={() => setIsAddGoalModalOpen(true)}
                className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-amberGold text-[#0B0D11] hover:bg-amber-400 transition inline-flex items-center justify-center gap-2 shadow-xs shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span className="whitespace-nowrap">Tambah Target</span>
              </button>
            ) : activeNav === "Langganan & Tagihan" ? (
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
            {/* Active Paycheck Session Banner */}
            {activePaycheckSession && activePaycheckSession.status === "in_progress" && (
              <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-mintRise/15 via-obsidian-card to-cyanHub/15 border border-mintRise/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-mintRise/20 border border-mintRise/40 flex items-center justify-center text-mintRise shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slateText-primary">
                        Distribusi Gajian Sedang Berjalan
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-mintRise/20 text-mintRise border border-mintRise/40">
                        {activePaycheckSession.completed_steps} / {activePaycheckSession.total_steps} Selesai ({activePaycheckSession.progress_percentage}%)
                      </span>
                    </div>
                    <p className="text-xs text-slateText-secondary truncate mt-0.5">
                      Total Rp {activePaycheckSession.total_amount.toLocaleString("id-ID")} • Selesaikan checklist transfer m-banking & gate Flip
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaycheckModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 transition shrink-0 inline-flex items-center justify-center gap-1.5 shadow-md cursor-pointer self-end sm:self-center"
                >
                  <span>Lanjutkan Checklist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
              {/* Net Worth */}
              <div className="xl:col-span-7 bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-slateText-muted uppercase tracking-wider truncate">
                      Total Kekayaan Bersih
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-medium text-amberGold px-2.5 py-0.5 rounded-md bg-amberGold/10 border border-amberGold/20 shrink-0 whitespace-nowrap">
                      Seluruh 5 Rekening
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slateText-primary my-3 font-mono truncate">
                    {formatRupiah(summary.total_balance ?? (summary.income - summary.expense))}{" "}
                    <span className="text-sm sm:text-base font-normal text-slateText-muted tracking-normal">
                      IDR
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-3 border-t border-obsidian-border/80">
                  <div className="inline-flex items-center gap-1.5 text-mintRise font-mono font-medium whitespace-nowrap min-w-0">
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    <span className="truncate">{formatRupiah(summary.income)} in</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-coralFall font-mono font-medium whitespace-nowrap min-w-0">
                    <ArrowDownRight className="w-4 h-4 shrink-0" />
                    <span className="truncate">{formatRupiah(summary.expense)} out</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 inline-flex items-center gap-1.5 text-slateText-secondary font-mono font-medium whitespace-nowrap min-w-0">
                    <span className="truncate">Net: {formatRupiah(summary.income - summary.expense)}</span>
                  </div>
                </div>
              </div>

              {/* Safe-to-Spend */}
              <div className="xl:col-span-5 bg-obsidian-panel border border-obsidian-border rounded-xl p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-slateText-muted uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-amberGold shrink-0" />
                      <span className="truncate">Batas Belanja Harian</span>
                    </span>
                    <span
                      className={`text-[11px] sm:text-xs font-mono font-medium px-2.5 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                        summary.safe_to_spend?.pace_status === "warning"
                          ? "text-coralFall bg-coralFall/10 border-coralFall/20"
                          : "text-mintRise bg-mintRise/10 border-mintRise/20"
                      }`}
                    >
                      {summary.safe_to_spend?.pace_status === "warning" ? "🔴 Agak Boros" : "🟢 Pace Aman"}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amberGold my-3 font-mono truncate">
                    {formatRupiah(summary.safe_to_spend?.safe_daily || 55000)}{" "}
                    <span className="text-sm sm:text-base font-normal text-slateText-muted tracking-normal">
                      / hari
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-obsidian-border/80">
                  <div className="bg-obsidian-card/60 border border-obsidian-border/50 rounded-lg p-2.5 min-w-0">
                    <div className="flex items-center justify-between text-[11px] text-slateText-muted font-medium gap-1">
                      <span className="truncate">Sisa Kuota {summary.safe_to_spend?.pocket_account || "Belanja"}</span>
                      {summary.safe_to_spend?.pocket_budget ? (
                        <span className="text-amberGold font-mono text-[10px] shrink-0 font-semibold">
                          {Math.max(0, Math.round(((summary.safe_to_spend.pocket_remaining || 0) / summary.safe_to_spend.pocket_budget) * 100))}%
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-slateText-primary mt-0.5 truncate whitespace-nowrap">
                      {formatRupiah(summary.safe_to_spend?.pocket_remaining || 0)}
                      <span className="text-slateText-muted font-normal text-[11px]">
                        {" "}
                        / {summary.safe_to_spend?.pocket_budget ? `${Math.round(summary.safe_to_spend.pocket_budget / 1000)}k` : "825k"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-obsidian-card/60 border border-obsidian-border/50 rounded-lg p-2.5 min-w-0">
                    <div className="text-[11px] text-slateText-muted font-medium truncate">Rentang Waktu</div>
                    <div className="text-xs sm:text-sm font-bold font-mono text-slateText-primary mt-0.5 truncate whitespace-nowrap">
                      {summary.safe_to_spend?.days_remaining === 0
                        ? "Periode Berakhir"
                        : `Hari ke-${summary.safe_to_spend?.day_of_cycle || 1} (sisa ${summary.safe_to_spend?.days_remaining || 0} hr)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <StrataAllocationBar
              cycleType={summary.safe_to_spend?.cycle_type}
              cycleDays={summary.safe_to_spend?.cycle_days}
              formatRupiah={formatRupiah}
            />
            <AccountGrid summary={summary} customAccounts={customAccounts} formatRupiah={formatRupiah} />

            {/* Quick Goals & Milestone Preview */}
            {goals.length > 0 && (
              <div className="bg-obsidian-panel border border-obsidian-border rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-5 h-5 text-amberGold shrink-0" />
                    <h2 className="text-base font-bold text-slateText-primary truncate">
                      Target & Milestone Tabungan
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveNav("Target Finansial")}
                    className="text-xs text-amberGold hover:underline font-medium shrink-0 whitespace-nowrap"
                  >
                    Buka Seluruh Target ({goals.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {goals.slice(0, 3).map((g) => {
                    const theme =
                      g.color === "cyan"
                        ? { dot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]", bar: "bg-gradient-to-r from-cyan-500 to-sky-400", text: "text-cyan-400" }
                        : g.color === "amber"
                        ? { dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]", bar: "bg-gradient-to-r from-amber-500 to-yellow-400", text: "text-amber-400" }
                        : { dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]", bar: "bg-gradient-to-r from-emerald-500 to-teal-400", text: "text-emerald-400" };

                    return (
                      <div
                        key={g.id}
                        onClick={() => setActiveNav("Target Finansial")}
                        className="bg-obsidian-card border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl p-4 space-y-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
                            <span className="truncate">{g.name}</span>
                          </span>
                          <span className={`text-xs font-mono font-bold ${theme.text} shrink-0`}>
                            {g.percentage}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${theme.bar} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, Math.max(3, g.percentage))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slateText-muted">
                          <span>{formatRupiah(g.current_amount)}</span>
                          <span>Target: {formatRupiah(g.target_amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <MandiriEnvelopes
              mandiriExpenses={mandiriExpenses}
              formatRupiah={formatRupiah}
              cycleDays={summary.safe_to_spend?.cycle_days || 14}
              pocketAccount={summary.safe_to_spend?.pocket_account || "Mandiri"}
              pocketBudget={summary.safe_to_spend?.pocket_budget}
            />
            <BurnRateChart summary={summary} formatRupiah={formatRupiah} />

            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slateText-primary truncate">Transaksi Terakhir</h2>
                <button
                  onClick={() => setActiveNav("Buku Transaksi")}
                  className="text-xs text-amberGold hover:underline font-medium shrink-0 whitespace-nowrap"
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
        {/* VIEW: TARGET FINANSIAL */}
        {/* ============================================================== */}
        {activeNav === "Target Finansial" && (
          <GoalsView
            goals={goals}
            formatRupiah={formatRupiah}
            onOpenAddModal={() => setIsAddGoalModalOpen(true)}
            onEdit={(goal) => setGoalToEdit(goal)}
            onDelete={(id) => setGoalToDelete(id)}
          />
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ALOKASI AMPLOP */}
        {/* ============================================================== */}
        {activeNav === "Alokasi Amplop" && (
          <div className="space-y-8">
            <StrataAllocationBar
              cycleType={summary.safe_to_spend?.cycle_type}
              cycleDays={summary.safe_to_spend?.cycle_days}
              formatRupiah={formatRupiah}
            />
            <MandiriEnvelopes
              mandiriExpenses={mandiriExpenses}
              formatRupiah={formatRupiah}
              cycleDays={summary.safe_to_spend?.cycle_days || 14}
              pocketAccount={summary.safe_to_spend?.pocket_account || "Mandiri"}
              pocketBudget={summary.safe_to_spend?.pocket_budget}
            />

            {/* Pos Jago & Pos BRI */}
            <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
                  className="text-xs text-amberGold hover:underline font-mono shrink-0 whitespace-nowrap"
                >
                  Atur Tagihan ({subsData.items.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-obsidian-panel border border-obsidian-border rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slateText-primary text-sm truncate">Tagihan & Langganan Digital</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-mintRise shrink-0 whitespace-nowrap">
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
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slateText-primary text-sm truncate">Bibit & Investasi Reksadana</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-cyanHub shrink-0 whitespace-nowrap">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-slateText-primary whitespace-nowrap">Histori Transaksi per Rekening</h3>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-cyanHub/10 border border-cyanHub/30 text-cyanHub hover:bg-cyanHub/20 transition inline-flex items-center gap-1.5 font-mono shrink-0 whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Pindah Saldo</span>
                  </button>
                  <button
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amberGold/10 border border-amberGold/30 text-amberGold hover:bg-amberGold/20 transition inline-flex items-center gap-1.5 font-mono font-semibold shrink-0 whitespace-nowrap"
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
                      className={`text-xs px-3 py-1.5 rounded-lg font-mono transition shrink-0 whitespace-nowrap ${
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
                    className={`text-sm px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 ${
                      activeTab === tab.id
                        ? "text-slateText-primary bg-obsidian-card border border-obsidian-borderStrong font-semibold shadow-xs"
                        : "text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72 shrink-0">
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
            onEdit={(sub) => setSubToEdit(sub)}
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
                    <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-slateText-primary truncate">
                        {c.category} ({c.count} transaksi)
                      </span>
                      <span className="font-mono font-bold text-amberGold shrink-0 whitespace-nowrap">
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
        subtitle="Catat transaksi untuk otomatis memperbarui saldo rekening & amplop anggaran"
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

          {/* Switch Mode Siklus */}
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-2">
              Metode Perhitungan Jatuh Tempo
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-obsidian-panel rounded-xl border border-obsidian-border">
              <button
                type="button"
                onClick={() => setSubBillingType("fixed_day")}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  subBillingType === "fixed_day"
                    ? "bg-amberGold text-[#0B0D11] shadow-xs"
                    : "text-slateText-secondary hover:text-slateText-primary"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Rutin Tiap Tgl (1-31)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubBillingType("exact_date");
                  if (!subExactDueDate) {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setSubExactDueDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  subBillingType === "exact_date"
                    ? "bg-amberGold text-[#0B0D11] shadow-xs"
                    : "text-slateText-secondary hover:text-slateText-primary"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tgl Berakhir Spesifik (Gym)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Nominal / Periode
              </label>
              <CurrencyInput
                value={subAmount}
                onChange={setSubAmount}
                placeholder="0"
                required
                accent="amber"
                quickAmounts={[25000, 50000, 100000, 225000]}
              />
            </div>

            {subBillingType === "fixed_day" ? (
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
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                  Tanggal Berakhir Riil
                </label>
                <input
                  type="date"
                  required
                  value={subExactDueDate}
                  onChange={(e) => setSubExactDueDate(e.target.value)}
                  className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary font-mono focus:outline-none focus:border-amberGold transition"
                />
              </div>
            )}
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

      {/* GAJIAN STEP-BY-STEP CHECKLIST MODAL */}
      <PaycheckModal
        isOpen={isPaycheckModalOpen}
        onClose={() => setIsPaycheckModalOpen(false)}
        onSuccess={fetchData}
      />

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

      {/* Edit Subscription Modal */}
      <EditSubscriptionModal
        isOpen={subToEdit !== null}
        onClose={() => setSubToEdit(null)}
        subscription={subToEdit}
        onSuccess={fetchData}
        accountOptions={SUB_ACCOUNT_OPTIONS}
        categoryOptions={SUB_CATEGORY_OPTIONS}
      />

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSuccess={fetchData}
        availableAccounts={availableAccountNames}
      />

      {/* Edit Goal Modal */}
      <EditGoalModal
        goal={goalToEdit}
        isOpen={goalToEdit !== null}
        onClose={() => setGoalToEdit(null)}
        onSuccess={fetchData}
        availableAccounts={availableAccountNames}
      />

      {/* Confirm Delete Goal Modal */}
      <ConfirmModal
        isOpen={goalToDelete !== null}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleConfirmDeleteGoal}
        title="Hapus Target Finansial?"
        message="Apakah kamu yakin ingin menghapus target finansial ini? Progres capaian akan dihapus dari dashboard."
        confirmText="Hapus Target"
        loading={deleteLoading}
      />

      {/* Auth Modal (Masuk / Daftar Akun) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user, isNewUser) => {
          setCurrentUser(user);
          fetchData();
          if (isNewUser || !user.is_onboarded) {
            setIsOnboardingModalOpen(true);
          }
        }}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingModalOpen}
        user={currentUser}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={(updatedUser) => {
          setIsOnboardingModalOpen(false);
          setCurrentUser(updatedUser);
          setStoredUser(updatedUser);
          fetchData();
        }}
      />

      {/* User Profile & Account Settings Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          onUserUpdated={(updated) => {
            setCurrentUser(updated);
            fetchData();
          }}
          onLogout={() => {
            setAuthToken(null);
            setStoredUser(null);
            setCurrentUser(null);
            setIsProfileModalOpen(false);
            setIsAuthModalOpen(true);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
