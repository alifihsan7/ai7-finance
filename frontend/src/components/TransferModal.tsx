import React, { useState } from "react";
import { ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountOptions?: { value: string; label: string; color?: string; description?: string }[];
}

const ACCOUNT_OPTIONS = [
  { value: "Mandiri", label: "Mandiri (Saku Operasional)", color: "bg-blue-500", description: "Pos belanja harian & saku" },
  { value: "Bank Jago", label: "Bank Jago (Subs & Bills)", color: "bg-purple-500", description: "Pos langganan rutin" },
  { value: "Bibit", label: "Bibit (Investasi Reksadana/Saham)", color: "bg-teal-500", description: "Portofolio tabungan investasi" },
  { value: "BRI 1", label: "BRI 1 (Income Hub)", color: "bg-cyan-500", description: "Rekening penampung utama" },
  { value: "BRI 2", label: "BRI 2 (Nabung / Dana Dingin)", color: "bg-emerald-500", description: "Pos tabungan & investasi" },
  { value: "Cash", label: "Cash (Uang Tunai Dompet)", color: "bg-amber-500", description: "Uang tunai fisik" },
];

export function TransferModal({ isOpen, onClose, onSuccess, accountOptions }: TransferModalProps) {
  const options = accountOptions && accountOptions.length > 0 ? accountOptions : ACCOUNT_OPTIONS;
  const [fromAccount, setFromAccount] = useState("Mandiri");
  const [toAccount, setToAccount] = useState("Bank Jago");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseInt(amount.replace(/[^\d]/g, ""), 10);
    if (!numAmount || numAmount <= 0) {
      setError("Nominal transfer harus lebih besar dari Rp 0");
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

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Antar Rekening"
      subtitle="Pindah saldo tanpa memotong kuota belanja rutin (Safe-to-Spend tetap terjaga)"
      icon={<ArrowLeftRight className="w-5 h-5" />}
      accent="cyan"
      maxWidth="md"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-coralFall/10 border border-coralFall/30 text-coralFall text-xs font-mono">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rekening Asal & Tujuan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-20">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Dari Rekening
            </label>
            <CustomSelect
              value={fromAccount}
              onChange={setFromAccount}
              options={options}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Ke Rekening
            </label>
            <CustomSelect
              value={toAccount}
              onChange={setToAccount}
              options={options}
            />
          </div>
        </div>

        {/* Nominal with CurrencyInput */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Nominal Transfer
          </label>
          <CurrencyInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            required
            accent="cyan"
            quickAmounts={[50000, 100000, 200000, 500000]}
          />
        </div>

        {/* Catatan / Keterangan */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Keterangan / Catatan (Opsional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Top up tabungan dingin"
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary placeholder-slateText-muted focus:outline-none focus:border-cyanHub transition"
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Tanggal Transaksi
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-cyanHub transition font-mono"
          />
        </div>

        {/* Actions Footer */}
        <div className="pt-3 flex justify-end gap-3 border-t border-obsidian-border/50 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-cyanHub text-[#0B0D11] hover:brightness-110 rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? "Memproses..." : "Konfirmasi Transfer"}</span>
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
