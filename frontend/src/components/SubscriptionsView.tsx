import React from "react";
import { Plus, Trash2, Calendar, Edit2, Clock } from "lucide-react";
import { Skeleton } from "./ui/Skeleton";

export interface SubscriptionItem {
  id: number;
  name: string;
  amount: number;
  category: string;
  account: string;
  billing_cycle: string;
  billing_day: number;
  billing_type?: "fixed_day" | "exact_date";
  exact_due_date?: string;
  is_active: boolean;
  notes?: string;
  days_until_due?: number;
  next_billing_date?: string;
}

export interface SubscriptionsData {
  total_monthly_commitment: number;
  active_count: number;
  upcoming_this_week: number;
  items: SubscriptionItem[];
}

interface SubscriptionsViewProps {
  subsData: SubscriptionsData;
  formatRupiah: (val: number) => string;
  onOpenModal: () => void;
  onToggleActive: (sub: SubscriptionItem) => void;
  onDelete: (id: number) => void;
  onEdit?: (sub: SubscriptionItem) => void;
  loading?: boolean;
}

export function SubscriptionsView({
  subsData,
  formatRupiah,
  onOpenModal,
  onToggleActive,
  onDelete,
  onEdit,
  loading,
}: SubscriptionsViewProps) {
  return (
    <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Total Komitmen Bulanan
          </div>
          {loading ? (
            <Skeleton className="h-8 w-36 rounded-full" />
          ) : (
            <div className="text-2xl font-black font-mono text-amberGold tracking-tight truncate">
              {formatRupiah(subsData.total_monthly_commitment)}
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            Alokasi pos tagihan & autodebet
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Langganan Aktif
          </div>
          {loading ? (
            <Skeleton className="h-8 w-24 rounded-full" />
          ) : (
            <div className="text-2xl font-black font-mono text-mintRise tracking-tight truncate">
              {subsData.active_count} Layanan
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            Autodebet aktif bulanan
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-2 shadow-sm">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
            Jatuh Tempo Pekan Ini
          </div>
          {loading ? (
            <Skeleton className="h-8 w-24 rounded-full" />
          ) : (
            <div className="text-2xl font-black font-mono text-coralFall tracking-tight truncate">
              {subsData.upcoming_this_week} Tagihan
            </div>
          )}
          <div className="text-xs text-zinc-400 font-mono">
            Siapkan saldo sebelum autodebet
          </div>
        </div>

        <div className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
              Perintah Bot Telegram
            </div>
            <div className="text-sm font-mono text-white mt-1 font-bold truncate">
              /subs atau /tagihan
            </div>
          </div>
          <button
            onClick={onOpenModal}
            className="mt-3 px-4 py-2 text-xs font-bold bg-amberGold text-slate-950 hover:bg-yellow-300 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Tagihan</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Grid Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white">
              Daftar Layanan & Tagihan Terjadwal
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Total {subsData.items.length} langganan dan tagihan rutin terdaftar
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amberGold text-slate-950 font-bold rounded-xl hover:bg-yellow-300 transition shadow-sm text-xs shrink-0 whitespace-nowrap cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Tagihan</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-obsidian-card border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <Skeleton className="w-28 h-5 rounded-full" />
                    <Skeleton className="w-16 h-3 rounded-full" />
                  </div>
                  <Skeleton className="w-12 h-5 rounded-full" />
                </div>
                <Skeleton className="w-36 h-6 rounded-full" />
                <div className="pt-2 border-t border-white/[0.08] flex justify-between">
                  <Skeleton className="w-24 h-4 rounded-full" />
                  <Skeleton className="w-16 h-4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {subsData.items.map((sub) => {
            const isExact = sub.billing_type === "exact_date";
            const days = sub.days_until_due ?? 99;
            const isExpired = isExact && days < 0;
            const isToday = days === 0;
            const isUpcoming = days <= 3 && days >= 0;

            return (
              <div
                key={sub.id}
                className={`bg-obsidian-card border rounded-2xl p-5 space-y-4 transition-all shadow-sm ${
                  isExpired
                    ? "border-coralFall/50 bg-coralFall/5"
                    : isUpcoming || isToday
                    ? "border-amberGold/40 bg-amberGold/5"
                    : "border-white/[0.08] hover:border-white/[0.16]"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base font-bold text-white truncate">
                        {sub.name}
                      </span>
                      {isExact && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amberGold/15 border border-amberGold/30 text-amberGold font-semibold shrink-0">
                          Berakhir Spesifik
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 font-mono truncate block mt-0.5">{sub.category}</span>
                  </div>
                  <span
                    className={`text-xs font-mono px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                      !sub.is_active
                        ? "bg-white/[0.04] border-white/[0.08] text-zinc-400"
                        : isExpired
                        ? "bg-coralFall/20 border-coralFall/40 text-coralFall font-bold"
                        : isToday
                        ? "bg-coralFall/20 border-coralFall/40 text-coralFall font-bold animate-pulse"
                        : isUpcoming
                        ? "bg-amberGold/20 border-amberGold/40 text-amberGold font-bold"
                        : "bg-mintRise/10 border-mintRise/30 text-mintRise font-bold"
                    }`}
                  >
                    {!sub.is_active
                      ? "Di-pause"
                      : isExpired
                      ? `❌ Expired (${Math.abs(days)} hr lalu)`
                      : isToday
                      ? "🚨 Hari Ini!"
                      : `${days} hari lagi`}
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-black font-mono text-white tracking-tight truncate">
                    {formatRupiah(sub.amount)}
                    <span className="text-xs font-normal text-zinc-400 font-sans">
                      {isExact ? " / periode" : " / bulan"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono mt-1 truncate">
                    {isExact ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amberGold shrink-0" />
                        <span className="truncate">
                          Berakhir pada tgl <strong>{sub.exact_due_date || sub.next_billing_date}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-amberGold shrink-0" />
                        <span className="truncate">Setiap tanggal {sub.billing_day} ({sub.next_billing_date})</span>
                      </>
                    )}
                  </div>
                </div>

                {sub.notes && (
                  <div className="text-xs text-zinc-400 bg-obsidian-panel p-2.5 rounded-xl border border-white/[0.08] font-mono">
                    {sub.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit?.(sub)}
                      className="text-amberGold hover:text-amber-300 font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>
                    <button
                      onClick={() => onToggleActive(sub)}
                      className="text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      {sub.is_active ? "Pause" : "Aktifkan"}
                    </button>
                  </div>
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="text-coralFall/80 hover:text-coralFall flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
