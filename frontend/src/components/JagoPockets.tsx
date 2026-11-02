import React, { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CreditCard,
  Dumbbell,
  Landmark,
  Pencil,
  RefreshCw,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Skeleton } from "./ui/Skeleton";
import {
  JagoPocketItem,
  JagoPocketsSummaryResponse,
  getJagoPockets,
  syncJagoPocketCommitments,
} from "@/lib/api";
import { EditJagoPocketsModal } from "./EditJagoPocketsModal";

interface JagoPocketsProps {
  formatRupiah: (val: number) => string;
  refreshSignal?: number;
  onToast?: (msg: string) => void;
}

const POCKET_ORDER = ["utama", "kuota", "visa", "claude", "gym"] as const;

const POCKET_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  utama: { icon: Wallet, accent: "text-amberGold bg-amberGold/10 border-amberGold/30" },
  kuota: { icon: Smartphone, accent: "text-cyanHub bg-cyanHub/10 border-cyanHub/30" },
  visa: { icon: CreditCard, accent: "text-cyanHub bg-cyanHub/10 border-cyanHub/30" },
  claude: { icon: Bot, accent: "text-amberGold bg-amberGold/10 border-amberGold/30" },
  gym: { icon: Dumbbell, accent: "text-mintRise bg-mintRise/10 border-mintRise/30" },
};

function sortPockets(pockets: JagoPocketItem[]): JagoPocketItem[] {
  const order = new Map<string, number>(POCKET_ORDER.map((slug, i) => [slug, i]));
  return [...pockets].sort((a, b) => {
    const ai = order.has(a.slug) ? (order.get(a.slug) as number) : 99;
    const bi = order.has(b.slug) ? (order.get(b.slug) as number) : 99;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function statusFor(pct: number): {
  bar: string;
  badge: string;
  label: string;
} {
  if (pct >= 100) {
    return {
      bar: "bg-coralFall",
      badge: "bg-coralFall/10 border-coralFall/30 text-coralFall",
      label: "Over-budget",
    };
  }
  if (pct >= 80) {
    return {
      bar: "bg-amberGold",
      badge: "bg-amberGold/10 border-amberGold/30 text-amberGold",
      label: "Mendekati batas",
    };
  }
  return {
    bar: "bg-mintRise",
    badge: "bg-mintRise/10 border-mintRise/30 text-mintRise",
    label: "Aman",
  };
}

export function JagoPockets({ formatRupiah, refreshSignal = 0, onToast }: JagoPocketsProps) {
  const [data, setData] = useState<JagoPocketsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchPockets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getJagoPockets();
      setData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat kantong Bank Jago";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPockets();
  }, [fetchPockets, refreshSignal]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await syncJagoPocketCommitments();
      setData(res);
      setError(null);
      onToast?.("Komitmen kantong Jago tersinkron dengan Langganan");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyelaraskan komitmen";
      onToast?.(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditSuccess = (updated: JagoPocketsSummaryResponse) => {
    setData(updated);
    setError(null);
    onToast?.("Plafon kantong Bank Jago berhasil diperbarui");
  };

  if (loading) {
    return (
      <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <Skeleton className="w-56 h-5 rounded-full" />
            <Skeleton className="w-80 h-3.5 rounded-full mt-1.5" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-32 h-11 rounded-2xl" />
            <Skeleton className="w-28 h-11 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <div className="flex justify-between items-center gap-2">
                <Skeleton className="w-24 h-4 rounded-full" />
                <Skeleton className="w-10 h-4 rounded-full" />
              </div>
              <div>
                <Skeleton className="w-28 h-6 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-full mt-1.5" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.08]">
                <Skeleton className="w-16 h-3 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pockets = data ? sortPockets(data.pockets ?? data.items ?? []) : [];
  const totalTarget = data?.total_target_amount ?? 0;
  const totalSpent = data?.total_spent_amount ?? 0;
  const totalRemaining = data?.total_remaining_amount ?? 0;
  const totalBalance = data?.total_jago_balance ?? 0;

  return (
    <div className="bg-obsidian-panel border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amberGold shrink-0" aria-hidden="true" />
            <span>
              Kantong Bank Jago{" "}
              {totalTarget > 0 ? `(Plafon ${formatRupiah(totalTarget)})` : "(Belum Ada Plafon)"}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Lima sub-kantong operasional dengan potongan otomatis per siklus — saldo Jago{" "}
            {formatRupiah(totalBalance)}, terpakai {formatRupiah(totalSpent)}, sisa{" "}
            {formatRupiah(totalRemaining)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="Selaraskan target kantong dengan Langganan aktif"
            className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-2xl text-xs font-semibold bg-cyanHub/15 text-cyanHub border border-cyanHub/40 hover:bg-cyanHub/25 active:scale-95 transition inline-flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanHub/70"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{syncing ? "Menyelaraskan..." : "Sync Komitmen"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            title="Ubah plafon target tiap kantong"
            className="min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold bg-amberGold text-slate-950 hover:bg-yellow-300 active:scale-95 transition inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amberGold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-panel"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Edit Target Kantong</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-coralFall/10 border border-coralFall/30 text-sm text-coralFall flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchPockets}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-coralFall/15 border border-coralFall/40 hover:bg-coralFall/25 active:scale-95 transition shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {pockets.length === 0 && !error ? (
        <div className="p-6 rounded-2xl bg-obsidian-card border border-white/[0.08] text-center text-sm text-zinc-400">
          Belum ada kantong aktif. Tekan Sync Komitmen untuk menginisialisasi lima kantong bawaan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {pockets.map((pocket) => {
            const target = pocket.target_amount ?? 0;
            const spent = pocket.spent_amount ?? 0;
            const remaining = pocket.remaining_amount ?? target - spent;
            const rawPct = pocket.percentage_spent ?? pocket.percentage ?? 0;
            const pct = target > 0 ? Math.min(100, Math.round(rawPct)) : 0;
            const status = statusFor(rawPct);
            const meta = POCKET_META[pocket.slug] ?? {
              icon: Wallet,
              accent: "text-zinc-300 bg-white/[0.06] border-white/[0.1]",
            };
            const Icon = meta.icon;

            return (
              <div
                key={pocket.slug}
                className="bg-obsidian-card border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${meta.accent}`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-white font-semibold text-sm block">{pocket.name}</span>
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${status.badge}`}
                      title={status.label}
                    >
                      {pct}%
                    </span>
                  </div>

                  <div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight tabular-nums">
                      {formatRupiah(remaining)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">Sisa saldo kantong</div>
                  </div>

                  <div
                    className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Pemakaian ${pocket.name} ${pct} persen`}
                  >
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full transition-all duration-500 rounded-full ${status.bar}`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pt-3 border-t border-white/[0.08] gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-zinc-400 text-[11px]">Plafon:</span>
                    <span className="font-semibold text-zinc-300 text-[11px] whitespace-nowrap tabular-nums">
                      {formatRupiah(target)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-zinc-400 text-[11px]">Pakai:</span>
                    <span
                      className={`font-semibold text-[11px] whitespace-nowrap tabular-nums ${
                        pct >= 80 ? "text-coralFall font-bold" : "text-zinc-300"
                      }`}
                    >
                      {formatRupiah(spent)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditJagoPocketsModal
        isOpen={isEditOpen}
        pockets={pockets}
        formatRupiah={formatRupiah}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
