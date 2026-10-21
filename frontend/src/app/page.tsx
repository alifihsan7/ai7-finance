"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Download,
  RefreshCw,
  ChevronDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  CheckCircle2,
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
import { TransactionLedgerView } from "@/components/TransactionLedgerView";
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
import { Skeleton } from "@/components/ui/Skeleton";

import { PeriodSelector, PeriodOption } from "@/components/PeriodSelector";
import { AnalyticsView } from "@/components/AnalyticsView";
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
  daily_trend?: { date: string; income: number; expense: number }[];
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
  { value: "Rekening Utama", label: "Rekening Utama (Operasional)", color: "bg-blue-500", description: "Pos belanja harian & saku" },
  { value: "Rekening Tagihan", label: "Rekening Tagihan (Subs & Bills)", color: "bg-purple-500", description: "Pos langganan rutin" },
  { value: "Investasi", label: "Investasi (Portofolio)", color: "bg-teal-500", description: "Portofolio tabungan investasi" },
  { value: "Dana Darurat", label: "Dana Darurat (Cadangan Likuid)", color: "bg-cyan-500", description: "Pos cadangan dana darurat" },
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
  { value: "Keluarga & Sosial", label: "Keluarga & Sosial" },
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
  { value: "Rekening Tagihan", label: "Rekening Tagihan (Autodebet)", color: "bg-purple-500" },
  { value: "Rekening Utama", label: "Rekening Utama (Operasional)", color: "bg-blue-500" },
  { value: "Kartu Kredit", label: "Kartu Kredit / PayLater", color: "bg-cyan-500" },
];

const NAV_SLUGS: Record<string, string> = {
  "Ringkasan": "#/overview",
  "Target Finansial": "#/goals",
  "Alokasi Amplop": "#/envelopes",
  "Rekening & Akun": "#/accounts",
  "Buku Transaksi": "#/ledger",
  "Langganan & Tagihan": "#/subscriptions",
  "Analisis & Tren": "#/analytics",
};

const SLUG_TO_NAV: Record<string, string> = {
  "#/overview": "Ringkasan",
  "/overview": "Ringkasan",
  "overview": "Ringkasan",
  "#/goals": "Target Finansial",
  "/goals": "Target Finansial",
  "goals": "Target Finansial",
  "#/envelopes": "Alokasi Amplop",
  "/envelopes": "Alokasi Amplop",
  "envelopes": "Alokasi Amplop",
  "#/accounts": "Rekening & Akun",
  "/accounts": "Rekening & Akun",
  "accounts": "Rekening & Akun",
  "#/ledger": "Buku Transaksi",
  "/ledger": "Buku Transaksi",
  "ledger": "Buku Transaksi",
  "#/subscriptions": "Langganan & Tagihan",
  "/subscriptions": "Langganan & Tagihan",
  "subscriptions": "Langganan & Tagihan",
  "#/analytics": "Analisis & Tren",
  "/analytics": "Analisis & Tren",
  "analytics": "Analisis & Tren",
};

