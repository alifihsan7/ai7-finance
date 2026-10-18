import React, { useState } from "react";
import { ArrowLeftRight, X, CheckCircle2 } from "lucide-react";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCOUNT_OPTIONS = ["Mandiri", "Bank Jago", "BRI 1", "BRI 2", "Cash"];

export function TransferModal({ isOpen, onClose, onSuccess }: TransferModalProps) {
  const [fromAccount, setFromAccount] = useState("Mandiri");
  const [toAccount, setToAccount] = useState("Bank Jago");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseInt(amount.replace(/[^\d]/g, ""), 10);
    if (!numAmount || numAmount <= 0) {
      setError("Nominal transfer harus lebih besar dari 0");
      return;
    }

    if (fromAccount === toAccount) {
      setError("Rekening asal dan tujuan tidak boleh sama");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_account: fromAccount,
          to_account: toAccount,
          amount: numAmount,
          description: description.trim() || `Transfer ${fromAccount} -> ${toAccount}`,
          date,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal melakukan transfer");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat transfer");
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-obsidian-card border border-obsidian-borderStrong rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slateText-muted hover:text-slateText-primary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg bg-cyanHub/15 border border-cyanHub/30 text-cyanHub">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slateText-primary">Transfer Antar Rekening</h3>
            <p className="text-xs text-slateText-secondary">
              Pindah saldo tanpa memotong kuota belanja (Safe-to-Spend)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-coralFall/10 border border-coralFall/30 text-coralFall text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Dari Rekening
              </label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3 py-2 text-sm text-slateText-primary focus:outline-none focus:border-cyanHub transition font-mono"
              >
                {ACCOUNT_OPTIONS.map((acc) => (
                  <option key={acc} value={acc} disabled={acc === toAccount}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
                Ke Rekening
              </label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3 py-2 text-sm text-slateText-primary focus:outline-none focus:border-cyanHub transition font-mono"
              >
                {ACCOUNT_OPTIONS.map((acc) => (
                  <option key={acc} value={acc} disabled={acc === fromAccount}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Nominal Transfer (Rp)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 100000"
              required
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3.5 py-2 text-sm text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyanHub transition font-mono"
            />
            <div className="flex gap-2 mt-2">
              {[50000, 100000, 200000, 500000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuickAmount(v)}
                  className="px-2.5 py-1 rounded bg-obsidian-panel border border-obsidian-border hover:border-cyanHub text-xs font-mono text-slateText-secondary hover:text-cyanHub transition"
                >
                  {(v / 1000).toString()}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Keterangan / Catatan (Opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Top up investasi Bibit"
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3.5 py-2 text-sm text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyanHub transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-3.5 py-2 text-sm text-slateText-primary focus:outline-none focus:border-cyanHub transition font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-cyanHub text-[#0B0D11] hover:brightness-110 rounded-lg transition inline-flex items-center gap-2 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Memproses..." : "Konfirmasi Transfer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
