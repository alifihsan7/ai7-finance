import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CreditCard,
  Dumbbell,
  Landmark,
  Pencil,
  Plus,
  Link2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Skeleton } from "./ui/Skeleton";
import {
  JagoPocketItem,
  JagoPocketsSummaryResponse,
  getJagoPockets,
} from "@/lib/api";
import { EditJagoPocketsModal } from "./EditJagoPocketsModal";
import { getPocketStatus } from "@/lib/pocketStatus";
import { AddPocketModal } from "./AddPocketModal";
import { LinkPocketBillModal } from "./LinkPocketBillModal";
import type { AccountItem } from "./AccountGrid";

interface JagoPocketsProps {
  accountId?: number;
  accountName?: string;
  cycleStart?: string;
  cycleEnd?: string;
  formatRupiah: (val: number) => string;
  refreshSignal?: number;
  onToast?: (msg: string) => void;
  onDataLoaded?: (data: JagoPocketsSummaryResponse) => void;
  showActions?: boolean;
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
    badge: "bg-white/[0.06] border-luma-smokeline text-luma-smoke",
  };
  return {
    bar: "bg-luma-sage",
    badge: "bg-luma-sage/10 border-luma-sage/30 text-luma-sage",
  };
}

export function JagoPockets({ accountId, accountName, cycleStart, cycleEnd, formatRupiah, refreshSignal = 0, onToast, onDataLoaded, showActions = true }: JagoPocketsProps) {
  const onDataLoadedRef = useRef(onDataLoaded);
  useEffect(() => { onDataLoadedRef.current = onDataLoaded; }, [onDataLoaded]);
  const [data, setData] = useState<JagoPocketsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [linkPocketId, setLinkPocketId] = useState<number | null>(null);
  const requestVersion = useRef(0);

  const fetchPockets = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await getJagoPockets(accountId, cycleStart, cycleEnd);
      if (version !== requestVersion.current) return;
      setData(res);
      onDataLoadedRef.current?.(res);
    } catch (err) {
      if (version !== requestVersion.current) return;
      const msg = err instanceof Error ? err.message : "Gagal memuat kantong rekening";
      setError(msg);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [accountId, cycleStart, cycleEnd]);

  useEffect(() => {
    fetchPockets();
    return () => { requestVersion.current += 1; };
  }, [fetchPockets, refreshSignal]);


  const handleEditSuccess = () => {
    void fetchPockets();
    onToast?.("Plafon kantong berhasil diperbarui");
  };

  const pockets = useMemo(() => data ? sortPockets(data.pockets ?? data.items ?? []) : [], [data]);
  const parentName = accountName || data?.account_name || pockets[0]?.account_name || undefined;
  const title = parentName ? `Kantong ${parentName}` : "Kantong rekening";

  if (loading) {
    return (
      <section aria-label={title} className="luma-glass p-6 sm:p-7 space-y-5" aria-busy="true">
        <div className="flex flex-col items-start gap-4">
          <div>
            <Skeleton className="w-56 h-5 rounded-full" />
            <Skeleton className="w-80 h-3.5 rounded-full mt-1.5" />
          </div>
          {showActions && <div className="flex items-center gap-2">
            <Skeleton className="w-32 h-11 rounded-2xl" />
            <Skeleton className="w-28 h-11 rounded-2xl" />
          </div>}
        </div>
        <div className="ai7-pocket-grid grid gap-3.5 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/[0.04] border border-luma-smokeline p-4 sm:p-5 space-y-4"
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
              <div className="flex justify-between items-center pt-2 border-t border-luma-smokeline">
                <Skeleton className="w-16 h-3 rounded-full" />
                <Skeleton className="w-16 h-3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const totalTarget = data?.total_target_amount ?? 0;
  const totalSpent = data?.total_spent_amount ?? 0;
  const totalRemaining = data?.total_remaining_amount ?? 0;
  const totalBalance = data?.total_jago_balance ?? 0;

  return (
    <section aria-label={title} className="luma-glass p-6 sm:p-7 space-y-5">
      <div className="flex flex-col items-start gap-4">
        <div>
          <h2 className="ai7-type-section text-luma-ivory tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-luma-ember shrink-0" aria-hidden="true" />
            <span>
              {title}
            </span>
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
            {[
              { label: "Saldo rekening", amount: totalBalance },
              { label: "Plafon kantong", amount: totalTarget },
              { label: "Terpakai di periode ini", amount: totalSpent },
              { label: "Sisa alokasi periode ini", amount: totalRemaining },
            ].map(({ label, amount }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-luma-smoke">{label}</dt>
                <dd className="text-sm font-medium tabular-nums [overflow-wrap:anywhere]">{formatRupiah(amount)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {showActions && <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLinkPocketId((pockets.find(pocket => pocket.role === "tagihan") || pockets[0]).id)}
            disabled={!!error || !parentName || pockets.length === 0}
            title="Pilih tagihan yang menentukan plafon kantong"
            className="luma-action-secondary cursor-pointer disabled:cursor-not-allowed"
          >
            <Link2 className="w-4 h-4" aria-hidden="true" />
            <span>Hubungkan tagihan</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            disabled={!!error || pockets.length === 0}
            title="Ubah plafon kantong rekening ini"
            className="luma-action-secondary cursor-pointer disabled:cursor-not-allowed"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Ubah plafon</span>
          </button>
          {accountId !== undefined && <button type="button" onClick={() => setIsAddOpen(true)} disabled={!!error} className="luma-action-primary cursor-pointer disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" aria-hidden="true" />Tambah kantong
          </button>}
        </div>}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-luma-coral/10 border border-luma-coral/30 text-sm text-luma-coral flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchPockets}
            className="luma-touch min-w-[44px] px-4 py-2 rounded-full text-xs font-semibold bg-luma-coral/15 border border-luma-coral/40 hover:bg-luma-coral/25 active:scale-95 transition shrink-0 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {pockets.length === 0 && !error ? (
        <div className="p-6 rounded-2xl bg-white/[0.04] border border-luma-smokeline text-center text-sm text-luma-smoke">
          Belum ada kantong aktif. Tambahkan kantong untuk membagi alokasi rekening ini.
        </div>
      ) : (
        <div className="ai7-pocket-grid grid gap-3.5 sm:gap-4">
          {pockets.map((pocket) => {
            const target = pocket.target_amount ?? 0;
            const spent = pocket.spent_amount ?? 0;
            const remaining = pocket.remaining_amount ?? target - spent;
            const state = getPocketStatus(target, spent, remaining);
            const pct = state.percentage === null ? null : Math.min(100, Math.round(state.percentage));
            const status = statusFor(state.tone);
            const meta = POCKET_META[pocket.slug] ?? {
              icon: Wallet,
              accent: "text-luma-smoke bg-white/[0.06] border-luma-smokeline",
            };
            const Icon = meta.icon;

            return (
              <div
                key={pocket.slug}
                className="rounded-2xl bg-white/[0.04] border border-luma-smokeline hover:border-white/[0.16] p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition-all duration-200"
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
                      className={`text-xs px-2 py-1 rounded-badge border max-w-full ${status.badge}`}
                    >
                      {state.label}
                    </span>
                  </div>

                  <div>
                    <div className="ai7-type-metric text-luma-ivory tracking-tight tabular-nums break-words">
                      {formatRupiah(remaining)}
                    </div>
                    <div className="text-xs text-luma-smoke mt-0.5">Sisa saldo kantong</div>
                    {pocket.subscription_id && <p className={`text-xs mt-2 ${pocket.subscription_status === "active" ? "text-luma-smoke" : "text-luma-coral"}`}>
                      {pocket.subscription_name || "Tagihan terhubung"} · {pocket.subscription_status === "active" ? "Plafon otomatis" : "Tagihan tidak aktif atau rekening berubah; plafon 0"}
                    </p>}
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

                <div className="grid text-xs text-luma-smoke font-sans pt-3 border-t border-luma-smokeline gap-2 tabular-nums">
                  {parentName && <button type="button" onClick={() => setLinkPocketId(pocket.id)} className="text-left text-luma-smoke hover:text-luma-ivory" aria-label={`Atur tagihan ${pocket.name}`}>
                    {pocket.subscription_id ? "Atur hubungan tagihan" : "Hubungkan tagihan"}
                  </button>}
                  <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
                    <span className="text-xs">Plafon:</span>
                    <span className="font-semibold text-luma-ivory text-xs break-all">
                      {formatRupiah(target)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 min-w-0">
                    <span className="text-xs">Pakai:</span>
                    <span
                      className={`font-semibold text-xs break-all ${
                        state.tone === "danger" ? "text-luma-coral font-semibold" : "text-luma-ivory"
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
        accountId={accountId}
        accountName={parentName}
        isOpen={isEditOpen}
        pockets={pockets}
        formatRupiah={formatRupiah}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
      />
      {isAddOpen && accountId !== undefined && <AddPocketModal accountId={accountId} accountName={parentName || "Rekening"} onClose={() => setIsAddOpen(false)} onCreated={() => {
        void fetchPockets();
        onToast?.("Kantong berhasil ditambahkan");
      }} />}
      {linkPocketId !== null && parentName && <LinkPocketBillModal pockets={pockets} initialPocketId={linkPocketId} accountName={parentName} formatRupiah={formatRupiah} onClose={() => setLinkPocketId(null)} onSuccess={() => {
        void fetchPockets();
        onToast?.("Hubungan tagihan berhasil disimpan");
      }} />}
    </section>
  );
}

export const OperationalPockets = JagoPockets;
export function AccountPockets({ accounts, ...props }: Omit<JagoPocketsProps, "accountId" | "accountName"> & { accounts: AccountItem[] }) {
  const [selectedId, setSelectedId] = useState<number>();
  const available = accounts.filter(account => typeof account.id === "number");
  const selected = available.find(account => account.id === selectedId) || available[0];
  if (!selected) return <p className="luma-data-state text-luma-smoke">Tambahkan rekening terlebih dahulu sebelum membuat kantong.</p>;
  return <div className="space-y-4">
    <fieldset className="min-w-0">
      <legend className="text-xs text-luma-smoke font-medium mb-2">Rekening induk</legend>
      <div className="flex flex-wrap gap-2">
        {available.map(account => <button
          key={account.id}
          type="button"
          aria-pressed={account.id === selected.id}
          onClick={() => setSelectedId(account.id)}
          className={`min-w-0 max-w-full px-4 py-2 text-left font-medium [overflow-wrap:anywhere] border transition-colors ${account.id === selected.id
            ? "bg-luma-ivory text-luma-charcoal border-transparent"
            : "bg-white/[0.04] text-luma-smoke border-luma-smokeline hover:bg-white/[0.08] hover:text-luma-ivory"}`}
        >{account.name}</button>)}
      </div>
    </fieldset>
    <JagoPockets key={selected.id} {...props} accountId={selected.id} accountName={selected.name} />
  </div>;
}
export default JagoPockets;
