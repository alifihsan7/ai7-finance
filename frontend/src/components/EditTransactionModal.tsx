"use client";

import React, { useState, useEffect } from "react";
import { CustomModal } from "./ui/CustomModal";
import { CurrencyInput } from "./ui/CurrencyInput";
import { CustomSelect, SelectOption } from "./ui/CustomSelect";
import { Transaction } from "./TransactionTable";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
  accountOptions: SelectOption[];
  categoryOptions: SelectOption[];
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  accountOptions,
  categoryOptions,
}: EditTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState<string>("");
  const [account, setAccount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (transaction) {
      setType(transaction.type === "income" ? "income" : "expense");
      setAmount(transaction.amount.toString());
      setAccount(transaction.account);
      setCategory(transaction.category);
      setDescription(transaction.description);
      setDate(transaction.date);
      setError("");
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const numAmount = parseInt(amount.replace(/\D/g, ""), 10);
    if (!numAmount || !description.trim()) {
      setError("Nominal dan keterangan wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: numAmount,
          account,
          category,
          description: description.trim(),
          date,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal memperbarui transaksi");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaksi"
      subtitle={`Ubah data transaksi #${transaction.id}`}
      accent={type === "income" ? "mint" : "coral"}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && (
          <div className="p-3 bg-coralFall/10 border border-coralFall/30 rounded-lg text-coralFall text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-2">
            Tipe Transaksi
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-obsidian-panel rounded-xl border border-obsidian-border">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                type === "expense"
                  ? "bg-coralFall/20 text-coralFall border border-coralFall/40 shadow-xs"
                  : "text-slateText-muted hover:text-slateText-primary"
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                type === "income"
                  ? "bg-mintRise/20 text-mintRise border border-mintRise/40 shadow-xs"
                  : "text-slateText-muted hover:text-slateText-primary"
              }`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-1.5">
            Nominal Transaksi
          </label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            required
            accent={type === "income" ? "mint" : "coral"}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-1.5">
            Tanggal Transaksi
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-4 py-2.5 text-slateText-primary text-sm focus:outline-none focus:border-obsidian-borderActive transition font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-1.5">
            Rekening / Akun
          </label>
          <CustomSelect
            value={account}
            onChange={setAccount}
            options={accountOptions}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-1.5">
            Kategori
          </label>
          <CustomSelect
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slateText-muted uppercase tracking-wider mb-1.5">
            Keterangan
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Makan siang, bayar wifi..."
            required
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-4 py-2.5 text-slateText-primary text-sm focus:outline-none focus:border-obsidian-borderActive transition"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-obsidian-panel hover:bg-obsidian-hover border border-obsidian-border text-slateText-secondary hover:text-slateText-primary rounded-xl text-sm font-semibold transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-accent-gold hover:bg-accent-gold/90 text-obsidian-bg font-bold rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
