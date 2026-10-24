"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { CurrencyInput } from "./ui/CurrencyInput";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";
import { authFetch } from "@/lib/api";
import { CategoryItem } from "./ManageCategoriesModal";
import { getCategoryColorDef } from "@/lib/categoryColors";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountOptions: SelectOption[];
  categories?: CategoryItem[];
  defaultAccount?: string;
}

const FALLBACK_EXPENSE_OPTIONS: SelectOption[] = [
  { value: "Makan", label: "Makan" },
  { value: "Transport", label: "Transport" },
  { value: "Tagihan", label: "Tagihan" },
  { value: "Belanja", label: "Belanja" },
  { value: "Hiburan", label: "Hiburan" },
  { value: "Tabungan", label: "Tabungan" },
  { value: "Kesehatan", label: "Kesehatan" },
  { value: "Lainnya", label: "Lainnya" },
];

const FALLBACK_INCOME_OPTIONS: SelectOption[] = [
  { value: "Gaji", label: "Gaji" },
  { value: "Bonus", label: "Bonus" },
  { value: "Investasi", label: "Investasi" },
  { value: "Pemasukan Lain", label: "Pemasukan Lain" },
];

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  accountOptions,
  categories = [],
  defaultAccount,
}: AddTransactionModalProps) {
  const prevIsOpenRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAccount, setFormAccount] = useState(() => {
    if (defaultAccount && (accountOptions.length === 0 || accountOptions.some((opt) => opt.value === defaultAccount))) {
      return defaultAccount;
    }
    return accountOptions[0]?.value || "Rekening Utama";
  });
  const [formCategory, setFormCategory] = useState("Makan");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute category options from API categories filtered by current type
  const activeCategoryOptions: SelectOption[] = useMemo(() => {
    const filtered = categories.filter((c) => c.type === formType);
    if (filtered.length > 0) {
      return filtered.map((c) => {
        const colorDef = getCategoryColorDef(c.color);
        return {
          value: c.name,
          label: c.name,
          color: colorDef.dotClass,
        };
      });
    }
    return formType === "expense" ? FALLBACK_EXPENSE_OPTIONS : FALLBACK_INCOME_OPTIONS;
  }, [categories, formType]);

  // Sync category when options or type changes if current category isn't in options
  useEffect(() => {
    if (activeCategoryOptions.length > 0) {
      const exists = activeCategoryOptions.some((opt) => opt.value === formCategory);
      if (!exists) {
        setFormCategory(activeCategoryOptions[0].value);
      }
    }
  }, [activeCategoryOptions, formCategory]);

  // Reset and initialize form state cleanly only when modal opens (transition to isOpen === true)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      isSubmittingRef.current = false;
      setFormType("expense");
      setFormAmount("");
      setFormDesc("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setError(null);
      setLoading(false);

      const initialAccount =
        defaultAccount && (accountOptions.length === 0 || accountOptions.some((opt) => opt.value === defaultAccount))
          ? defaultAccount
          : accountOptions[0]?.value || "Rekening Utama";
      setFormAccount(initialAccount);

      const initialCat = activeCategoryOptions.some((opt) => opt.value === "Makan")
        ? "Makan"
        : activeCategoryOptions[0]?.value || "Makan";
      setFormCategory(initialCat);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, defaultAccount, accountOptions, activeCategoryOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit race conditions
    if (loading || isSubmittingRef.current) return;

    const numAmount = parseInt(formAmount.replace(/\D/g, ""), 10);
    if (!numAmount) {
      setError("Nominal transaksi harus lebih dari 0");
      return;
    }
    if (!formDesc.trim()) {
      setError("Keterangan transaksi wajib diisi");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          amount: numAmount,
          account: formAccount,
          category: formCategory,
          description: formDesc.trim(),
          date: formDate || new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Gagal mencatat transaksi (${res.status})`);
      }

      // Reset form on success
      setFormAmount("");
      setFormDesc("");
      setError(null);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Baru"
      subtitle="Catat transaksi untuk otomatis memperbarui saldo rekening & amplop anggaran"
      icon={<Plus className="w-5 h-5" />}
      accent={formType === "expense" ? "coral" : "mint"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 bg-obsidian-panel p-1 rounded-2xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setFormType("expense")}
            className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center ${
              formType === "expense"
                ? "bg-coralFall text-slate-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setFormType("income")}
            className={`min-h-[44px] py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center ${
              formType === "income"
                ? "bg-mintRise text-slate-950 font-bold shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Nominal Transaksi
          </label>
          <CurrencyInput
            value={formAmount}
            onChange={setFormAmount}
            placeholder="0"
            required
            accent={formType === "expense" ? "coral" : "mint"}
            quickAmounts={
              formType === "expense"
                ? [15000, 25000, 50000, 100000]
                : [500000, 1000000, 1500000]
            }
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Keterangan
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Nasi Padang + Es Teh"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full min-h-[44px] bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition placeholder:text-zinc-400"
          />
        </div>

        {/* Account and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Akun Rekening
            </label>
            <CustomSelect
              value={formAccount}
              onChange={setFormAccount}
              options={accountOptions}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Kategori
            </label>
            <CustomSelect
              value={formCategory}
              onChange={setFormCategory}
              options={activeCategoryOptions}
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Tanggal Transaksi
          </label>
          <input
            type="date"
            required
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="w-full min-h-[44px] bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amberGold transition"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-2xl bg-coralFall/10 border border-coralFall/20 text-coralFall text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 flex justify-end gap-3 border-t border-white/[0.08] mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] rounded-2xl transition cursor-pointer inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:brightness-110 rounded-2xl transition inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              formType === "expense" ? "bg-coralFall" : "bg-mintRise"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              "Simpan Transaksi"
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
