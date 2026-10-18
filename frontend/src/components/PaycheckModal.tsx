"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Settings2,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
} from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { CurrencyInput } from "./ui/CurrencyInput";
import { CustomSelect } from "./ui/CustomSelect";

interface PaycheckConfig {
  id: number;
  source_account: string;
  use_gate: boolean;
  gate_name: string;
  cycle_type: string;
  cycle_days: number;
  pocket_account: string;
  is_active: boolean;
}

interface PaycheckBucket {
  id?: number;
  account: string;
  percentage: number;
  fixed_amount?: number | null;
  via_gate: boolean;
  via_secondary?: string | null;
  purpose: string;
  sort_order: number;
}

interface PaycheckStep {
  id: string;
  phase: number;
  app: string;
  title: string;
  badge?: string;
  description: string;
  source_account: string;
  target_account: string;
  amount: number;
  is_done: boolean;
  is_auto: boolean;
  creates_income: boolean;
  transaction_id?: number | null;
}

interface PaycheckSession {
  id: number;
  total_amount: number;
  date: string;
  status: string;
  note?: string;
  steps: PaycheckStep[];
  completed_steps: number;
  total_steps: number;
  progress_percentage: number;
}

interface PaycheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaycheckModal({
  isOpen,
  onClose,
  onSuccess,
}: PaycheckModalProps) {
  // Modal Views: 'setup' | 'checklist' | 'customize'
  const [view, setView] = useState<"setup" | "checklist" | "customize">("setup");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Setup state
  const [totalAmountStr, setTotalAmountStr] = useState<string>("1500000");
  const [cycleDate, setCycleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [config, setConfig] = useState<PaycheckConfig>({
    id: 1,
    source_account: "BRI 1",
    use_gate: true,
    gate_name: "Flip",
    cycle_type: "biweekly",
    cycle_days: 14,
    pocket_account: "Mandiri",
    is_active: true,
  });
  const [buckets, setBuckets] = useState<PaycheckBucket[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [account: string]: number }>({});

  // Active Session state
  const [activeSession, setActiveSession] = useState<PaycheckSession | null>(null);
  const [togglingStepId, setTogglingStepId] = useState<string | null>(null);

  // Customizer state
  const [customConfig, setCustomConfig] = useState<PaycheckConfig>(config);
  const [customBuckets, setCustomBuckets] = useState<PaycheckBucket[]>([]);

  // Fetch initial config & active session
  const fetchConfigAndSession = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Check active session
      const sessRes = await fetch("/api/v1/paycheck/session/active");
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData && sessData.id && sessData.status === "in_progress") {
          setActiveSession(sessData);
          setView("checklist");
          setLoading(false);
          return;
        }
      }

      // If no active session, fetch config & buckets
      const cfgRes = await fetch("/api/v1/paycheck/config");
      if (cfgRes.ok) {
        const data = await cfgRes.json();
        setConfig(data.config);
        setCustomConfig(data.config);
        setBuckets(data.buckets);
        setCustomBuckets(data.buckets);

        // Precompute default amounts
        const numTotal = parseInt(totalAmountStr.replace(/\D/g, ""), 10) || 1500000;
        initAmounts(numTotal, data.buckets);
      }
      setView("setup");
    } catch (err) {
      console.error("Error fetching paycheck data:", err);
      setErrorMsg("Gagal memuat pengaturan alokasi gajian.");
    } finally {
      setLoading(false);
    }
  };

  const initAmounts = (total: number, bList: PaycheckBucket[]) => {
    if (total === 1500000) {
      setCustomAmounts({
        Mandiri: 825000,
        "Bank Jago": 275000,
        Bibit: 200000,
        "BRI 2": 100000,
        "BRI 1": 100000,
      });
      return;
    }

    const calculated: { [account: string]: number } = {};
    let sum = 0;
    bList.forEach((b, idx) => {
      if (idx === bList.length - 1) {
        calculated[b.account] = Math.max(0, total - sum);
      } else {
        const amt = Math.round(total * (b.percentage / 100));
        calculated[b.account] = amt;
        sum += amt;
      }
    });
    setCustomAmounts(calculated);
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfigAndSession();
    }
  }, [isOpen]);

  // Recalculate amounts when totalAmountStr changes in setup
  const numTotal = useMemo(() => {
    return parseInt(totalAmountStr.replace(/\D/g, ""), 10) || 0;
  }, [totalAmountStr]);

  const totalAllocated = useMemo(() => {
    return Object.values(customAmounts).reduce((acc, val) => acc + (val || 0), 0);
  }, [customAmounts]);

  const balanceDifference = useMemo(() => {
    return numTotal - totalAllocated;
  }, [numTotal, totalAllocated]);

  const computeEndDateStr = () => {
    try {
      const d = new Date(cycleDate);
      if (isNaN(d.getTime())) return "";
      d.setDate(d.getDate() + (config.cycle_days || 14) - 1);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  const handleTotalChange = (val: string) => {
    setTotalAmountStr(val);
    const parsed = parseInt(val.replace(/\D/g, ""), 10) || 0;
    if (parsed > 0) {
      initAmounts(parsed, buckets);
    }
  };

  const handleAmountAdjust = (account: string, amount: number) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [account]: amount,
    }));
  };

  // Start new Paycheck Session
  const handleStartSession = async () => {
    if (balanceDifference !== 0) {
      setErrorMsg("Total alokasi harus seimbang dengan total uang masuk sebelum memulai.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/v1/paycheck/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: numTotal,
          date: cycleDate,
          note: "Uang Saku Ortu 2-Mingguan",
          allocations: customAmounts,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal memulai checklist gajian");
      }

      const sessionData = await res.json();
      setActiveSession(sessionData);
      setView("checklist");
      onSuccess(); // Refresh parent balances for auto-steps
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memulai sesi gajian";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Toggle single step
  const handleToggleStep = async (stepId: string) => {
    if (!activeSession) return;
    try {
      setTogglingStepId(stepId);
      const res = await fetch(
        `/api/v1/paycheck/session/${activeSession.id}/step/${stepId}/toggle`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Gagal mengupdate langkah");
      const updatedSession = await res.json();
      setActiveSession(updatedSession);
      onSuccess();
    } catch (err) {
      console.error("Step toggle error:", err);
    } finally {
      setTogglingStepId(null);
    }
  };

  // Complete all steps fast
  const handleCompleteAll = async () => {
    if (!activeSession) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/paycheck/session/${activeSession.id}/complete_all`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gagal menyelesaikan semua langkah");
      const updatedSession = await res.json();
      setActiveSession(updatedSession);
      onSuccess();
    } catch (err) {
      console.error("Complete all error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel active session
  const handleCancelSession = async () => {
    if (!activeSession) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/paycheck/session/${activeSession.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gagal membatalkan sesi");
      setActiveSession(null);
      setView("setup");
      onSuccess();
    } catch (err) {
      console.error("Cancel session error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save customized pipeline configuration
  const handleSaveCustomize = async () => {
    try {
      setLoading(true);
      // 1. Update config
      const cfgRes = await fetch("/api/v1/paycheck/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_account: customConfig.source_account,
          use_gate: customConfig.use_gate,
          gate_name: customConfig.gate_name,
          cycle_type: customConfig.cycle_type,
          cycle_days: customConfig.cycle_days,
          pocket_account: customConfig.pocket_account,
        }),
      });
      if (!cfgRes.ok) throw new Error("Gagal menyimpan konfigurasi alur");
      const savedCfg = await cfgRes.json();
      setConfig(savedCfg);

      // 2. Update buckets
      const bRes = await fetch("/api/v1/paycheck/buckets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          customBuckets.map((b, i) => ({
            account: b.account,
            percentage: b.percentage,
            fixed_amount: b.fixed_amount || null,
            via_gate: b.via_gate,
            via_secondary: b.via_secondary || null,
            purpose: b.purpose,
            sort_order: i + 1,
          }))
        ),
      });
      if (!bRes.ok) throw new Error("Gagal menyimpan pos alokasi");
      const savedBuckets = await bRes.json();
      setBuckets(savedBuckets);

      // Re-init amounts
      initAmounts(numTotal, savedBuckets);
      setView("setup");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan perubahan alur";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Colors per account for visual polish
  const getAccountDot = (acc: string) => {
    if (acc === "Mandiri") return "bg-amberGold shadow-amberGold/30";
    if (acc === "Bank Jago") return "bg-mintRise shadow-mintRise/30";
    if (acc === "Bibit") return "bg-emerald-400 shadow-emerald-400/30";
    if (acc === "BRI 1") return "bg-cyanHub shadow-cyanHub/30";
    if (acc === "BRI 2") return "bg-purpleLock shadow-purpleLock/30";
    return "bg-slate-400";
  };

  // Group steps by phase for checklist view
  const groupedSteps = useMemo(() => {
    if (!activeSession) return {};
    const groups: { [phase: number]: PaycheckStep[] } = {};
    activeSession.steps.forEach((s) => {
      if (!groups[s.phase]) groups[s.phase] = [];
      groups[s.phase].push(s);
    });
    return groups;
  }, [activeSession]);

  const isAllCompleted = activeSession?.status === "completed";

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === "checklist"
          ? "Checklist Eksekusi Gajian Bertahap"
          : view === "customize"
          ? "Sesuaikan Alur & Routing Gajian"
          : "Alokasi Gajian 14-Harian"
      }
      subtitle={
        view === "checklist"
          ? "Panduan transfer m-banking & jembatan Flip bebas biaya admin"
          : view === "customize"
          ? "Konfigurasi rekening hub, jembatan transfer, dan pos alokasi dinamis"
          : "Distribusi dana masuk orang tua dengan penyesuaian nominal per bagian"
      }
      icon={<Sparkles className="w-5 h-5 text-mintRise" />}
      accent="mint"
      maxWidth="xl"
    >
      {errorMsg && (
        <div className="p-3 mb-4 rounded-xl bg-roseFall/10 border border-roseFall/20 flex items-center gap-2.5 text-xs text-roseFall">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* -------------------- VIEW 1: SETUP & ADJUSTMENT -------------------- */}
      {view === "setup" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Total Uang Masuk
              </label>
              <CurrencyInput
                value={totalAmountStr}
                onChange={handleTotalChange}
                placeholder="1500000"
                accent="mint"
                quickAmounts={[1000000, 1500000, 2000000, 2500000]}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider">
                  Tanggal Siklus Dimulai
                </label>
                <span className="text-[10px] text-mintRise font-medium px-2 py-0.5 rounded bg-mintRise/10 border border-mintRise/20">
                  {config.cycle_days || 14} Hari
                </span>
              </div>
              <input
                type="date"
                value={cycleDate}
                onChange={(e) => setCycleDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-obsidian-panel border border-obsidian-border text-sm text-slateText-primary focus:outline-none focus:border-mintRise focus:ring-1 focus:ring-mintRise/30 transition [color-scheme:dark]"
              />
              <span className="text-[11px] text-slateText-muted mt-1.5 block">
                Berakhir: <strong className="text-slateText-secondary">{computeEndDateStr()}</strong>
              </span>
            </div>
          </div>

          {/* Allocation Breakdown Table */}
          <div className="p-4 rounded-2xl bg-obsidian-panel border border-obsidian-border space-y-3.5">
            <div className="flex justify-between items-center pb-3 border-b border-obsidian-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
                  Alokasi Pos (Dapat Disesuaikan)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-obsidian-card text-slateText-secondary border border-obsidian-border">
                  {buckets.length} Pos
                </span>
              </div>
              <button
                type="button"
                onClick={() => initAmounts(numTotal, buckets)}
                className="text-[11px] font-medium text-slateText-muted hover:text-mintRise flex items-center gap-1 transition"
                title="Kembalikan ke formula persentase standar"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Default
              </button>
            </div>

            <div className="space-y-3">
              {buckets.map((b) => {
                const currentAmt = customAmounts[b.account] || 0;
                return (
                  <div
                    key={b.account}
                    className="p-3 rounded-xl bg-obsidian-card border border-obsidian-border/50 hover:border-obsidian-border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${getAccountDot(b.account)}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slateText-primary truncate">
                            {b.account}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slateText-muted bg-obsidian-panel border border-obsidian-border/40">
                            {b.percentage}%
                          </span>
                          {b.via_gate && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-amberGold/90 bg-amberGold/10 border border-amberGold/20">
                              via {config.gate_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slateText-muted truncate mt-0.5">
                          {b.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-xs text-slateText-muted font-mono">Rp</span>
                      <input
                        type="text"
                        value={currentAmt > 0 ? currentAmt.toLocaleString("id-ID") : ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
                          handleAmountAdjust(b.account, val);
                        }}
                        className="w-32 h-8 px-2.5 text-right font-mono font-bold text-sm text-slateText-primary rounded-lg bg-obsidian-panel border border-obsidian-border focus:outline-none focus:border-mintRise focus:ring-1 focus:ring-mintRise/20 transition"
                        placeholder="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Balance Status Banner */}
            <div className="pt-3 border-t border-obsidian-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slateText-muted">Total Terbagi:</span>
                <span className="font-mono font-bold text-sm text-slateText-primary">
                  Rp {totalAllocated.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-slateText-muted">/ Rp {numTotal.toLocaleString("id-ID")}</span>
              </div>

              <div>
                {balanceDifference === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-mintRise/10 text-mintRise border border-mintRise/20">
                    <Check className="w-3.5 h-3.5" />
                    Alokasi Seimbang 100%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amberGold/10 text-amberGold border border-amberGold/20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Selisih: {balanceDifference > 0 ? "+" : ""}
                    Rp {balanceDifference.toLocaleString("id-ID")}{" "}
                    {balanceDifference > 0 ? "(Kurang Alokasi)" : "(Kelebihan)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-obsidian-border/50">
            <button
              type="button"
              onClick={() => setView("customize")}
              className="text-xs font-semibold text-slateText-secondary hover:text-slateText-primary flex items-center gap-1.5 px-3 py-2 rounded-xl border border-obsidian-border hover:border-obsidian-borderStrong transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-slateText-muted" />
              <span>Sesuaikan Alur & Routing</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                disabled={loading || balanceDifference !== 0}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{loading ? "Menyiapkan..." : "Mulai Checklist Transfer"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- VIEW 2: STEP-BY-STEP CHECKLIST -------------------- */}
      {view === "checklist" && activeSession && (
        <div className="space-y-4">
          {/* Progress Header Card */}
          <div className="p-4 rounded-2xl bg-obsidian-panel border border-obsidian-border space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold text-slateText-muted uppercase tracking-wider">
                  Status Distribusi
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-extrabold text-lg sm:text-xl text-slateText-primary">
                    Rp {activeSession.total_amount.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-slateText-muted">
                    • Siklus {activeSession.date}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold font-mono text-mintRise">
                  {activeSession.completed_steps} / {activeSession.total_steps} Selesai
                </span>
                <div className="text-[11px] text-slateText-muted">
                  {activeSession.progress_percentage}% terdistribusi
                </div>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <div className="w-full h-2 rounded-full bg-obsidian-card overflow-hidden p-0.5 border border-obsidian-border/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-mintRise to-cyanHub transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                style={{ width: `${activeSession.progress_percentage}%` }}
              />
            </div>
          </div>

          {/* Congratulations banner if completed */}
          {isAllCompleted && (
            <div className="p-4 rounded-2xl bg-mintRise/10 border border-mintRise/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-mintRise/20 flex items-center justify-center text-mintRise shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-mintRise">Alokasi Gajian Selesai!</h4>
                  <p className="text-xs text-slateText-secondary mt-0.5">
                    Seluruh transfer berhasil dicatat ke saldo rekening dan disinkronkan ke Google Sheets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 transition shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Grouped Steps List */}
          <div className="space-y-4 max-h-[55vh] overflow-y-auto scrollbar-thin pr-1">
            {[1, 2, 3].map((phaseNum) => {
              const phaseSteps = groupedSteps[phaseNum];
              if (!phaseSteps || phaseSteps.length === 0) return null;

              const phaseTitle =
                phaseNum === 1
                  ? `FASE 1: Buka ${config.source_account} (Rekening Hub)`
                  : phaseNum === 2
                  ? `FASE 2: Buka ${config.gate_name} (Distribusi Bebas Admin)`
                  : "FASE 3: Buka Bank Jago & Bibit (Investasi & Subs)";

              const phaseColor =
                phaseNum === 1
                  ? "border-cyanHub/30 text-cyanHub bg-cyanHub/5"
                  : phaseNum === 2
                  ? "border-amberGold/30 text-amberGold bg-amberGold/5"
                  : "border-mintRise/30 text-mintRise bg-mintRise/5";

              return (
                <div key={phaseNum} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${phaseColor}`}>
                      {phaseTitle}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {phaseSteps.map((step) => {
                      const isToggling = togglingStepId === step.id;
                      return (
                        <div
                          key={step.id}
                          onClick={() => !isToggling && handleToggleStep(step.id)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer select-none flex items-center justify-between gap-3 ${
                            step.is_done
                              ? "bg-obsidian-panel/60 border-obsidian-border/40 opacity-80"
                              : "bg-obsidian-card border-obsidian-border hover:border-mintRise/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox button */}
                            <div className="shrink-0">
                              {step.is_done ? (
                                <div className="w-6 h-6 rounded-lg bg-mintRise/20 border border-mintRise/50 flex items-center justify-center text-mintRise shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-lg bg-obsidian-panel border border-obsidian-borderStrong flex items-center justify-center hover:border-mintRise transition">
                                  {isToggling && (
                                    <div className="w-3 h-3 rounded-full border-2 border-mintRise border-t-transparent animate-spin" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Step details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-semibold text-sm truncate ${
                                    step.is_done
                                      ? "text-slateText-muted line-through"
                                      : "text-slateText-primary"
                                  }`}
                                >
                                  {step.title}
                                </span>
                                {step.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-obsidian-panel border border-obsidian-border text-slateText-secondary shrink-0">
                                    {step.badge}
                                  </span>
                                )}
                                {step.is_auto && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyanHub bg-cyanHub/10 border border-cyanHub/20">
                                    Otomatis
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slateText-muted truncate mt-0.5">
                                {step.description}
                              </p>
                            </div>
                          </div>

                          {/* Step amount */}
                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono font-bold text-sm ${
                                step.is_done
                                  ? "text-slateText-muted"
                                  : "text-mintRise"
                              }`}
                            >
                              Rp {step.amount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-obsidian-border/50">
            <button
              type="button"
              onClick={handleCancelSession}
              disabled={loading}
              className="text-xs font-semibold text-roseFall hover:text-rose-400 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-roseFall/20 hover:border-roseFall/40 transition cursor-pointer"
              title="Batalkan sesi ini dan hapus transaksi yang sempat dicatat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Batalkan Sesi</span>
            </button>

            <div className="flex items-center gap-2 ml-auto">
              {!isAllCompleted && (
                <button
                  type="button"
                  onClick={handleCompleteAll}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition cursor-pointer"
                >
                  Tandai Semua Selesai
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs sm:text-sm font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 rounded-xl transition cursor-pointer"
              >
                {isAllCompleted ? "Selesai & Tutup" : "Simpan & Lanjutkan Nanti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- VIEW 3: CUSTOMIZE PIPELINE & BUCKETS -------------------- */}
      {view === "customize" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-obsidian-card border border-obsidian-border/60 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slateText-primary">Konfigurasi Multi-User</h4>
              <p className="text-[11px] text-slateText-muted">
                Atur rekening penampung awal (hub), nama jembatan transfer (Flip/BI-Fast), dan pos tujuan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("setup")}
              className="text-xs text-slateText-secondary hover:text-slateText-primary flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          </div>

          {/* Config Settings Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Rekening Sumber (Hub)
              </label>
              <input
                type="text"
                value={customConfig.source_account}
                onChange={(e) => setCustomConfig({ ...customConfig, source_account: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-obsidian-panel border border-obsidian-border text-sm text-slateText-primary focus:outline-none focus:border-mintRise transition"
                placeholder="BRI 1 / BCA / Payroll"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Pakai Gate Jembatan?
              </label>
              <CustomSelect
                value={customConfig.use_gate ? "yes" : "no"}
                onChange={(val) => setCustomConfig({ ...customConfig, use_gate: val === "yes" })}
                options={[
                  { value: "yes", label: "Ya (Hemat via Gate)", color: "bg-mintRise" },
                  { value: "no", label: "Tidak (Direct Transfer)", color: "bg-slate-400" },
                ]}
                accent="mint"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Nama Gate Jembatan
              </label>
              <input
                type="text"
                value={customConfig.gate_name}
                onChange={(e) => setCustomConfig({ ...customConfig, gate_name: e.target.value })}
                disabled={!customConfig.use_gate}
                className="w-full h-10 px-3 rounded-xl bg-obsidian-panel border border-obsidian-border text-sm text-slateText-primary focus:outline-none focus:border-mintRise transition disabled:opacity-40"
                placeholder="Flip / OVO / DANA"
              />
            </div>
          </div>

          {/* Cycle & Budget Settings */}
          <div className="p-4 rounded-2xl bg-obsidian-panel border border-obsidian-border space-y-3">
            <span className="text-xs font-semibold text-slateText-muted uppercase tracking-wider block">
              Pengaturan Siklus Anggaran & Dompet Harian
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                  Tipe Siklus
                </label>
                <CustomSelect
                  value={customConfig.cycle_type || "biweekly"}
                  onChange={(val) => {
                    let days = customConfig.cycle_days;
                    if (val === "biweekly") days = 14;
                    else if (val === "monthly") days = 30;
                    else if (val === "weekly") days = 7;
                    setCustomConfig({
                      ...customConfig,
                      cycle_type: val,
                      cycle_days: days,
                    });
                  }}
                  options={[
                    { value: "biweekly", label: "2-Mingguan (14 Hari)", color: "bg-mintRise" },
                    { value: "monthly", label: "Bulanan (30 Hari)", color: "bg-cyanHub" },
                    { value: "weekly", label: "Mingguan (7 Hari)", color: "bg-amberGold" },
                    { value: "custom", label: "Kustom (Jumlah Hari)", color: "bg-purple-400" },
                  ]}
                  accent="mint"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                  Durasi Siklus (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customConfig.cycle_days || 14}
                  onChange={(e) =>
                    setCustomConfig({
                      ...customConfig,
                      cycle_days: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-obsidian-card border border-obsidian-border text-sm text-slateText-primary focus:outline-none focus:border-mintRise transition font-mono"
                  placeholder="14 / 30 / 7"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                  Rekening Saku Harian
                </label>
                <input
                  type="text"
                  value={customConfig.pocket_account || "Mandiri"}
                  onChange={(e) =>
                    setCustomConfig({
                      ...customConfig,
                      pocket_account: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-obsidian-card border border-obsidian-border text-sm text-slateText-primary focus:outline-none focus:border-mintRise transition"
                  placeholder="Mandiri / BCA / Saku"
                />
              </div>
            </div>
            <p className="text-[11px] text-slateText-muted leading-relaxed">
              Durasi siklus menentukan rentang waktu evaluasi Safe-to-Spend, burn rate, dan tanggal snapshot penutupan siklus. Rekening saku adalah akun yang dievaluasi burn rate belanjanya.
            </p>
          </div>

          {/* Buckets Editor */}
          <div className="p-4 rounded-2xl bg-obsidian-panel border border-obsidian-border space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-obsidian-border">
              <span className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
                Daftar Pos Alokasi & Persentase
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomBuckets([
                    ...customBuckets,
                    {
                      account: "Rekening Baru",
                      percentage: 10,
                      via_gate: customConfig.use_gate,
                      purpose: "Pos Alokasi Tambahan",
                      sort_order: customBuckets.length + 1,
                    },
                  ]);
                }}
                className="text-xs font-semibold text-mintRise hover:brightness-110 flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pos
              </button>
            </div>

            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto scrollbar-thin pr-1">
              {customBuckets.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-obsidian-card border border-obsidian-border flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                    <input
                      type="text"
                      value={b.account}
                      onChange={(e) => {
                        const copy = [...customBuckets];
                        copy[idx].account = e.target.value;
                        setCustomBuckets(copy);
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg bg-obsidian-panel border border-obsidian-border text-slateText-primary font-semibold"
                      placeholder="Nama Akun"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={b.percentage}
                        onChange={(e) => {
                          const copy = [...customBuckets];
                          copy[idx].percentage = parseFloat(e.target.value) || 0;
                          setCustomBuckets(copy);
                        }}
                        className="h-8 w-20 px-2 text-xs rounded-lg bg-obsidian-panel border border-obsidian-border text-slateText-primary font-mono"
                        placeholder="%"
                      />
                      <span className="text-xs text-slateText-muted">%</span>
                    </div>
                    <input
                      type="text"
                      value={b.purpose}
                      onChange={(e) => {
                        const copy = [...customBuckets];
                        copy[idx].purpose = e.target.value;
                        setCustomBuckets(copy);
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg bg-obsidian-panel border border-obsidian-border text-slateText-primary col-span-2"
                      placeholder="Tujuan / Keterangan Pos"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <label className="text-[11px] text-slateText-muted flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.via_gate}
                        onChange={(e) => {
                          const copy = [...customBuckets];
                          copy[idx].via_gate = e.target.checked;
                          setCustomBuckets(copy);
                        }}
                        className="rounded border-obsidian-border"
                      />
                      via Gate
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomBuckets(customBuckets.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 rounded-lg text-slateText-muted hover:text-roseFall transition"
                      title="Hapus Pos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Validation sum */}
            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="text-slateText-muted">Total Persentase:</span>
              <span
                className={`font-mono font-bold ${
                  Math.round(customBuckets.reduce((acc, b) => acc + (b.percentage || 0), 0)) === 100
                    ? "text-mintRise"
                    : "text-amberGold"
                }`}
              >
                {customBuckets.reduce((acc, b) => acc + (b.percentage || 0), 0).toFixed(1)}% / 100%
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 flex justify-end gap-3 border-t border-obsidian-border/50">
            <button
              type="button"
              onClick={() => setView("setup")}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveCustomize}
              disabled={loading}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-mintRise text-[#0B0D11] hover:brightness-110 rounded-xl transition cursor-pointer"
            >
              {loading ? "Menyimpan..." : "Simpan Pengaturan Alur"}
            </button>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
