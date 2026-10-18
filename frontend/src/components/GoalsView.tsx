import React from "react";
import {
  Plus,
  Target,
  Edit2,
  Trash2,
  Calendar,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { GoalItem } from "./EditGoalModal";

interface GoalsViewProps {
  goals: GoalItem[];
  formatRupiah: (val: number) => string;
  onOpenAddModal: () => void;
  onEdit: (goal: GoalItem) => void;
  onDelete: (id: number) => void;
}

const COLOR_THEMES: Record<
  string,
  {
    dot: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    gradient: string;
    glow: string;
    radialGlow: string;
  }
> = {
  emerald: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/20",
    gradient: "from-emerald-500 via-teal-400 to-emerald-400",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.35)]",
    radialGlow: "bg-emerald-500/10",
  },
  cyan: {
    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    badgeBorder: "border-cyan-500/20",
    gradient: "from-cyan-500 via-sky-400 to-blue-400",
    glow: "shadow-[0_0_10px_rgba(6,182,212,0.35)]",
    radialGlow: "bg-cyan-500/10",
  },
  amber: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    badgeBorder: "border-amber-500/20",
    gradient: "from-amber-500 via-amber-400 to-yellow-400",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.35)]",
    radialGlow: "bg-amber-500/10",
  },
  purple: {
    dot: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    badgeBorder: "border-purple-500/20",
    gradient: "from-purple-500 via-fuchsia-400 to-purple-400",
    glow: "shadow-[0_0_10px_rgba(168,85,247,0.35)]",
    radialGlow: "bg-purple-500/10",
  },
  rose: {
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-400",
    badgeBorder: "border-rose-500/20",
    gradient: "from-rose-500 via-rose-400 to-pink-400",
    glow: "shadow-[0_0_10px_rgba(244,63,94,0.35)]",
    radialGlow: "bg-rose-500/10",
  },
};

function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

