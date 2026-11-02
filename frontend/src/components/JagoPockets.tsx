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
import { getPocketStatus } from "@/lib/pocketStatus";

interface JagoPocketsProps {
  formatRupiah: (val: number) => string;
  refreshSignal?: number;
  onToast?: (msg: string) => void;
  onDataLoaded?: (data: JagoPocketsSummaryResponse) => void;
}

const POCKET_ORDER = ["utama", "kuota", "visa", "claude", "gym"] as const;

const POCKET_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  utama: { icon: Wallet, accent: "text-luma-ember bg-luma-ember/10 border-luma-ember/30" },
  kuota: { icon: Smartphone, accent: "text-luma-gold bg-luma-gold/10 border-luma-gold/30" },
  visa: { icon: CreditCard, accent: "text-luma-gold bg-luma-gold/10 border-luma-gold/30" },
  claude: { icon: Bot, accent: "text-luma-ember bg-luma-ember/10 border-luma-ember/30" },
  gym: { icon: Dumbbell, accent: "text-luma-sage bg-luma-sage/10 border-luma-sage/30" },
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

function statusFor(tone: ReturnType<typeof getPocketStatus>["tone"]): {
  bar: string;
  badge: string;
} {
  if (tone === "danger") {
    return {
      bar: "bg-luma-coral",
      badge: "bg-luma-coral/10 border-luma-coral/30 text-luma-coral",
    };
  }
  if (tone === "warning") {
    return {
      bar: "bg-luma-gold",
      badge: "bg-luma-gold/10 border-luma-gold/30 text-luma-gold",
    };
  }
  if (tone === "neutral") return {
    bar: "bg-luma-smoke",
    badge: "bg-white/[0.06] border-white/[0.12] text-luma-smoke",
  };
  return {
    bar: "bg-luma-sage",
    badge: "bg-luma-sage/10 border-luma-sage/30 text-luma-sage",
  };
}

export function JagoPockets({ formatRupiah, refreshSignal = 0, onToast, onDataLoaded }: JagoPocketsProps) {
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
      onDataLoaded?.(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat sub-kantong operasional";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    fetchPockets();
  }, [fetchPockets, refreshSignal]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await syncJagoPocketCommitments();
      setData(res);
      onDataLoaded?.(res);
      setError(null);
      onToast?.("Komitmen sub-kantong tersinkron dengan Langganan");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyelaraskan komitmen";
      onToast?.(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditSuccess = (updated: JagoPocketsSummaryResponse) => {
    setData(updated);
    onDataLoaded?.(updated);
    setError(null);
    onToast?.("Plafon sub-kantong operasional berhasil diperbarui");
  };

  if (loading) {
    return (
      <section aria-label="Sub-Kantong Operasional" className="luma-glass p-6 sm:p-7 space-y-5">
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
              className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4 sm:p-5 space-y-4"
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
      </section>
    );
  }

  const pockets = data ? sortPockets(data.pockets ?? data.items ?? []) : [];
  const totalTarget = data?.total_target_amount ?? 0;
  const totalSpent = data?.total_spent_amount ?? 0;
  const totalRemaining = data?.total_remaining_amount ?? 0;
  const totalBalance = data?.total_jago_balance ?? 0;

  return (
    <section aria-label="Sub-Kantong Operasional" className="luma-glass p-6 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-luma-ivory tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-luma-ember shrink-0" aria-hidden="true" />
            <span>
              Sub-Kantong Operasional{" "}
              {totalTarget > 0 ? `(Plafon ${formatRupiah(totalTarget)})` : "(Belum Ada Plafon)"}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-luma-smoke mt-0.5 tabular-nums">
            Sub-kantong operasional dengan alokasi otomatis — saldo {formatRupiah(totalBalance)}, terpakai {formatRupiah(totalSpent)}, sisa {formatRupiah(totalRemaining)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            title="Selaraskan target kantong dengan Langganan aktif"
            className="luma-touch min-w-[44px] px-4 py-2.5 rounded-full text-xs font-semibold bg-white/[0.06] text-luma-ivory border border-white/[0.12] hover:bg-white/[0.1] hover:border-white/[0.2] active:scale-95 transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{syncing ? "Menyelaraskan..." : "Sync Komitmen"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            title="Ubah plafon target tiap sub-kantong operasional"
            className="luma-touch min-w-[44px] px-4 py-2.5 rounded-full text-xs font-bold bg-luma-ivory text-luma-charcoal hover:brightness-95 active:scale-95 transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Edit Target Sub-Kantong</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-luma-coral/10 border border-luma-coral/30 text-sm text-luma-coral flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchPockets}
            className="luma-touch min-w-[44px] px-4 py-2 rounded-full text-xs font-bold bg-luma-coral/15 border border-luma-coral/40 hover:bg-luma-coral/25 active:scale-95 transition shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {pockets.length === 0 && !error ? (
        <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center text-sm text-luma-smoke">
          Belum ada sub-kantong operasional aktif. Tekan Sync Komitmen untuk menginisialisasi sub-kantong bawaan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {pockets.map((pocket) => {
            const target = pocket.target_amount ?? 0;
            const spent = pocket.spent_amount ?? 0;
            const remaining = pocket.remaining_amount ?? target - spent;
            const state = getPocketStatus(target, spent, remaining);
            const pct = state.percentage === null ? null : Math.min(100, Math.round(state.percentage));
            const status = statusFor(state.tone);
            const meta = POCKET_META[pocket.slug] ?? {
              icon: Wallet,
              accent: "text-luma-smoke bg-white/[0.06] border-white/[0.1]",
            };
            const Icon = meta.icon;

            return (
              <div
                key={pocket.slug}
                className="rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${meta.accent}`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-luma-ivory font-semibold text-sm block break-words leading-snug">{pocket.name}</span>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-lg border max-w-full ${status.badge}`}
                    >
                      {state.label}
                    </span>
                  </div>

                  <div>
                    <div className="text-xl sm:text-2xl font-extrabold font-mono text-luma-ivory tracking-tight tabular-nums break-words">
                      {formatRupiah(remaining)}
                    </div>
                    <div className="text-xs text-luma-smoke mt-0.5">Sisa saldo kantong</div>
                  </div>

                  {pct !== null ? <div
                    className="h-1.5 bg-black/25 rounded-full overflow-hidden"
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
                  </div> : <p className="text-xs text-luma-smoke">Plafon belum diatur. Persentase pemakaian belum tersedia.</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-luma-smoke font-mono pt-3 border-t border-white/[0.08] gap-2 tabular-nums">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px]">Plafon:</span>
                    <span className="font-semibold text-luma-ivory text-[11px] whitespace-nowrap">
                      {formatRupiah(target)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px]">Pakai:</span>
                    <span
                      className={`font-semibold text-[11px] whitespace-nowrap ${
                        state.tone === "danger" ? "text-luma-coral font-bold" : "text-luma-ivory"
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
    </section>
  );
}

export const OperationalPockets = JagoPockets;
export default JagoPockets;
