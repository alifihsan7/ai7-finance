import React from "react";
import { Plus, Target, Edit2, Trash2, Calendar, ShieldCheck, Clock } from "lucide-react";
import { GoalItem } from "./EditGoalModal";

interface GoalsViewProps {
  goals: GoalItem[];
  formatRupiah: (val: number) => string;
  onOpenAddModal: () => void;
  onEdit: (goal: GoalItem) => void;
  onDelete: (id: number) => void;
}

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; bar: string; glow: string }> = {
  emerald: {
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    bar: "bg-emerald-500",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]",
  },
  cyan: {
    border: "border-cyan-500/20 hover:border-cyan-500/40",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    bar: "bg-cyan-500",
    glow: "shadow-[0_0_12px_rgba(6,182,212,0.25)]",
  },
  amber: {
    border: "border-amber-500/20 hover:border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    bar: "bg-amber-500",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  },
  purple: {
    border: "border-purple-500/20 hover:border-purple-500/40",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    bar: "bg-purple-500",
    glow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]",
  },
  rose: {
    border: "border-rose-500/20 hover:border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    bar: "bg-rose-500",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]",
  },
};

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
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider truncate">
            Total Target Finansial
          </div>
          <div className="text-2xl font-bold font-mono text-amberGold tracking-tight truncate">
            {formatRupiah(totalTarget)}
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Akumulasi seluruh milestone
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider truncate">
            Total Dana Terkumpul
          </div>
          <div className="text-2xl font-bold font-mono text-mintRise tracking-tight truncate">
            {formatRupiah(totalCurrent)}
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Progres all-time tersinkronisasi
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider truncate">
            Rata-rata Capaian
          </div>
          <div className="text-2xl font-bold font-mono text-cyanHub tracking-tight truncate">
            {overallPercentage}%
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            {formatRupiah(Math.max(0, totalTarget - totalCurrent))} sisa menuju target
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider truncate">
            Target & Milestone Aktif
          </div>
          <div className="text-2xl font-bold font-mono text-slateText-primary tracking-tight truncate">
            {goals.length} Sasaran
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            {goals.filter((g) => g.remaining_amount === 0).length} target selesai
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
            Pantau akumulasi target dana dingin BRI 2, portofolio Bibit, dan dana darurat BRI 1
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-amberGold text-obsidian-bg font-semibold rounded-lg hover:bg-amber-400 transition-colors shadow-xs text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Target Baru</span>
        </button>
      </div>

      {/* Milestone Cards Grid */}
      {goals.length === 0 ? (
        <div className="bg-obsidian-panel border border-obsidian-border rounded-xl p-12 text-center space-y-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const theme = COLOR_MAP[goal.color] || COLOR_MAP.emerald;
            const isCompleted = goal.remaining_amount === 0;

            return (
              <div
                key={goal.id}
                className={`bg-obsidian-card border ${theme.border} rounded-xl p-5.5 flex flex-col justify-between transition-all hover:bg-obsidian-hover/40 shadow-xs relative overflow-hidden`}
              >
                {/* Glow accent bar top */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bar}`} />

                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl ${theme.bg} border border-obsidian-borderStrong flex items-center justify-center text-xl shrink-0`}>
                        {goal.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${theme.bg} ${theme.text} uppercase tracking-wider`}>
                            {goal.category}
                          </span>
                          {goal.linked_account ? (
                            <span className="text-[10px] font-mono text-slateText-muted bg-obsidian-surface px-1.5 py-0.5 rounded border border-obsidian-border truncate">
                              Rek. {goal.linked_account}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slateText-muted bg-obsidian-surface px-1.5 py-0.5 rounded border border-obsidian-border">
                              Manual
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-slateText-primary mt-1 truncate">
                          {goal.name}
                        </h3>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 text-slateText-muted hover:text-slateText-primary hover:bg-obsidian-surface rounded-lg transition-colors"
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

                  {/* Amounts */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-xl sm:text-2xl font-bold font-mono text-slateText-primary tracking-tight">
                        {formatRupiah(goal.current_amount)}
                      </div>
                      <div className={`text-sm font-bold font-mono ${theme.text}`}>
                        {goal.percentage}%
                      </div>
                    </div>
                    <div className="text-xs text-slateText-secondary font-mono mt-0.5">
                      Target: {formatRupiah(goal.target_amount)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-obsidian-surface rounded-full overflow-hidden border border-obsidian-border/50">
                      <div
                        className={`h-full ${theme.bar} ${theme.glow} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(2, goal.percentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slateText-muted font-mono">
                      <span>{isCompleted ? "Tercapai Penuh" : `Sisa ${formatRupiah(goal.remaining_amount)}`}</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Projection / Estimation */}
                  <div className="bg-obsidian-surface border border-obsidian-border rounded-lg p-3 text-xs space-y-1.5">
                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-mintRise font-semibold">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Selamat! Target finansial ini telah tercapai 100%.</span>
                      </div>
                    ) : goal.estimated_cycles !== null ? (
                      <div className="flex items-start gap-2 text-slateText-secondary">
                        <Clock className="w-4 h-4 text-amberGold shrink-0 mt-0.5" />
                        <div>
                          <div className="text-slateText-primary font-medium">
                            Estimasi: ~{goal.estimated_cycles} siklus gajian lagi (~{goal.estimated_months} bulan)
                          </div>
                          {goal.estimated_finish_date && (
                            <div className="text-[11px] text-slateText-muted mt-0.5">
                              Perkiraan tercapai: <span className="font-mono text-slateText-secondary">{goal.estimated_finish_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slateText-muted">
                        Simpan dana secara konsisten untuk melihat proyeksi penyelesaian.
                      </div>
                    )}

                    {goal.target_date && (
                      <div className="flex items-center gap-2 text-[11px] text-slateText-muted pt-1 border-t border-obsidian-border/50">
                        <Calendar className="w-3.5 h-3.5 text-cyanHub shrink-0" />
                        <span>Deadline: <span className="font-mono text-slateText-secondary">{goal.target_date}</span></span>
                      </div>
                    )}
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slateText-muted italic line-clamp-2">
                      &ldquo;{goal.notes}&rdquo;
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