function formatDateIndo(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${day} ${month} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function renderGoalIcon(icon: string, name: string, category: string) {
  const lower = (name + " " + category).toLowerCase();
  if (lower.includes("dingin") || lower.includes("tabungan") || icon === "🛡️") {
    return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  }
  if (lower.includes("investasi") || lower.includes("bibit") || lower.includes("reksadana") || icon === "📈") {
    return <TrendingUp className="w-5 h-5 text-cyan-400" />;
  }
  if (lower.includes("darurat") || icon === "🚨") {
    return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  }
  if (lower.includes("laptop") || lower.includes("gadget") || icon === "💻") {
    return <Sparkles className="w-5 h-5 text-purple-400" />;
  }
  if (icon && icon.length <= 4 && !icon.startsWith("http")) {
    return <span className="text-xl leading-none select-none">{icon}</span>;
  }
  return <Target className="w-5 h-5 text-amberGold" />;
}

export function GoalsView({
  goals,
  formatRupiah,
  onOpenAddModal,
  onEdit,
  onDelete,
}: GoalsViewProps) {
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalCurrent = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 1000) / 10 : 0;

  return (
    <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0E1015] border border-white/[0.07] rounded-xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-medium text-slateText-muted uppercase tracking-wider truncate">
            Total Target Finansial
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight truncate">
            {formatRupiah(totalTarget)}
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Akumulasi seluruh milestone
          </div>
        </div>

        <div className="bg-[#0E1015] border border-white/[0.07] rounded-xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-medium text-slateText-muted uppercase tracking-wider truncate">
            Total Terkumpul
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight truncate">
            {formatRupiah(totalCurrent)}
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Progres all-time tersinkronisasi
          </div>
        </div>

        <div className="bg-[#0E1015] border border-white/[0.07] rounded-xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-medium text-slateText-muted uppercase tracking-wider truncate">
            Rata-rata Capaian
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight truncate">
            {overallPercentage}%
          </div>
          <div className="text-xs text-slateText-secondary font-mono truncate">
            Sisa {formatRupiah(Math.max(0, totalTarget - totalCurrent))}
          </div>
        </div>

        <div className="bg-[#0E1015] border border-white/[0.07] rounded-xl p-5 space-y-2 shadow-xs">
          <div className="text-xs font-medium text-slateText-muted uppercase tracking-wider truncate">
            Status Sasaran
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight truncate">
            {goals.filter((g) => g.remaining_amount === 0).length} / {goals.length}{" "}
            <span className="text-xs font-normal text-slateText-muted font-sans">Tercapai</span>
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            {goals.filter((g) => g.remaining_amount > 0).length} target masih berjalan
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary flex items-center gap-2">
            <Target className="w-5 h-5 text-amberGold" />
            Milestone Tracker Tabungan & Investasi
          </h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Pantau akumulasi target dana dingin BRI 2, portofolio Bibit, dan alokasi tabungan masa depan
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-amberGold text-obsidian-bg font-semibold rounded-lg hover:bg-amber-400 transition-colors shadow-xs text-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Target Baru</span>
        </button>
      </div>

      {/* Milestone Cards Grid */}
      {goals.length === 0 ? (
        <div className="bg-[#0E1015] border border-white/[0.07] rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amberGold/10 border border-amberGold/20 flex items-center justify-center mx-auto text-amberGold">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slateText-primary">Belum Ada Target Finansial</h3>
            <p className="text-xs sm:text-sm text-slateText-secondary mt-1 max-w-md mx-auto">
              Mulai tetapkan target dana dingin BRI 2 atau portofolio investasi Bibit lo untuk memantau capaian finansial 14-harian.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amberGold text-obsidian-bg font-semibold rounded-lg hover:bg-amber-400 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Target Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const theme = COLOR_THEMES[goal.color] || COLOR_THEMES.emerald;
            const isCompleted = goal.remaining_amount === 0;

            return (
              <div
                key={goal.id}
                className="group relative bg-[#0E1015] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-5.5 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Subtle corner ambient glow */}
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-15 transition-opacity group-hover:opacity-25 ${theme.radialGlow}`}
                />

                <div className="space-y-4 relative z-1">
                  {/* Top Header: Icon + Category Badge + Account + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Glass icon container */}
                      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 shadow-xs">
                        {renderGoalIcon(goal.icon, goal.name, goal.category)}
                      </div>

                      <div className="min-w-0">
                        {/* Ghost badges with glowing status dot */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-medium text-slateText-secondary">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                            {goal.category}
                          </span>

                          {goal.linked_account ? (
                            <span className="text-[11px] font-mono text-slateText-muted bg-white/[0.02] border border-white/[0.06] px-2 py-0.5 rounded-full truncate">
                              Rek. {goal.linked_account}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slateText-muted bg-white/[0.02] border border-white/[0.06] px-2 py-0.5 rounded-full">
                              Manual
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-base text-white mt-1 truncate tracking-tight">
                          {goal.name}
                        </h3>
                      </div>
                    </div>

                    {/* Actions: Clean subtle buttons */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 text-slateText-muted hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
                        title="Ubah Target"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(goal.id)}
                        className="p-1.5 text-slateText-muted hover:text-coralFall hover:bg-coralFall/10 rounded-lg transition-colors"
                        title="Hapus Target"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Percentage Display */}
                  <div className="pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                        <span className="text-xs font-sans font-normal text-slateText-muted">Rp</span>
                        <span>{formatNumber(goal.current_amount)}</span>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                      >
                        {goal.percentage}%
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-slateText-muted mt-1">
                      <span>Target: {formatRupiah(goal.target_amount)}</span>
                    </div>
                  </div>

                  {/* Sleek Minimal Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden p-[1px]">
                      <div
                        className={`h-full bg-gradient-to-r ${theme.gradient} ${theme.glow} transition-all duration-700 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(3, goal.percentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono text-slateText-muted">
                      <span>{isCompleted ? "Tercapai 100%" : `${goal.percentage}% terkumpul`}</span>
                      <span>{isCompleted ? "Selesai" : `Sisa ${formatRupiah(goal.remaining_amount)}`}</span>
                    </div>
                  </div>

                  {/* Clean Projections Separator (No Box-in-a-Box) */}
                  <div className="border-t border-white/[0.06] pt-3 text-xs space-y-1.5">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Target finansial ini telah tercapai 100%.</span>
                      </div>
                    ) : goal.estimated_cycles !== null ? (
                      <div className="flex items-start justify-between gap-2 text-slateText-secondary">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-slateText-muted shrink-0" />
                          <span className="text-slateText-primary font-medium truncate">
                            ~{goal.estimated_cycles} siklus lagi{" "}
                            <span className="text-slateText-muted font-normal">
                              (~{goal.estimated_months} bln)
                            </span>
                          </span>
                        </div>
                        {goal.estimated_finish_date && (
                          <div className="text-[11px] font-mono text-slateText-muted shrink-0">
                            Est: <span className="text-slateText-secondary">{formatDateIndo(goal.estimated_finish_date)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slateText-muted text-[11px]">
                        Konsisten sisihkan dana rutin untuk melihat perkiraan tuntas.
                      </div>
                    )}

                    {goal.target_date && (
                      <div className="flex items-center gap-2 text-[11px] text-slateText-muted">
                        <Calendar className="w-3.5 h-3.5 text-slateText-muted shrink-0" />
                        <span>Deadline: <span className="font-mono text-slateText-secondary">{formatDateIndo(goal.target_date)}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Clean Notes (No quotation marks, no italic slanting) */}
                  {goal.notes && (
                    <p className="text-[11px] text-slateText-muted line-clamp-2 leading-relaxed pt-1">
                      {goal.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
