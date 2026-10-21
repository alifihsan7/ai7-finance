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
  Laptop,
  Plane,
  Car,
  Home,
  Coins,
  GraduationCap,
  Heart,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { GoalItem } from "./EditGoalModal";
import { Skeleton } from "./ui/Skeleton";

interface GoalsViewProps {
  goals: GoalItem[];
  formatRupiah: (val: number) => string;
  onOpenAddModal: () => void;
  onEdit: (goal: GoalItem) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
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
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const year = parts[0].trim();
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parseInt(parts[2], 10);
      return `${day} ${month} ${year}`.trim();
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }).trim();
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
    return <Laptop className="w-5 h-5 text-purple-400" />;
  }
  if (icon === "✨") {
    return <Sparkles className="w-5 h-5 text-purple-400" />;
  }
  if (icon === "✈️") {
    return <Plane className="w-5 h-5 text-cyan-400" />;
  }
  if (icon === "🚗") {
    return <Car className="w-5 h-5 text-amber-400" />;
  }
  if (icon === "🏠") {
    return <Home className="w-5 h-5 text-emerald-400" />;
  }
  if (icon === "🪙") {
    return <Coins className="w-5 h-5 text-amberGold" />;
  }
  if (icon === "🎓") {
    return <GraduationCap className="w-5 h-5 text-purple-400" />;
  }
  if (icon === "❤️") {
    return <Heart className="w-5 h-5 text-rose-400" />;
  }
  if (icon && icon.length <= 4 && !icon.startsWith("http") && icon !== "🎯") {
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
  loading,
}: GoalsViewProps) {
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);
  const totalCurrent = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 1000) / 10 : 0;

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Total Target Finansial
          </div>
          {loading ? (
            <Skeleton className="h-8 w-36 rounded-full" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight truncate">
              {formatRupiah(totalTarget)}
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            Akumulasi seluruh milestone
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Total Terkumpul
          </div>
          {loading ? (
            <Skeleton className="h-8 w-36 rounded-full" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black font-mono text-mintRise tracking-tight truncate">
              {formatRupiah(totalCurrent)}
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            Progres all-time tersinkronisasi
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Rata-rata Capaian
          </div>
          {loading ? (
            <Skeleton className="h-8 w-24 rounded-full" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black font-mono text-amberGold tracking-tight truncate">
              {overallPercentage}%
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono truncate">
            Sisa {formatRupiah(Math.max(0, totalTarget - totalCurrent))}
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Status Sasaran
          </div>
          {loading ? (
            <Skeleton className="h-8 w-28 rounded-full" />
          ) : (
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight truncate">
              {goals.filter((g) => g.remaining_amount === 0).length} / {goals.length}{" "}
              <span className="text-xs font-normal text-zinc-400 font-sans">Tercapai</span>
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            {goals.filter((g) => g.remaining_amount > 0).length} target masih berjalan
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-1">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
            <Target className="w-5 h-5 text-amberGold" />
            Milestone Tracker Tabungan & Investasi
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Pantau akumulasi target dana dingin, portofolio aset, dan alokasi tabungan masa depan
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-amberGold text-slate-950 font-bold rounded-xl hover:bg-yellow-300 transition shadow-sm text-xs sm:text-sm shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Tambah Target</span>
        </button>
      </div>

      {/* Milestone Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-obsidian-card border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3.5">
                <div className="flex items-center gap-3.5">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-32 h-5 rounded-full" />
                    <Skeleton className="w-20 h-3 rounded-full" />
                  </div>
                </div>
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="w-24 h-4 rounded-full" />
                  <Skeleton className="w-28 h-4 rounded-full" />
                </div>
                <Skeleton className="w-full h-3 rounded-full" />
              </div>
              <div className="pt-2 border-t border-white/[0.08] flex justify-between">
                <Skeleton className="w-20 h-4 rounded-full" />
                <Skeleton className="w-24 h-4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amberGold/10 border border-amberGold/20 flex items-center justify-center mx-auto text-amberGold">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Belum Ada Target Finansial</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
              Mulai tetapkan target tabungan masa depan atau portofolio investasi lo untuk memantau capaian finansial siklus.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amberGold text-slate-950 font-bold rounded-2xl hover:bg-amber-300 transition text-sm shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Target Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {goals.map((goal) => {
            const theme = COLOR_THEMES[goal.color] || COLOR_THEMES.emerald;
            const isCompleted = goal.remaining_amount === 0;

            return (
              <div
                key={goal.id}
                className="group relative bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Subtle corner ambient glow */}
                <div
                  className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-15 transition-opacity group-hover:opacity-30 ${theme.radialGlow}`}
                />

                <div className="space-y-6 relative z-1">
                  {/* Top Header: Icon + Category Badge + Account + Actions */}
                  <div className="flex items-start justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Icon container */}
                      <div className="w-12 h-12 rounded-2xl bg-obsidian-panel border border-white/[0.08] flex items-center justify-center shrink-0 shadow-sm">
                        {renderGoalIcon(goal.icon, goal.name, goal.category)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        {/* Ghost badges with glowing status dot */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-zinc-300">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                            {goal.category}
                          </span>

                          {goal.linked_account ? (
                            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full truncate">
                              Rek. {goal.linked_account}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 rounded-full">
                              Manual
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base sm:text-lg text-white line-clamp-2 tracking-tight leading-snug">
                          {goal.name}
                        </h3>
                      </div>
                    </div>

                    {/* Actions: Clean subtle buttons */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-full transition-colors border border-transparent hover:border-white/[0.08] cursor-pointer"
                        title="Ubah Target"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(goal.id)}
                        className="p-1.5 text-zinc-400 hover:text-coralFall hover:bg-coralFall/10 rounded-full transition-colors border border-transparent hover:border-coralFall/20 cursor-pointer"
                        title="Hapus Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts & Percentage Display */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                        <span className="text-sm font-sans font-normal text-zinc-400">Rp</span>
                        <span>{formatNumber(goal.current_amount)}</span>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                      >
                        {goal.percentage >= 100 ? "100%" : `${Number(goal.percentage).toFixed(1)}%`}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                      <span>Target: {formatRupiah(goal.target_amount)}</span>
                    </div>
                  </div>

                  {/* Sleek Minimal Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden p-[1px] border border-white/[0.08]">
                      <div
                        className={`h-full bg-gradient-to-r ${theme.gradient} ${theme.glow} transition-all duration-700 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(3, goal.percentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
                      <span>{isCompleted ? "Tercapai 100%" : `${Number(goal.percentage).toFixed(1)}% terkumpul`}</span>
                      <span>{isCompleted ? "Selesai" : `Sisa ${formatRupiah(goal.remaining_amount)}`}</span>
                    </div>
                  </div>

                  {/* Clean Projections Separator */}
                  <div className="border-t border-white/[0.08] pt-4.5 space-y-2 text-xs">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-mintRise font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Target finansial ini telah tercapai 100%.</span>
                      </div>
                    ) : goal.estimated_cycles !== null ? (
                      <div className="flex items-start justify-between gap-2 text-zinc-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-white font-medium truncate">
                            ~{goal.estimated_cycles} siklus lagi{" "}
                            <span className="text-zinc-400 font-normal">
                              (~{Number(goal.estimated_months).toFixed(1)} bln)
                            </span>
                          </span>
                        </div>
                        {goal.estimated_finish_date && (
                          <div className="text-xs font-mono text-zinc-400 shrink-0 whitespace-nowrap">
                            <span>Est: </span><span className="text-zinc-200">{formatDateIndo(goal.estimated_finish_date)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-zinc-400 text-xs">
                        Konsisten sisihkan dana rutin untuk melihat perkiraan tuntas.
                      </div>
                    )}

                    {goal.target_date && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Deadline: <span className="font-mono text-zinc-300">{formatDateIndo(goal.target_date)}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Clean Notes */}
                  {goal.notes && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed pt-3 border-t border-white/[0.08] text-pretty">
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
