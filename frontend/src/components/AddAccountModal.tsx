import React, { useState } from "react";
import { PlusCircle, Wallet } from "lucide-react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TYPE_OPTIONS = [
  { value: "operasional", label: "Operasional / Saku Harian", description: "Pos belanja harian dan kebutuhan aktif" },
  { value: "tabungan", label: "Tabungan / Simpanan", description: "Dana dingin yang disimpan jangka menengah" },
  { value: "investasi", label: "Investasi Portofolio", description: "Reksadana, saham, emas, atau aset" },
  { value: "darurat", label: "Dana Darurat / Hub", description: "Dana cadangan siap pakai kapan pun" },
  { value: "ewallet", label: "E-Wallet / Dompet Digital", description: "GoPay, OVO, ShopeePay, DANA" },
];

const COLOR_OPTIONS = [
  { value: "amberGold", label: "Amber Gold", color: "bg-amber-500", description: "Aksen emas elegan" },
  { value: "cyanHub", label: "Cyan", color: "bg-cyan-500", description: "Biru cerah" },
  { value: "teal", label: "Teal / Hijau Mint", color: "bg-teal-500", description: "Hijau sejuk" },
  { value: "purpleLock", label: "Purple", color: "bg-purple-500", description: "Ungu elegan" },
  { value: "blue", label: "Royal Blue", color: "bg-blue-600", description: "Biru perbankan" },
  { value: "coralFall", label: "Coral / Merah Muda", color: "bg-rose-500", description: "Aksen tegas" },
];

export function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("operasional");
  const [tag, setTag] = useState("");
  const [color, setColor] = useState("amberGold");
  const [initialBalance, setInitialBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("Nama rekening wajib diisi");
      return;
    }

    const numBalance = initialBalance ? parseInt(initialBalance.replace(/[^\d]/g, ""), 10) : 0;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          type,
          tag: tag.trim() || undefined,
          color,
          initial_balance: numBalance,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal menambahkan rekening baru");
      }

      // Reset form
      setName("");
      setTag("");
      setInitialBalance("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menambahkan rekening");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Rekening / Akun Baru"
      subtitle="Daftarkan rekening bank, e-wallet, atau pos investasi baru ke ekosistem AI7 Finance"
      icon={<Wallet className="w-5 h-5" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-coralFall/10 border border-coralFall/30 rounded-xl p-3 text-xs sm:text-sm text-coralFall flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Nama Rekening / Akun *
          </label>
          <input
            type="text"
            required
            placeholder="Misal: BCA, SeaBank, GoPay, OVO"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Tipe / Kategori Pos
            </label>
            <CustomSelect
              value={type}
              onChange={setType}
              options={TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Warna / Aksen
            </label>
            <CustomSelect
              value={color}
              onChange={setColor}
              options={COLOR_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Label / Deskripsi Ringkas
          </label>
          <input
            type="text"
            placeholder="Misal: Saku Tambahan, Tabungan Pribadi, Rekening Bisnis"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Saldo Awal (Opsional)
          </label>
          <CurrencyInput
            value={initialBalance}
            onChange={setInitialBalance}
            placeholder="0"
          />
          <p className="text-[11px] text-slateText-muted mt-1">
            Jika diisi lebih dari Rp 0, sistem otomatis mencatat transaksi pemasukan &ldquo;Saldo Awal&rdquo; di buku transaksi.
          </p>
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-obsidian-border/50 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-amberGold text-[#0B0D11] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-amber-400 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Simpan Rekening</span>
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
