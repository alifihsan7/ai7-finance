import React from "react";
import { Plus, Trash2, Calendar } from "lucide-react";

export interface SubscriptionItem {
  id: number;
  name: string;
  amount: number;
  category: string;
  account: string;
  billing_cycle: string;
  billing_day: number;
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
}

export function SubscriptionsView({
  subsData,
  formatRupiah,
  onOpenModal,
  onToggleActive,
  onDelete,
}: SubscriptionsViewProps) {
  return (
    <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
            Total Komitmen Bulanan
          </div>
          <div className="text-2xl font-bold font-mono text-amberGold">
            {formatRupiah(subsData.total_monthly_commitment)}
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Disediakan dari alokasi Bank Jago (31.7%)
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
            Langganan Aktif
          </div>
          <div className="text-2xl font-bold font-mono text-mintRise">
            {subsData.active_count} Layanan
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Autodebet aktif bulanan
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 space-y-2">
          <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
            Jatuh Tempo Pekan Ini
          </div>
          <div className="text-2xl font-bold font-mono text-coralFall">
            {subsData.upcoming_this_week} Tagihan
          </div>
          <div className="text-xs text-slateText-secondary font-mono">
            Siapkan saldo di Bank Jago
          </div>
        </div>

        <div className="bg-obsidian-card border border-obsidian-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slateText-muted uppercase tracking-wider">
              Perintah Bot Telegram
            </div>
            <div className="text-sm font-mono text-slateText-primary mt-1 font-bold">
              /subs atau /tagihan
            </div>
          </div>
          <button
            onClick={onOpenModal}
            className="mt-3 px-3 py-1.5 text-xs font-semibold bg-amberGold text-[#0B0D11] hover:bg-amber-400 rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Grid Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-base sm:text-lg text-slateText-primary">
            Daftar Layanan & Tagihan Terjadwal
          </h3>
          <span className="text-xs text-slateText-secondary font-mono">
            Total {subsData.items.length} langganan terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subsData.items.map((sub) => {
            const isUpcoming = (sub.days_until_due ?? 99) <= 3;
            return (
              <div
                key={sub.id}
                className={`bg-obsidian-card border rounded-xl p-5 space-y-4 transition-all ${
                  isUpcoming
                    ? "border-amberGold/40 bg-amberGold/5"
                    : "border-obsidian-border hover:border-obsidian-borderStrong"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-base font-bold text-slateText-primary flex items-center gap-2">
                      {sub.name}
                    </div>
                    <span className="text-xs text-slateText-muted font-mono">{sub.category}</span>
                  </div>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${
                      sub.is_active
                        ? isUpcoming
                          ? "bg-coralFall/10 border-coralFall/30 text-coralFall font-bold"
                          : "bg-mintRise/10 border-mintRise/30 text-mintRise font-bold"
                        : "bg-obsidian-panel border-obsidian-border text-slateText-muted"
                    }`}
                  >
                    {sub.is_active
                      ? (sub.days_until_due ?? 0) === 0
                        ? "🚨 Hari Ini!"
                        : `${sub.days_until_due} hari lagi`
                      : "Di-pause"}
                  </span>
                </div>

                <div>
                  <div className="text-2xl font-bold font-mono text-slateText-primary">
                    {formatRupiah(sub.amount)}
                    <span className="text-xs font-normal text-slateText-muted font-sans"> / bulan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slateText-secondary font-mono mt-1">
                    <Calendar className="w-3.5 h-3.5 text-amberGold" />
                    <span>Setiap tanggal {sub.billing_day} ({sub.next_billing_date})</span>
                  </div>
                </div>

                {sub.notes && (
                  <div className="text-xs text-slateText-muted bg-obsidian-panel p-2 rounded border border-obsidian-border font-mono">
                    {sub.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-obsidian-border/80 text-xs font-mono">
                  <button
                    onClick={() => onToggleActive(sub)}
                    className="text-slateText-secondary hover:text-slateText-primary"
                  >
                    {sub.is_active ? "Pause" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => onDelete(sub.id)}
                    className="text-coralFall/80 hover:text-coralFall flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