export default function FinanceDashboard() {
  const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeNav, setActiveNav] = useState<string>("Ringkasan");
  const mainContentRef = useRef<HTMLElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaycheckModalOpen, setIsPaycheckModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [customAccounts, setCustomAccounts] = useState<AccountItem[]>([]);
  const availableAccountNames = useMemo(() => {
    if (customAccounts.length > 0) {
      return customAccounts.map((a) => a.name);
    }
    return ["Rekening Utama", "Uang Tunai (Cash)", "Tabungan"];
  }, [customAccounts]);
  const [loading, setLoading] = useState(true);

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
  const [formAccount, setFormAccount] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form state for new subscription
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCategory, setSubCategory] = useState("Gym & Fitness");
  const [subAccount, setSubAccount] = useState("");
  const [subBillingType, setSubBillingType] = useState<"fixed_day" | "exact_date">("fixed_day");
  const [subBillingDay, setSubBillingDay] = useState("1");
  const [subExactDueDate, setSubExactDueDate] = useState("");
  const [subNotes, setSubNotes] = useState("");
  const [subToEdit, setSubToEdit] = useState<SubscriptionItem | null>(null);

  // Paycheck configuration & buckets state
  const [paycheckConfig, setPaycheckConfig] = useState<{ id?: number; total_salary?: number; pocket_account?: string; source_account?: string; cycle_days?: number; cycle_type?: string } | null>(null);
  const [paycheckBuckets, setPaycheckBuckets] = useState<{ account: string; percentage: number; purpose?: string }[]>([]);

  // Auto-sync formAccount & subAccount to available accounts
  useEffect(() => {
    if (availableAccountNames.length > 0) {
      if (!formAccount || !availableAccountNames.includes(formAccount)) {
        setFormAccount(availableAccountNames[0]);
      }
      if (!subAccount || !availableAccountNames.includes(subAccount)) {
        setSubAccount(availableAccountNames[0]);
      }
    }
  }, [availableAccountNames, formAccount, subAccount]);

  // SPA Hash Routing sync & browser Back/Forward navigation listener
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      const matched = SLUG_TO_NAV[hash] || SLUG_TO_NAV[hash.replace(/^#/, "")];
      if (matched) {
        setActiveNav(matched);
      } else if (!hash) {
        window.location.hash = "#/overview";
      }
    };

    handleHashSync();
    window.addEventListener("hashchange", handleHashSync);
    return () => window.removeEventListener("hashchange", handleHashSync);
  }, []);

  // Update URL hash and auto-scroll viewport when activeNav changes
  useEffect(() => {
    const targetHash = NAV_SLUGS[activeNav];
    if (targetHash && window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeNav]);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Mobile drawer keyboard accessibility & scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen]);

  useEffect(() => {
    const initUser = async () => {
      try {
        // Cek integrasi Telegram Mini App (TWA)
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          try {
            tg.ready();
            tg.expand();
            if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#090A0D");
            if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("#090A0D");
          } catch (e) {
            console.warn("Telegram WebApp init warning:", e);
          }

          // Jika ada initData valid dari Telegram WebApp, autentikasi otomatis
          if (tg.initData && tg.initData.length > 0) {
            try {
              const tgRes = await fetch("/api/v1/auth/telegram-webapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ init_data: tg.initData }),
              });
              if (tgRes.ok) {
                const authData = await tgRes.json();
                setAuthToken(authData.access_token);
                setStoredUser(authData.user);
                setCurrentUser(authData.user);
                setIsAuthModalOpen(false);
                if (!authData.user.is_onboarded) {
                  setIsOnboardingModalOpen(true);
                }
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Gagal auto-login Telegram WebApp:", err);
            }
          }
        }

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

      const [txRes, sumRes, subRes, accRes, goalRes, sessRes, paycheckCfgRes] = await Promise.all([
        authFetch(`/api/v1/transactions?${txParams.toString()}`),
        authFetch(`/api/v1/analytics/summary?${periodParams.toString()}`),
        authFetch("/api/v1/subscriptions"),
        authFetch("/api/v1/accounts"),
        authFetch("/api/v1/goals"),
        authFetch("/api/v1/paycheck/session/active"),
        authFetch("/api/v1/paycheck/config"),
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

      if (paycheckCfgRes.ok) {
        const pData = await paycheckCfgRes.json();
        if (pData?.config) setPaycheckConfig(pData.config);
        if (Array.isArray(pData?.buckets)) setPaycheckBuckets(pData.buckets);
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
    if (customAccounts.length > 0) {
      return customAccounts.map((ca) => ({
        value: ca.name,
        label: `${ca.name} (${ca.tag || "Akun"})`,
        color: ca.color === "cyanHub" ? "bg-cyan-500" : ca.color === "teal" ? "bg-teal-500" : ca.color === "purpleLock" ? "bg-purple-500" : ca.color === "blue" ? "bg-blue-600" : ca.color === "coralFall" ? "bg-rose-500" : "bg-amber-500",
        description: ca.tag || "Rekening aktif",
      }));
    }
    return TX_ACCOUNT_OPTIONS;
  }, [customAccounts]);

  // Dynamic tab list for transaction filtering
  const allAccountTabs = useMemo(() => {
    const tabs = [{ id: "all", label: "Semua" }];
    if (customAccounts.length > 0) {
      customAccounts.forEach((ca) => {
        tabs.push({ id: ca.name, label: ca.name });
      });
    } else {
      TX_ACCOUNT_OPTIONS.forEach((opt) => {
        tabs.push({ id: opt.value, label: opt.value });
      });
    }
    return tabs;
  }, [customAccounts]);

  // Dynamic strata allocation buckets mapped from paycheck config or custom accounts
  const dynamicStrataBuckets = useMemo(() => {
    if (paycheckBuckets && paycheckBuckets.length > 0) {
      return paycheckBuckets.map((b) => ({
        account: b.account,
        percentage: Number(b.percentage) || 0,
        purpose: b.purpose || "Pos Rekening",
      }));
    }
    if (customAccounts.length > 0) {
      const defaultPct = Math.round((100 / customAccounts.length) * 10) / 10;
      return customAccounts.map((a, i) => ({
        account: a.name,
        percentage: i === customAccounts.length - 1 ? Math.max(0, 100 - defaultPct * (customAccounts.length - 1)) : defaultPct,
        purpose: a.tag || a.type || "Alokasi Rekening",
      }));
    }
    return [];
  }, [paycheckBuckets, customAccounts]);

  const pocketAccountName = (summary.safe_to_spend?.pocket_account || "").toLowerCase();

  const mandiriExpenses = useMemo(() => {
    const expenses = { makan: 0, jajan: 0, laundry: 0, galon: 0 };
    transactions.forEach((tx) => {
      const acc = (tx.account || "").toLowerCase();
      const isTargetPocket = pocketAccountName
        ? acc === pocketAccountName || acc.includes(pocketAccountName)
        : acc.includes("mandiri") || acc.includes("utama");

      if (tx.type === "expense" && isTargetPocket) {
        const cat = tx.category.toLowerCase();
        if (cat.includes("makan")) expenses.makan += tx.amount;
        else if (cat.includes("jajan") || cat.includes("ngopi")) expenses.jajan += tx.amount;
        else if (cat.includes("laundry")) expenses.laundry += tx.amount;
        else if (cat.includes("galon") || cat.includes("air")) expenses.galon += tx.amount;
      }
    });
    return expenses;
  }, [transactions, pocketAccountName]);

  // Real account balances mapped by type
  const { totalInvestasiReal, investasiLabels, totalDaruratReal, daruratLabels, totalTabunganReal, tabunganLabels } = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    (summary.accounts || []).forEach((acc) => {
      balanceMap[acc.account.toLowerCase()] = acc.balance;
    });

    const getBalance = (ca: AccountItem) => {
      const key = ca.name.toLowerCase();
      if (key in balanceMap) return balanceMap[key];
      return ca.current_balance ?? ca.initial_balance ?? 0;
    };

    const inv = customAccounts.filter((a) => (a.type || "").toLowerCase() === "investasi");
    const dar = customAccounts.filter((a) => (a.type || "").toLowerCase() === "darurat");
    const tab = customAccounts.filter((a) => (a.type || "").toLowerCase() === "tabungan");

    return {
      totalInvestasiReal: inv.reduce((sum, a) => sum + getBalance(a), 0),
      investasiLabels: inv.map((a) => a.name).join(", "),
      totalDaruratReal: dar.reduce((sum, a) => sum + getBalance(a), 0),
      daruratLabels: dar.map((a) => a.name).join(", "),
      totalTabunganReal: tab.reduce((sum, a) => sum + getBalance(a), 0),
      tabunganLabels: tab.map((a) => a.name).join(", "),
    };
  }, [summary.accounts, customAccounts]);

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

  const handleExportCSV = async () => {
    if (isExportingCSV) return;
    setIsExportingCSV(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/v1/transactions/export", {
        headers,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthModalOpen(true);
        }
        throw new Error(`Export failed with status: ${res.status}`);
      }

      let filename = "finance_export.csv";
      const disposition = res.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, "").trim();
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh CSV:", err);
    } finally {
      setIsExportingCSV(false);
      setIsExportMenuOpen(false);
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
      return matchTab;
    });
  }, [transactions, activeTab]);

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
            </div>
          </div>

          {/* Navigation Items (Clean Obsidian Slate Minimalist) */}
          <nav className="mt-8 flex flex-col space-y-1">
            {[
              { name: "Ringkasan", icon: LayoutDashboard },
              { name: "Target Finansial", icon: Target },
              { name: "Alokasi Amplop", icon: Layers },
              { name: "Rekening & Akun", icon: Wallet },
              { name: "Buku Transaksi", icon: CreditCard },
              { name: "Langganan & Tagihan", icon: Bell },
              { name: "Analisis & Tren", icon: BarChart2 },
            ].map((item) => {
              const isActive = activeNav === item.name;
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActiveNav(item.name);
                    const slug = NAV_SLUGS[item.name];
                    if (slug) window.location.hash = slug;
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all text-left whitespace-nowrap select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                    isActive
                      ? "text-white bg-white/[0.08] border border-white/[0.1] shadow-xs font-semibold"
                      : "text-zinc-400 hover:text-white border border-transparent hover:border-white/[0.06] hover:bg-white/[0.04] font-medium"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amberGold" : "text-zinc-500"}`} />
                  <span className="truncate whitespace-nowrap">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="mt-8 pt-5 border-t border-white/[0.08] text-sm">
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setIsProfileModalOpen(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className="w-full p-3 rounded-2xl bg-obsidian-card hover:bg-obsidian-hover border border-white/[0.08] transition text-left cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs truncate group-hover:text-amberGold transition-colors">
                    {currentUser ? currentUser.full_name : "Masuk / Akun"}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">
                    {currentUser ? `@${currentUser.username}` : "Mode Tamu"}
                  </p>
                </div>
              </div>
              {currentUser ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-mintRise font-medium px-2 py-0.5 rounded-full bg-mintRise/10 border border-mintRise/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-mintRise"></span>
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                  Tamu
                </span>
              )}
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
      <header className="md:hidden sticky top-0 z-30 w-full bg-obsidian-panel/95 backdrop-blur-md border-b border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/ai7-icon-rounded.svg"
            alt="AI7 Finance"
            className="w-7 h-7 rounded-xl border border-white/[0.08] shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-sm tracking-tight text-white leading-none truncate">
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
            className="p-2 text-zinc-400 hover:text-white bg-obsidian-card border border-white/[0.08] rounded-full transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amberGold" : ""}`} />
          </button>
          <button
            onClick={() => setIsPaycheckModalOpen(true)}
            title="Gajian Masuk"
            className="px-3 py-1.5 bg-mintRise/15 text-mintRise border border-mintRise/30 font-semibold text-[11px] rounded-xl transition shadow-xs active:scale-95 flex items-center gap-1"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
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
            className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 active:scale-95"
          >
            {currentUser ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
          </button>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            title="Buka Menu"
            className="p-2 text-zinc-400 hover:text-white bg-obsidian-card border border-white/[0.08] rounded-full transition active:scale-95"
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
          <div className="relative w-[280px] max-w-[85vw] bg-obsidian-panel border-r border-white/[0.08] p-5 flex flex-col justify-between h-full z-10 overflow-y-auto">
            <div>
              {/* Header with Close */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/ai7-icon-rounded.svg"
                    alt="AI7 Finance"
                    className="w-8 h-8 rounded-xl border border-white/[0.08] shadow-xs shrink-0"
                  />
                  <div>
                    <div className="font-bold text-base tracking-tight text-white leading-none">
                      ai7<span className="text-amberGold">.</span>finance
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-obsidian-card transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items (Clean Obsidian Slate Minimalist) */}
              <nav className="flex flex-col space-y-1">
                {[
                  { name: "Ringkasan", icon: LayoutDashboard },
                  { name: "Target Finansial", icon: Target },
                  { name: "Alokasi Amplop", icon: Layers },
                  { name: "Rekening & Akun", icon: Wallet },
                  { name: "Buku Transaksi", icon: CreditCard },
                  { name: "Langganan & Tagihan", icon: Bell },
                  { name: "Analisis & Tren", icon: BarChart2 },
                ].map((item) => {
                  const isActive = activeNav === item.name;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveNav(item.name);
                        const slug = NAV_SLUGS[item.name];
                        if (slug) window.location.hash = slug;
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all text-left whitespace-nowrap select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 ${
                        isActive
                          ? "text-white bg-white/[0.08] border border-white/[0.1] shadow-xs font-semibold"
                          : "text-zinc-400 hover:text-white border border-transparent hover:border-white/[0.06] hover:bg-white/[0.04] font-medium"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amberGold" : "text-zinc-500"}`} />
                      <span className="truncate whitespace-nowrap">{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Actions inside Drawer */}
              <div className="mt-6 pt-4 border-t border-white/[0.08] space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Aksi Cepat
                </span>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold rounded-2xl bg-cyanHub/15 text-cyanHub border border-cyanHub/30 hover:bg-cyanHub/25 transition"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" />
                  <span>Transfer Antar Rekening</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={isExportingCSV}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium rounded-2xl bg-obsidian-card border border-white/[0.08] text-zinc-300 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExportingCSV ? (
                    <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-amberGold" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" />
                  )}
                  <span>{isExportingCSV ? "Mengunduh CSV..." : "Ekspor CSV Transaksi"}</span>
                </button>
                {currentUser?.id === 1 && googleSheetUrl && (
                  <a
                    href={googleSheetUrl}
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
                )}
              </div>
            </div>

            {/* Profile Footer */}
            <div className="pt-4 border-t border-obsidian-border text-xs mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slateText-primary font-semibold">{currentUser?.full_name || "Pengguna AI7"}</span>
                {currentUser ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-mintRise font-medium px-2 py-0.5 rounded-full bg-mintRise/10 border border-mintRise/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-mintRise"></span>
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                    Tamu
                  </span>
                )}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-obsidian-panel/95 backdrop-blur-md border-t border-white/[0.08] px-3 py-1 flex items-center justify-around safe-bottom shadow-2xl">
        <button
          onClick={() => setActiveNav("Ringkasan")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[56px] ${
            activeNav === "Ringkasan"
              ? "text-amberGold font-semibold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Ringkasan</span>
        </button>

        <button
          onClick={() => setActiveNav("Alokasi Amplop")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[56px] ${
            activeNav === "Alokasi Amplop"
              ? "text-amberGold font-semibold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Layers className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Amplop</span>
        </button>

        {/* Center Floating Plus Action */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="-mt-5 w-12 h-12 rounded-full bg-amberGold text-slate-950 shadow-lg shadow-black/25 flex items-center justify-center font-bold active:scale-90 transition border-2 border-obsidian-panel shrink-0"
          title="Catat Transaksi Baru"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        <button
          onClick={() => setActiveNav("Buku Transaksi")}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[56px] ${
            activeNav === "Buku Transaksi"
              ? "text-amberGold font-semibold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-5 h-5 shrink-0" />
          <span className="text-[10px] mt-0.5 leading-tight">Buku Kas</span>
        </button>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-w-[56px] ${
            ["Rekening & Akun", "Target Finansial", "Langganan & Tagihan", "Analisis & Tren"].includes(activeNav)
              ? "text-amberGold font-semibold"
              : "text-zinc-400 hover:text-white"
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
      <main ref={mainContentRef} className="flex-1 overflow-y-auto w-full">
        {/* Persistent Sticky Topbar Header */}
        <header className="sticky top-0 z-20 bg-obsidian-panel/90 backdrop-blur-md border-b border-obsidian-border p-4 sm:p-5 lg:px-6">
          <div className="max-w-7xl mx-auto w-full flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4">
            <div className="min-w-0 w-full 2xl:w-auto">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slateText-primary">
                  {activeNav === "Ringkasan" && "Ringkasan Portofolio & Alokasi"}
                  {activeNav === "Target Finansial" && "Target Finansial & Milestone Tabungan"}
                  {activeNav === "Alokasi Amplop" && "Alokasi Amplop & Plafon Belanja"}
                  {activeNav === "Rekening & Akun" && "Daftar Rekening & Saldo Akun"}
                  {activeNav === "Buku Transaksi" && "Buku Transaksi Lengkap (Ledger)"}
                  {activeNav === "Langganan & Tagihan" && "Pelacak Langganan & Tagihan Rutin"}
                  {activeNav === "Analisis & Tren" && "Analisis Tren & Burn-Rate Pengeluaran"}
                </h1>
                <div className="shrink-0">
                  <PeriodSelector
                    key={`${selectedPeriod.id}_${currentUser?.id || 1}`}
                    currentPeriod={selectedPeriod}
                    onSelectPeriod={(p) => setSelectedPeriod(p)}
                  />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slateText-secondary mt-1.5 line-clamp-1">
                {activeNav === "Ringkasan" && "Ikhtisar saldo real-time, laju belanja harian, dan alokasi anggaran"}
                {activeNav === "Target Finansial" && "Pantau akumulasi tabungan, portofolio investasi, dan milestone finansial"}
                {activeNav === "Alokasi Amplop" && "Monitoring batas belanja amplop kebutuhan pokok dan pos operasional"}
                {activeNav === "Rekening & Akun" && "Rincian saldo all-time dan pergerakan kas pada seluruh rekening aktif"}
                {activeNav === "Buku Transaksi" && "Histori seluruh pencatatan pengeluaran, pemasukan, dan transfer kas"}
                {activeNav === "Langganan & Tagihan" && "Kelola komitmen tagihan berulang dan evaluasi tanggal jatuh tempo"}
                {activeNav === "Analisis & Tren" && "Evaluasi kecepatan belanja kumulatif vs batas aman anggaran"}
              </p>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full 2xl:w-auto justify-start sm:justify-end">
              {/* Refresh Button (Icon-Only Compact) */}
              <button
                onClick={fetchData}
                title="Refresh Data Transaksi & Saldo"
                className="p-2.5 text-zinc-400 hover:text-white bg-obsidian-card hover:bg-obsidian-hover border border-white/[0.08] hover:border-white/[0.16] rounded-full transition inline-flex items-center justify-center shrink-0 shadow-xs active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? "animate-spin text-amberGold" : ""}`} />
              </button>

              {/* Export Dropdown Menu */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold border border-white/[0.08] rounded-2xl bg-obsidian-card text-zinc-300 hover:text-white hover:bg-obsidian-hover hover:border-white/[0.16] transition inline-flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
                >
                  <Download className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-white hidden sm:inline">Ekspor</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isExportMenuOpen ? "rotate-180 text-amberGold" : ""}`} />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 p-2 bg-obsidian-panel/95 backdrop-blur-md border border-white/[0.12] rounded-2xl shadow-2xl z-50 text-xs font-mono space-y-1 animate-fadeIn">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={isExportingCSV}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-white hover:bg-obsidian-hover hover:text-amberGold transition disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
                    >
                      {isExportingCSV ? (
                        <RefreshCw className="w-4 h-4 text-amberGold shrink-0 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <div className="text-left font-sans">
                        <div className="font-semibold text-xs text-white">
                          {isExportingCSV ? "Sedang Mengunduh..." : "Unduh CSV Transaksi"}
                        </div>
                        <div className="text-[10px] text-zinc-400">Seluruh histori ledger</div>
                      </div>
                    </button>

                    {currentUser?.id === 1 && googleSheetUrl && (
                      <a
                        href={googleSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsExportMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition border-t border-white/[0.08]"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="text-left font-sans min-w-0">
                          <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1">
                            Google Sheets Rapor
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </div>
                          <div className="text-[10px] text-zinc-400">Spreadsheet sinkronisasi</div>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Contextual Primary Actions */}
              {activeNav === "Target Finansial" ? (
                <button
                  onClick={() => setIsAddGoalModalOpen(true)}
                  className="px-5 py-2 text-xs sm:text-sm font-bold rounded-2xl bg-amberGold text-slate-950 hover:bg-yellow-300 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">Tambah Target</span>
                </button>
              ) : activeNav === "Langganan & Tagihan" ? (
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="px-5 py-2 text-xs sm:text-sm font-bold rounded-2xl bg-amberGold text-slate-950 hover:bg-yellow-300 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">Tambah Tagihan</span>
                </button>
              ) : activeNav === "Rekening & Akun" ? (
                <>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-2xl bg-cyanHub/15 text-cyanHub border border-cyanHub/40 hover:bg-cyanHub/25 transition inline-flex items-center justify-center gap-2 shadow-xs shrink-0 whitespace-nowrap active:scale-95"
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0 text-cyanHub" />
                    <span className="whitespace-nowrap font-semibold">Transfer Antar Akun</span>
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2 text-xs sm:text-sm font-bold rounded-2xl bg-amberGold text-slate-950 hover:bg-yellow-300 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">Catat Transaksi</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsPaycheckModalOpen(true)}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-2xl bg-mintRise/15 text-mintRise border border-mintRise/40 hover:bg-mintRise/25 transition inline-flex items-center justify-center gap-2 shadow-xs shrink-0 whitespace-nowrap active:scale-95"
                  >
                    <ArrowDownLeft className="w-4 h-4 shrink-0 text-mintRise" />
                    <span className="whitespace-nowrap font-semibold">Gajian Masuk</span>
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2 text-xs sm:text-sm font-bold rounded-2xl bg-amberGold text-slate-950 hover:bg-yellow-300 transition inline-flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">Catat Transaksi</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-3.5 sm:p-5 md:p-6 lg:p-8 xl:p-10 pb-24 md:pb-10 max-w-7xl mx-auto w-full space-y-5 sm:space-y-8">
        
        {/* Guest Mode Banner */}
        {!currentUser && (
          <div className="p-4 sm:p-5 rounded-3xl bg-obsidian-card border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amberGold/15 border border-amberGold/30 flex items-center justify-center text-amberGold shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Mode Tamu (Belum Masuk)
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Silakan masuk atau buat akun baru untuk mengakses pencatatan keuangan pribadi Anda secara aman.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-amberGold hover:bg-amber-300 text-slate-950 font-bold text-xs transition shrink-0 cursor-pointer shadow-sm"
            >
              Masuk / Daftar Sekarang
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: RINGKASAN */}
        {/* ============================================================== */}
        {activeNav === "Ringkasan" && (
          <div className="space-y-5 sm:space-y-8 animate-fadeIn">
            {/* Active Paycheck Session Banner */}
            {activePaycheckSession && activePaycheckSession.status === "in_progress" && (
              <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-mintRise/15 via-obsidian-card to-cyanHub/15 border border-mintRise/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-mintRise/20 border border-mintRise/40 flex items-center justify-center text-mintRise shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-mintRise" />
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
                  className="px-4 py-2 rounded-2xl text-xs font-bold bg-mintRise text-slate-950 hover:brightness-110 transition shrink-0 inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer self-end sm:self-center"
                >
                  <span>Lanjutkan Checklist</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
              {/* Net Worth */}
              <div className="xl:col-span-7 bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider truncate">
                      Total Kekayaan Bersih
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-300 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] shrink-0 whitespace-nowrap">
                      Seluruh {availableAccountNames.length} Rekening
                    </span>
                  </div>
                  {loading ? (
                    <div className="my-3">
                      <Skeleton className="h-10 sm:h-12 w-64 rounded-xl" />
                    </div>
                  ) : (
                    <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white my-3 font-mono truncate">
                      {formatRupiah(summary.total_balance ?? (summary.income - summary.expense))}{" "}
                      <span className="text-sm sm:text-base font-normal text-zinc-400 tracking-normal ml-1">
                        IDR
                      </span>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/[0.08]">
                    <Skeleton className="h-7 w-28 rounded-full" />
                    <Skeleton className="h-7 w-28 rounded-full" />
                    <Skeleton className="h-7 w-28 rounded-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-4 border-t border-white/[0.08]">
                    <div className="inline-flex items-center gap-1.5 text-mintRise font-mono font-semibold whitespace-nowrap min-w-0 bg-mintRise/10 border border-mintRise/20 px-3 py-1.5 rounded-full">
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatRupiah(summary.income)} in</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-coralFall font-mono font-semibold whitespace-nowrap min-w-0 bg-coralFall/10 border border-coralFall/20 px-3 py-1.5 rounded-full">
                      <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{formatRupiah(summary.expense)} out</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 inline-flex items-center gap-1.5 text-zinc-300 font-mono font-semibold whitespace-nowrap min-w-0 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-full">
                      <span className="truncate">Net: {formatRupiah(summary.income - summary.expense)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Safe-to-Spend (Opsi A: Standout Inverted Canary Yellow Card) */}
              <div className="xl:col-span-5 bg-[#FACC15] border border-yellow-400 rounded-3xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xl text-slate-950">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5] shrink-0" />
                      <span className="truncate">Batas Belanja Harian</span>
                    </span>
                    {loading ? (
                      <Skeleton className="w-20 h-6 rounded-full bg-black/20" />
                    ) : (
                      <span
                        className={`text-xs font-mono font-bold px-3 py-1 rounded-full border shrink-0 whitespace-nowrap shadow-xs ${
                          summary.safe_to_spend?.pace_status === "warning"
                            ? "bg-black text-amber-300 border-black"
                            : "bg-black text-emerald-400 border-black"
                        }`}
                      >
                        {summary.safe_to_spend?.pace_status === "warning" ? "🔴 Agak Boros" : "🟢 Pace Aman"}
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="my-3">
                      <Skeleton className="h-9 sm:h-10 w-48 rounded-xl bg-black/20" />
                    </div>
                  ) : (
                    <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 my-3 font-mono truncate">
                      {formatRupiah(summary.safe_to_spend?.safe_daily || 55000)}{" "}
                      <span className="text-sm sm:text-base font-bold text-slate-900/70 tracking-normal ml-1">
                        / hari
                      </span>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-black/15">
                    <Skeleton className="h-12 w-full rounded-2xl bg-black/20" />
                    <Skeleton className="h-12 w-full rounded-2xl bg-black/20" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-black/15">
                    <div className="bg-black/10 border border-black/15 rounded-2xl p-3 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-900/80 font-bold gap-1 uppercase tracking-wider">
                        <span className="truncate">Sisa Kuota {summary.safe_to_spend?.pocket_account || "Belanja"}</span>
                        {summary.safe_to_spend?.pocket_budget ? (
                          <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded-md bg-black/15 text-slate-950 shrink-0">
                            {Math.max(0, Math.round(((summary.safe_to_spend.pocket_remaining || 0) / summary.safe_to_spend.pocket_budget) * 100))}%
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm sm:text-base font-black font-mono text-slate-950 mt-1 truncate whitespace-nowrap">
                        {formatRupiah(summary.safe_to_spend?.pocket_remaining || 0)}
                        {summary.safe_to_spend?.pocket_budget ? (
                          <span className="text-slate-900/70 font-semibold text-xs font-mono">
                            {" "}
                            / {Math.round(summary.safe_to_spend.pocket_budget / 1000)}k
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="bg-black/10 border border-black/15 rounded-2xl p-3 min-w-0">
                      <div className="text-[11px] text-slate-900/80 font-bold uppercase tracking-wider">Rentang Waktu</div>
                      {summary.safe_to_spend?.days_remaining === 0 ? (
                        <div className="text-sm sm:text-base font-black font-mono text-slate-950 mt-1">
                          Periode Berakhir
                        </div>
                      ) : (
                        <div className="mt-1">
                          <div className="text-sm sm:text-base font-black font-mono text-slate-950 leading-tight">
                            Hari {summary.safe_to_spend?.day_of_cycle || 1} / {summary.safe_to_spend?.cycle_days || 14}
                          </div>
                          <div className="text-[11px] font-semibold font-mono text-slate-900/70 mt-0.5">
                            Sisa {summary.safe_to_spend?.days_remaining || 0} hari
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <StrataAllocationBar
              cycleType={summary.safe_to_spend?.cycle_type}
              cycleDays={summary.safe_to_spend?.cycle_days}
              totalSalary={paycheckConfig?.total_salary || 0}
              buckets={dynamicStrataBuckets}
              formatRupiah={formatRupiah}
              loading={loading}
            />
            <AccountGrid summary={summary} customAccounts={customAccounts} formatRupiah={formatRupiah} loading={loading} onAccountDeleted={fetchData} />

            {/* Quick Goals & Milestone Preview */}
            {loading ? (
              <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="flex justify-between items-center gap-2">
                  <Skeleton className="w-48 h-5 rounded-full" />
                  <Skeleton className="w-28 h-4 rounded-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <Skeleton className="w-24 h-4 rounded-full" />
                        <Skeleton className="w-10 h-4 rounded-full" />
                      </div>
                      <Skeleton className="w-full h-1.5 rounded-full" />
                      <div className="flex justify-between">
                        <Skeleton className="w-16 h-3 rounded-full" />
                        <Skeleton className="w-16 h-3 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : goals.length > 0 ? (
              <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-5 h-5 text-amberGold shrink-0" />
                    <h2 className="text-base font-bold text-white truncate">
                      Target & Milestone Tabungan
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveNav("Target Finansial")}
                    className="text-xs text-amberGold hover:underline font-semibold shrink-0 whitespace-nowrap inline-flex items-center gap-1 group"
                  >
                    <span>Buka Seluruh Target ({goals.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {goals.slice(0, 3).map((g) => {
                    const theme =
                      g.color === "cyan"
                        ? { dot: "bg-cyan-400", bar: "bg-gradient-to-r from-cyan-500 to-sky-400", text: "text-cyan-400" }
                        : g.color === "amber"
                        ? { dot: "bg-amber-400", bar: "bg-gradient-to-r from-amber-500 to-yellow-400", text: "text-amber-400" }
                        : { dot: "bg-emerald-400", bar: "bg-gradient-to-r from-emerald-500 to-teal-400", text: "text-emerald-400" };

                    return (
                      <div
                        key={g.id}
                        onClick={() => setActiveNav("Target Finansial")}
                        className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 space-y-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
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
                        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                          <span>{formatRupiah(g.current_amount)}</span>
                          <span>Target: {formatRupiah(g.target_amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <MandiriEnvelopes
              mandiriExpenses={mandiriExpenses}
              formatRupiah={formatRupiah}
              cycleDays={summary.safe_to_spend?.cycle_days || 14}
              pocketAccount={summary.safe_to_spend?.pocket_account || (customAccounts[0]?.name || "Saku Belanja")}
              pocketBudget={summary.safe_to_spend?.pocket_budget}
              loading={loading}
            />
            <BurnRateChart summary={summary} formatRupiah={formatRupiah} />

            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slateText-primary truncate">Transaksi Terakhir</h2>
                <button
                  onClick={() => setActiveNav("Buku Transaksi")}
                  className="text-xs text-amberGold hover:underline font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-1 group"
                >
                  <span>Buka Buku Transaksi Lengkap ({transactions.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              <TransactionTable
                transactions={transactions.slice(0, 5)}
                formatRupiah={formatRupiah}
                onEdit={(tx) => setTxToEdit(tx)}
                onDelete={(tx) => setTxToDelete(tx)}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW: TARGET FINANSIAL */}
        {/* ============================================================== */}
        {activeNav === "Target Finansial" && (
          <div className="animate-fadeIn">
            <GoalsView
              goals={goals}
              formatRupiah={formatRupiah}
              onOpenAddModal={() => setIsAddGoalModalOpen(true)}
              onEdit={(goal) => setGoalToEdit(goal)}
              onDelete={(id) => setGoalToDelete(id)}
              loading={loading}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: ALOKASI AMPLOP */}
        {/* ============================================================== */}
        {activeNav === "Alokasi Amplop" && (
          <div className="space-y-8 animate-fadeIn">
            <StrataAllocationBar
              cycleType={summary.safe_to_spend?.cycle_type}
              cycleDays={summary.safe_to_spend?.cycle_days}
              totalSalary={paycheckConfig?.total_salary || 0}
              buckets={dynamicStrataBuckets}
              formatRupiah={formatRupiah}
              loading={loading}
            />
            <MandiriEnvelopes
              mandiriExpenses={mandiriExpenses}
              formatRupiah={formatRupiah}
              cycleDays={summary.safe_to_spend?.cycle_days || 14}
              pocketAccount={summary.safe_to_spend?.pocket_account || (customAccounts[0]?.name || "Saku Belanja")}
              pocketBudget={summary.safe_to_spend?.pocket_budget}
              loading={loading}
            />

            {/* Pos Jago & Pos BRI */}
            <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
                    Amplop Tagihan Rutin & Utilitas
                  </h3>
                  <p className="text-xs text-slateText-secondary mt-0.5">
                    Alokasi autodebet tagihan berkala, langganan digital, dan komitmen bulanan
                  </p>
                </div>
                <button
                  onClick={() => setActiveNav("Langganan & Tagihan")}
                  className="text-xs text-amberGold hover:underline font-medium shrink-0 whitespace-nowrap inline-flex items-center gap-1 group"
                >
                  <span>Atur Tagihan ({subsData.items.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-obsidian-panel border border-obsidian-border rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slateText-primary text-sm truncate">Komitmen Tagihan Berjalan</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-mintRise shrink-0 whitespace-nowrap">
                      Autodebet
                    </span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-7 w-36 rounded-md" />
                  ) : (
                    <div className="text-xl font-bold font-mono text-slateText-primary">
                      {formatRupiah(subsData.total_monthly_commitment)} / bln
                    </div>
                  )}
                  <div className="text-xs text-slateText-muted">
                    {subsData.active_count} langganan aktif ({subsData.upcoming_this_week} jatuh tempo pekan ini)
                  </div>
                </div>

                <div className="bg-obsidian-panel border border-obsidian-border rounded-lg p-5 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slateText-primary text-sm truncate">Pos Tabungan & Investasi</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-cyanHub shrink-0 whitespace-nowrap">
                      Pertumbuhan Aset
                    </span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-7 w-36 rounded-md" />
                  ) : (
                    <div className="text-xl font-bold font-mono text-slateText-primary">
                      {formatRupiah(totalInvestasiReal)}
                    </div>
                  )}
                  <div className="text-xs text-slateText-muted">
                    {investasiLabels ? `${investasiLabels} • Saldo riil investasi` : "Belum ada rekening tipe Investasi"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
                <div className="text-cyanHub font-bold text-sm">Pos Dana Darurat (Cadangan Likuid)</div>
                {loading ? (
                  <Skeleton className="h-8 w-40 rounded-md" />
                ) : (
                  <div className="text-2xl font-bold font-mono text-slateText-primary">
                    {formatRupiah(totalDaruratReal)}
                  </div>
                )}
                <p className="text-xs text-slateText-muted">
                  {daruratLabels ? `${daruratLabels} • Cadangan likuid darurat` : "Belum ada rekening tipe Dana Darurat"}
                </p>
              </div>
              <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
                <div className="text-purpleLock font-bold text-sm">Pos Tabungan Terkunci (Tujuan Finansial)</div>
                {loading ? (
                  <Skeleton className="h-8 w-40 rounded-md" />
                ) : (
                  <div className="text-2xl font-bold font-mono text-slateText-primary">
                    {formatRupiah(totalTabunganReal)}
                  </div>
                )}
                <p className="text-xs text-slateText-muted">
                  {tabunganLabels ? `${tabunganLabels} • Tabungan terpisah terkunci` : "Belum ada rekening tipe Tabungan"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: REKENING & AKUN */}
        {/* ============================================================== */}
        {activeNav === "Rekening & Akun" && (
          <div className="space-y-8 animate-fadeIn">
            <AccountGrid summary={summary} customAccounts={customAccounts} formatRupiah={formatRupiah} loading={loading} onAccountDeleted={fetchData} />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-base text-white whitespace-nowrap">Histori Transaksi per Rekening</h3>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-full bg-cyanHub/10 border border-cyanHub/25 text-cyanHub hover:bg-cyanHub/20 transition inline-flex items-center gap-1.5 font-mono shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Pindah Saldo</span>
                  </button>
                  <button
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-full bg-amberGold/10 border border-amberGold/25 text-amberGold hover:bg-amberGold/20 transition inline-flex items-center gap-1.5 font-mono font-semibold shrink-0 whitespace-nowrap cursor-pointer"
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
                      className={`text-xs px-3.5 py-1.5 rounded-full font-mono transition shrink-0 whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                          : "bg-obsidian-card border border-white/[0.08] text-zinc-400 hover:text-white"
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
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: BUKU TRANSAKSI (LEDGER) */}
        {/* ============================================================== */}
        {activeNav === "Buku Transaksi" && (
          <div className="animate-fadeIn">
            <TransactionLedgerView
              transactions={transactions}
              accounts={allAccountTabs}
              currentCycle={
                summary.start_date && summary.end_date
                  ? {
                      start_date: summary.start_date,
                      end_date: summary.end_date,
                      label: summary.period_label || "",
                    }
                  : undefined
              }
              formatRupiah={formatRupiah}
              onEdit={(tx) => setTxToEdit(tx)}
              onDelete={(tx) => setTxToDelete(tx)}
              onOpenAddModal={() => setIsModalOpen(true)}
              loading={loading}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: LANGGANAN & TAGIHAN RUTIN */}
        {/* ============================================================== */}
        {activeNav === "Langganan & Tagihan" && (
          <div className="animate-fadeIn">
            <SubscriptionsView
              subsData={subsData}
              formatRupiah={formatRupiah}
              onOpenModal={() => setIsSubModalOpen(true)}
              onToggleActive={handleToggleSubscription}
              onDelete={handleDeleteSubscription}
              onEdit={(sub) => setSubToEdit(sub)}
              loading={loading}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 6: ANALISIS & TREN */}
        {/* ============================================================== */}
        {activeNav === "Analisis & Tren" && (
          <div className="animate-fadeIn">
            <AnalyticsView
              summary={{
                ...summary,
                period_type: summary.period_type || "cycle",
                period_label: summary.period_label || "",
                start_date: summary.start_date || "",
                end_date: summary.end_date || "",
                month_num: 10,
                year: 2026,
                daily_trend: summary.daily_trend || [],
                accounts: (summary.accounts || []).map((a) => ({
                  name: a.account,
                  type: "regular",
                  balance: a.balance,
                  expense: a.expense,
                })),
              }}
              formatRupiah={formatRupiah}
              loading={loading}
            />
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
          <div className="grid grid-cols-2 gap-2 bg-obsidian-panel p-1 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFormType("expense")}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
                formType === "expense"
                  ? "bg-coralFall text-slate-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setFormType("income")}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${
                formType === "income"
                  ? "bg-mintRise text-slate-950 font-bold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Pemasukan
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Nasi Padang + Es Teh"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Akun Rekening
              </label>
              <CustomSelect
                value={formAccount}
                onChange={setFormAccount}
                options={availableAccountOptions}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-white/[0.08] mt-5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] rounded-2xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:brightness-110 rounded-2xl transition inline-flex items-center gap-2 shadow-sm cursor-pointer ${
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
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Nama Layanan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Netflix, Spotify, Gym, ChatGPT"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition"
            />
          </div>

          {/* Switch Mode Siklus */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Metode Perhitungan Jatuh Tempo
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-obsidian-panel rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSubBillingType("fixed_day")}
                className={`py-2 px-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  subBillingType === "fixed_day"
                    ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
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
                className={`py-2 px-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  subBillingType === "exact_date"
                    ? "bg-amberGold text-slate-950 font-bold shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tgl Berakhir Spesifik (Gym)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
                  className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amberGold transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Tanggal Berakhir Riil
                </label>
                <input
                  type="date"
                  required
                  value={subExactDueDate}
                  onChange={(e) => setSubExactDueDate(e.target.value)}
                  className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amberGold transition"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <CustomSelect
                value={subCategory}
                onChange={setSubCategory}
                options={SUB_CATEGORY_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Share family plan / Kartu debit Jago"
              value={subNotes}
              onChange={(e) => setSubNotes(e.target.value)}
              className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition placeholder:text-zinc-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-white/[0.08] mt-5">
            <button
              type="button"
              onClick={() => setIsSubModalOpen(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] rounded-2xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-amberGold text-slate-950 hover:bg-amber-300 rounded-2xl transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
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
