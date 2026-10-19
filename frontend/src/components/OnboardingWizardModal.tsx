"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Wallet,
  Calendar,
  Layers,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle
} from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { CustomSelect } from "./ui/CustomSelect";
import { CurrencyInput } from "./ui/CurrencyInput";
import { authFetch, UserProfile, setStoredUser } from "@/lib/api";

interface InitialAccountInput {
  name: string;
  type: string;
  tag: string;
  color: string;
  initial_balance: number;
}

interface BucketInput {
  account: string;
  percentage: number;
  via_gate: boolean;
  via_secondary?: string | null;
  purpose: string;
}

interface OnboardingWizardModalProps {
  isOpen: boolean;
  user?: UserProfile | null;
  onClose?: () => void;
  onComplete: (updatedUser: UserProfile) => void;
}

const DEFAULT_INITIAL_ACCOUNTS: InitialAccountInput[] = [
  { name: "Rekening Utama", type: "operasional", tag: "Saku Belanja Harian", color: "amberGold", initial_balance: 0 },
  { name: "Uang Tunai (Cash)", type: "operasional", tag: "Dompet Tunai", color: "amberGold", initial_balance: 0 },
  { name: "Tabungan", type: "tabungan", tag: "Pos Simpanan", color: "purpleLock", initial_balance: 0 },
];

function generateBucketsFromAccounts(accList: InitialAccountInput[]): BucketInput[] {
  if (!accList || accList.length === 0) return [];
  const n = accList.length;
  if (n === 1) {
    return [{
      account: accList[0].name,
      percentage: 100.0,
      via_gate: false,
      via_secondary: null,
      purpose: "Alokasi Operasional & Saku",
    }];
  }
  if (n === 2) {
    return [
      { account: accList[0].name, percentage: 70.0, via_gate: false, via_secondary: null, purpose: "Kebutuhan Pokok & Saku" },
      { account: accList[1].name, percentage: 30.0, via_gate: false, via_secondary: null, purpose: "Tabungan & Cadangan" },
    ];
  }
  if (n === 3) {
    return [
      { account: accList[0].name, percentage: 50.0, via_gate: false, via_secondary: null, purpose: "Kebutuhan Pokok & Saku" },
      { account: accList[1].name, percentage: 30.0, via_gate: false, via_secondary: null, purpose: "Tagihan & Kebutuhan Rutin" },
      { account: accList[2].name, percentage: 20.0, via_gate: false, via_secondary: null, purpose: "Tabungan & Investasi" },
    ];
  }
  const basePct = Math.floor((100 / n) * 10) / 10;
  const remPct = Math.round((100 - basePct * (n - 1)) * 10) / 10;
  return accList.map((acc, idx) => ({
    account: acc.name,
    percentage: idx === 0 ? remPct : basePct,
    via_gate: false,
    via_secondary: null,
    purpose: acc.tag || (acc.type === "investasi" ? "Investasi & Aset" : acc.type === "darurat" ? "Dana Darurat" : "Operasional"),
  }));
}

