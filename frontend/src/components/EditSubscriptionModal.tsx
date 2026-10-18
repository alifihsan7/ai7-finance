"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, Sparkles } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { CurrencyInput } from "./ui/CurrencyInput";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";
import { SubscriptionItem } from "./SubscriptionsView";

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionItem | null;
  onSuccess: () => void;
  accountOptions: SelectOption[];
  categoryOptions: SelectOption[];
}

export function EditSubscriptionModal({
  isOpen,
  onClose,
  subscription,
  onSuccess,
  accountOptions,
  categoryOptions,
}: EditSubscriptionModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState("Layanan Digital");
  const [account, setAccount] = useState("Jago");
  const [billingType, setBillingType] = useState<"fixed_day" | "exact_date">("fixed_day");
  const [billingDay, setBillingDay] = useState("1");
  const [exactDueDate, setExactDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (subscription) {
      setName(subscription.name);
      setAmount(subscription.amount.toString());
      setCategory(subscription.category);
      setAccount(subscription.account);
      setBillingType(subscription.billing_type || "fixed_day");
      setBillingDay(subscription.billing_day ? subscription.billing_day.toString() : "1");
      setExactDueDate(subscription.exact_due_date || subscription.next_billing_date || "");
      setNotes(subscription.notes || "");
      setError("");
    }
  }, [subscription]);

  const handleAddDays = (days: number) => {
    const base = exactDueDate ? new Date(exactDueDate) : new Date();
    base.setDate(base.getDate() + days);
    setExactDueDate(base.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;

    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || !name.trim()) {
      setError("Nama layanan dan nominal wajib diisi.");
      return;
    }

    if (billingType === "exact_date" && !exactDueDate) {
      setError("Pilih tanggal berakhir langganan.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        amount: numAmount,
        category,
        account,
        billing_type: billingType,
        notes: notes.trim() || null,
      };

      if (billingType === "exact_date") {
        payload.exact_due_date = exactDueDate;
        // Also sync billing_day to match day of month
        const parsed = new Date(exactDueDate);
        if (!isNaN(parsed.getDate())) {
          payload.billing_day = parsed.getDate();
        }
      } else {
        payload.billing_day = parseInt(billingDay, 10) || 1;
        payload.exact_due_date = null;
      }

      const res = await fetch(`/api/v1/subscriptions/${subscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal memperbarui langganan");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Langganan / Masa Aktif"
      subtitle={`Perbarui parameter siklus dan tanggal jatuh tempo untuk ${subscription.name}`}
      accent="amber"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-coralFall/10 border border-coralFall/30 rounded-lg text-coralFall text-xs font-mono">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Nama Layanan
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
          />
        </div>

        {/* Pilihan Mode Siklus */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-2">
            Metode Perhitungan Jatuh Tempo
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-obsidian-panel rounded-xl border border-obsidian-border">
            <button
              type="button"
              onClick={() => setBillingType("fixed_day")}
              className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                billingType === "fixed_day"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Rutin Tiap Tgl (1-31)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBillingType("exact_date");
                if (!exactDueDate) {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setExactDueDate(d.toISOString().split("T")[0]);
                }
              }}
              className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                billingType === "exact_date"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Tgl Berakhir Tertentu (Gym)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Nominal / Periode
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0"
              required
              accent="amber"
              quickAmounts={[50000, 100000, 150000, 225000]}
            />
          </div>

          {billingType === "fixed_day" ? (
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Jatuh Tempo (Tgl 1-31)
              </label>
              <input
                type="number"
                required
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary font-mono focus:outline-none focus:border-amberGold transition"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider">
                  Tanggal Berakhir Riil
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddDays(30)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amberGold/15 text-amberGold hover:bg-amberGold/25 transition inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    +30 Hari
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={exactDueDate}
                onChange={(e) => setExactDueDate(e.target.value)}
                className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary font-mono focus:outline-none focus:border-amberGold transition"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Kategori
            </label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={categoryOptions}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Akun Pembayaran
            </label>
            <CustomSelect
              value={account}
              onChange={setAccount}
              options={accountOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Membership Gym bulanan, paket data 50GB"
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
          />
        </div>

        <div className="pt-3 flex gap-3 border-t border-obsidian-border/60">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-obsidian-panel hover:bg-obsidian-hover border border-obsidian-border text-slateText-secondary hover:text-slateText-primary rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-amberGold hover:bg-amber-400 text-[#0B0D11] font-bold rounded-xl text-xs sm:text-sm transition disabled:opacity-50 shadow-md cursor-pointer"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
