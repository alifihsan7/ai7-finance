import React, { useState, useEffect } from "react";
import { Wallet, Check } from "lucide-react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { authFetch } from "@/lib/api";
import { AccountItem } from "@/components/AccountGrid";

interface EditAccountModalProps {
  account: AccountItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAccount?: AccountItem) => void;
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

export function EditAccountModal({ account, isOpen, onClose, onSuccess }: EditAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("operasional");
  const [tag, setTag] = useState("");
  const [color, setColor] = useState("amberGold");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name || "");
      setType(account.type || "operasional");
      setTag(account.tag || "");
      setColor(account.color || "amberGold");
      setError(null);
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.id) return;
    setError(null);

    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("Nama rekening tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          type,
          tag: tag.trim() || undefined,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Gagal memperbarui data rekening");
      }

      const updatedAccount: AccountItem = await res.json();
      onSuccess(updatedAccount);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan rekening");
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Rekening / Akun"
      subtitle={`Perbarui parameter rekening ${account.name}`}
      icon={<Wallet className="w-5 h-5 text-amberGold" />}
      accent="amber"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-coralFall/10 border border-coralFall/30 rounded-xl p-3 text-xs sm:text-sm text-coralFall flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Nama Rekening / Akun *
          </label>
          <input
            type="text"
            required
            placeholder="Misal: BCA, SeaBank, Mandiri Utama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition"
          />
          {name.trim() !== account.name && (
            <p className="text-[11px] text-amberGold/80 mt-1">
              Catatan: Mengubah nama rekening akan otomatis memperbarui seluruh riwayat transaksi dan alokasi yang terkait.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Tipe / Kategori Pos
            </label>
            <CustomSelect
              value={type}
              onChange={setType}
              options={TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
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
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Label / Deskripsi Ringkas
          </label>
          <input
            type="text"
            placeholder="Misal: Saku Belanja, Tabungan Dingin, Cadangan Pokok"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full bg-obsidian-panel border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amberGold transition"
          />
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-white/[0.08] mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-amberGold text-slate-950 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm hover:bg-amber-300 transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