export function OnboardingWizardModal({ isOpen, user, onClose, onComplete }: OnboardingWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Accounts
  const [accounts, setAccounts] = useState<InitialAccountInput[]>(DEFAULT_INITIAL_ACCOUNTS);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("operasional");

  // Step 2: Budget Cycle & Pocket
  const [cycleType, setCycleType] = useState<"biweekly" | "monthly" | "weekly" | "custom">("biweekly");
  const [customDays, setCustomDays] = useState(14);
  const [pocketAccount, setPocketAccount] = useState("Rekening Utama");
  const [startDateStr, setStartDateStr] = useState(new Date().toISOString().split("T")[0]);

  // Step 3: Paycheck & Gate
  const [sourceAccount, setSourceAccount] = useState("Rekening Utama");
  const [useGate, setUseGate] = useState(false);
  const gateName = "Direct Transfer";
  const [buckets, setBuckets] = useState<BucketInput[]>(() => generateBucketsFromAccounts(DEFAULT_INITIAL_ACCOUNTS));

  const syncAccountsWithState = (updatedAccounts: InitialAccountInput[]) => {
    if (!updatedAccounts.some((a) => a.name === pocketAccount)) {
      if (updatedAccounts.length > 0) setPocketAccount(updatedAccounts[0].name);
    }
    if (!updatedAccounts.some((a) => a.name === sourceAccount)) {
      if (updatedAccounts.length > 0) setSourceAccount(updatedAccounts[0].name);
    }
    setBuckets((prevBuckets) => {
      const accNames = new Set(updatedAccounts.map((a) => a.name));
      const validBuckets = prevBuckets.filter((b) => accNames.has(b.account));
      const existingNames = new Set(validBuckets.map((b) => b.account));
      const missingAccounts = updatedAccounts.filter((a) => !existingNames.has(a.name));

      if (validBuckets.length === 0) {
        return generateBucketsFromAccounts(updatedAccounts);
      }
      if (missingAccounts.length > 0) {
        const added: BucketInput[] = missingAccounts.map((a) => ({
          account: a.name,
          percentage: 0,
          via_gate: false,
          via_secondary: null,
          purpose: a.tag || "Alokasi Pos",
        }));
        return [...validBuckets, ...added];
      }
      return validBuckets;
    });
  };

  const getEffectiveCycleDays = () => {
    if (cycleType === "biweekly") return 14;
    if (cycleType === "monthly") return 30;
    if (cycleType === "weekly") return 7;
    return customDays;
  };

  const handleAccountBalanceChange = (index: number, val: number) => {
    setAccounts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], initial_balance: val };
      return copy;
    });
  };

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    const clean = newAccName.trim();
    if (accounts.some((a) => a.name.toLowerCase() === clean.toLowerCase())) {
      setError("Nama rekening sudah ada");
      return;
    }
    setAccounts((prev) => [
      ...prev,
      {
        name: clean,
        type: newAccType,
        tag: `Akun ${clean}`,
        color: "amberGold",
        initial_balance: 0,
      },
    ]);
    setNewAccName("");
    setError(null);
  };

  const handleRemoveAccount = (index: number) => {
    if (accounts.length <= 1) {
      setError("Minimal harus ada 1 rekening");
      return;
    }
    setAccounts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleFinishOnboarding = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        initial_accounts: accounts,
        cycle_type: cycleType,
        cycle_days: getEffectiveCycleDays(),
        cycle_start_date: startDateStr,
        pocket_account: pocketAccount,
        source_account: sourceAccount,
        use_gate: useGate,
        gate_name: gateName,
        buckets: buckets,
      };

      const res = await authFetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response fallback
      }

      if (!res.ok || !data) {
        const detail = (data as { detail?: string })?.detail;
        throw new Error(detail || `Gagal menyelesaikan proses onboarding (Status: ${res.status})`);
      }

      const userData = data as unknown as UserProfile;
      setStoredUser(userData);
      onComplete(userData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan pada server saat onboarding");
    } finally {
      setLoading(false);
    }
  };

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const totalInitialBalance = accounts.reduce((acc, curr) => acc + curr.initial_balance, 0);

  const getCycleTypeLabel = () => {
    if (cycleType === "monthly") return "Bulanan Penuh";
    if (cycleType === "biweekly") return "2-Mingguan";
    if (cycleType === "weekly") return "Mingguan";
    return "Kustom";
  };

  const getEstimatedEndDate = () => {
    if (!startDateStr) return "";
    try {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + getEffectiveCycleDays() - 1);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Setup Awal Finansial Anda"
      subtitle={`Selamat datang ${user?.full_name || ""}! Mari konfigurasi fondasi keuangan Anda`}
      icon={<Sparkles className="w-4 h-4 text-amber-400" />}
      accent="amber"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: "Rekening" },
            { num: 2, label: "Siklus" },
            { num: 3, label: "Gajian" },
            { num: 4, label: "Selesai" },
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-[#181C26]/60 border-[#252B3B] text-slate-500"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? "bg-amber-500 text-slate-950"
                      : isDone
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-[#252B3B] text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> : s.num}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-[11px] font-medium leading-none truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: INITIAL ACCOUNTS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#181C26] p-3.5 rounded-xl border border-[#252B3B]">
              <h4 className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                Daftar Rekening & Saldo Awal Saat Ini
              </h4>
              <p className="text-[11px] text-slate-400">
                Masukkan saldo yang Anda miliki saat ini. Saldo ini akan menjadi saldo modal awal di pembukuan.
              </p>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {accounts.map((acc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#181C26] border border-[#252B3B] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-200 truncate">{acc.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{acc.type} • {acc.tag}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:w-[220px]">
                    <div className="flex-1">
                      <CurrencyInput
                        value={acc.initial_balance ? acc.initial_balance.toString() : ""}
                        onChange={(val) => handleAccountBalanceChange(idx, parseInt(val || "0", 10))}
                        placeholder="0"
                        accent="amber"
                      />
                    </div>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Hapus Rekening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick add custom account */}
            <div className="p-3 rounded-xl bg-[#181C26]/40 border border-dashed border-[#252B3B] flex flex-col sm:flex-row gap-2.5 items-center">
              <input
                type="text"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                placeholder="+ Tambah rekening lain (misal: BCA, Seabank)"
                className="flex-1 bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/50"
              />
              <div className="w-full sm:w-[150px]">
                <CustomSelect
                  value={newAccType}
                  onChange={(val) => setNewAccType(val)}
                  options={[
                    { value: "operasional", label: "Operasional" },
                    { value: "tabungan", label: "Tabungan" },
                    { value: "investasi", label: "Investasi" },
                    { value: "darurat", label: "Dana Darurat" },
                  ]}
                  accent="amber"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAccount}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <span>Total Saldo Modal Awal:</span>
              <span className="font-semibold text-emerald-400 font-mono text-sm">{formatRp(totalInitialBalance)}</span>
            </div>
          </div>
        )}

        {/* STEP 2: BUDGET CYCLE */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#181C26] p-3.5 rounded-xl border border-[#252B3B]">
              <h4 className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Pilih Durasi Siklus Anggaran & Saku Harian
              </h4>
              <p className="text-[11px] text-slate-400">
                Pacing burn-rate dan Safe-to-Spend harian Anda akan dihitung secara otomatis berdasarkan ritme siklus ini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Mode Durasi Siklus
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "biweekly", label: "2-Mingguan", desc: "14 Hari (Bi-Weekly)" },
                  { id: "monthly", label: "Bulanan", desc: "30 Hari (Gaji Bulanan)" },
                  { id: "weekly", label: "Mingguan", desc: "7 Hari (Frekuensi Cepat)" },
                  { id: "custom", label: "Kustom N-Hari", desc: "Fleksibel Bebas" },
                ].map((item) => {
                  const isSel = cycleType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCycleType(item.id as "biweekly" | "monthly" | "weekly" | "custom")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm"
                          : "bg-[#181C26] border-[#252B3B] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {cycleType === "custom" && (
              <div className="p-3.5 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-medium text-slate-300">
                  Jumlah Hari Per Siklus
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#12151D] border border-[#252B3B] text-slate-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Rekening Saku Harian (Safe-to-Spend)
                </label>
                <CustomSelect
                  value={pocketAccount}
                  onChange={(val) => setPocketAccount(val)}
                  options={accounts.map((a) => ({
                    value: a.name,
                    label: `${a.name} (${a.tag})`,
                  }))}
                  accent="cyan"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Rekening ini yang dihitung burn-rate dan pengeluaran harian makanan/jajan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tanggal Mulai Siklus Pertama
                </label>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tanggal mulai siklus anggaran Anda saat ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAYCHECK DISTRIBUTION & GATE */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#181C26] p-3.5 rounded-xl border border-[#252B3B]">
              <h4 className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Alur Distribusi Gajian & Gerbang Flip Bebas Admin
              </h4>
              <p className="text-[11px] text-slate-400">
                Atur rekening penampung gaji utama dan apakah ingin mengaktifkan jembatan perantara bebas biaya transfer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Rekening Hub Gajian Utama
                </label>
                <CustomSelect
                  value={sourceAccount}
                  onChange={(val) => setSourceAccount(val)}
                  options={accounts.map((a) => ({
                    value: a.name,
                    label: `${a.name} (Hub Gajian)`,
                  }))}
                  accent="mint"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Gunakan Gerbang Bebas Admin?
                </label>
                <CustomSelect
                  value={useGate ? "yes" : "no"}
                  onChange={(val) => setUseGate(val === "yes")}
                  options={[
                    { value: "yes", label: "Ya (Hemat Admin via Flip)" },
                    { value: "no", label: "Tidak (Direct Transfer)" },
                  ]}
                  accent="mint"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Alokasi Persen Tiap Pos Gajian
              </label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {buckets.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#181C26] border border-[#252B3B] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-200 truncate">{b.account}</p>
                      <p className="text-[10px] text-slate-400 truncate">{b.purpose}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        value={b.percentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBuckets((prev) => {
                            const c = [...prev];
                            c[idx] = { ...c[idx], percentage: val };
                            return c;
                          });
                        }}
                        className="w-16 bg-[#12151D] border border-[#252B3B] text-slate-100 rounded-lg px-2 py-1 text-xs text-right font-mono"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY & READY */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-emerald-300">Konfigurasi Siap Diterapkan!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Profil finansial pribadi Anda akan diisolasi secara mandiri dalam database.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Siklus Anggaran</span>
                <p className="font-semibold text-slate-200">
                  {getEffectiveCycleDays()} Hari ({getCycleTypeLabel()})
                </p>
                <p className="text-[10px] text-cyan-400">
                  Mulai {startDateStr ? new Date(startDateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Hari ini"}{getEstimatedEndDate() ? ` s.d. ${getEstimatedEndDate()}` : ""}
                </p>
                <p className="text-[10px] text-slate-400">Saku: {pocketAccount}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-1">
                <span className="text-[10px] text-slate-400 font-medium">Rekening & Saldo Awal</span>
                <p className="font-semibold text-emerald-400 font-mono">
                  {formatRp(totalInitialBalance)}
                </p>
                <p className="text-[10px] text-slate-400">{accounts.length} Akun Terdaftar</p>
              </div>

              <div className="p-3 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-1 col-span-2">
                <span className="text-[10px] text-slate-400 font-medium">Alur Gajian & Gate</span>
                <p className="font-medium text-slate-200">
                  Sumber: <span className="text-amber-400">{sourceAccount}</span> • Gerbang:{" "}
                  <span className="text-emerald-400">{useGate ? "Flip (Hemat Admin)" : "Direct"}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#252B3B]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((prev) => (Math.max(1, prev - 1) as 1 | 2 | 3 | 4)); }}
              className="px-4 py-2 rounded-xl bg-[#181C26] hover:bg-slate-800 border border-[#252B3B] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((prev) => (Math.min(4, prev + 1) as 1 | 2 | 3 | 4)); }}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Lanjutkan
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinishOnboarding}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  Menerapkan Setup...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Selesaikan & Buka Dashboard!
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </CustomModal>
  );
}
