import React, { useState } from "react";
import { Target, PlusCircle } from "lucide-react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableAccounts: string[];
}

const CATEGORY_OPTIONS = [
  { value: "Tabungan", label: "Tabungan / Simpanan", description: "Dana dingin dan tabungan terkunci" },
  { value: "Investasi", label: "Investasi Portofolio", description: "Reksadana, obligasi, saham, emas" },
  { value: "Darurat", label: "Dana Darurat", description: "Cadangan likuid untuk situasi genting" },
  { value: "Wishlist", label: "Wishlist & Impian", description: "Gadget, perlengkapan, hobi" },
  { value: "Lainnya", label: "Lain-lain", description: "Target finansial kustom" },
];

const COLOR_OPTIONS = [
  { value: "emerald", label: "Emerald Green", color: "bg-emerald-500", description: "Aksen hijau cerah (Rekomendasi Tabungan)" },
  { value: "cyan", label: "Cyan Blue", color: "bg-cyan-500", description: "Biru investasi & portofolio" },
  { value: "amber", label: "Amber Gold", color: "bg-amber-500", description: "Aksen emas Obsidian" },
  { value: "purple", label: "Purple Lock", color: "bg-purple-500", description: "Ungu dana terkunci" },
  { value: "rose", label: "Rose Crimson", color: "bg-rose-500", description: "Aksen merah cerah" },
];

const ICON_PRESETS = ["🎯", "🛡️", "📈", "💻", "✈️", "🚗", "🏠", "📱", "💍", "📚", "🏖️", "🪙"];

export function AddGoalModal({ isOpen, onClose, onSuccess, availableAccounts }: AddGoalModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [category, setCategory] = useState("Tabungan");
  const [linkedAccount, setLinkedAccount] = useState("BRI 2");
  const [manualCurrentAmount, setManualCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("emerald");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountOptions = [
    { value: "", label: "Manual (Tanpa Sinkronisasi Rekening)", description: "Progres diinput/diupdate secara mandiri" },
    ...availableAccounts.map((acc) => ({
      value: acc,
      label: `Sinkronisasi Otomatis: ${acc}`,
      description: `Saldo diambil real-time dari mutasi rekening ${acc}`,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameTrim = name.trim();
    if (!nameTrim) {
      setError("Nama target finansial wajib diisi");
      return;
    }

    const numTarget = parseInt(targetAmount.replace(/[^\d]/g, ""), 10);
    if (!numTarget || numTarget <= 0) {
      setError("Nominal target harus lebih dari Rp 0");
      return;
    }

    const numManual = manualCurrentAmount ? parseInt(manualCurrentAmount.replace(/[^\d]/g, ""), 10) : 0;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrim,
          target_amount: numTarget,
          manual_current_amount: numManual,
          linked_account: linkedAccount || null,
          target_date: targetDate || null,
          category,
          icon,
          color,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Gagal membuat target baru");
      }

      // Reset
      setName("");
      setTargetAmount("");
      setManualCurrentAmount("");
      setTargetDate("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan target";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Target Finansial Baru"
      icon={<Target className="w-5 h-5 text-amberGold" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-coralFall/10 border border-coralFall/20 rounded-lg text-coralFall text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Nama Target / Milestone <span className="text-coralFall">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Dana Dingin BRI 2, Laptop M3 Pro..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-obsidian-surface border border-obsidian-border rounded-lg px-3.5 py-2.5 text-sm text-slateText-primary focus:outline-hidden focus:border-amberGold/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Nominal Target (Rp) <span className="text-coralFall">*</span>
          </label>
          <CurrencyInput
            value={targetAmount}
            onChange={(raw) => setTargetAmount(raw)}
            placeholder="Rp 5.000.000"
            className="w-full bg-obsidian-surface border border-obsidian-border rounded-lg px-3.5 py-2.5 text-sm font-mono text-slateText-primary focus:outline-hidden focus:border-amberGold/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Sinkronisasi Saldo Rekening
          </label>
          <CustomSelect
            options={accountOptions}
            value={linkedAccount}
            onChange={(val) => setLinkedAccount(val)}
            placeholder="Pilih rekening terhubung"
          />
          <p className="text-[11px] text-slateText-muted mt-1">
            Jika memilih rekening, progres target akan otomatis mengikuti saldo riil rekening tersebut secara real-time.
          </p>
        </div>

        {!linkedAccount && (
          <div>
            <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
              Saldo Terkumpul Saat Ini (Rp)
            </label>
            <CurrencyInput
              value={manualCurrentAmount}
              onChange={(raw) => setManualCurrentAmount(raw)}
              placeholder="Rp 0"
              className="w-full bg-obsidian-surface border border-obsidian-border rounded-lg px-3.5 py-2.5 text-sm font-mono text-slateText-primary focus:outline-hidden focus:border-amberGold/50 transition-colors"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
              Kategori
            </label>
            <CustomSelect
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(val) => setCategory(val)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
              Tema Warna
            </label>
            <CustomSelect
              options={COLOR_OPTIONS}
              value={color}
              onChange={(val) => setColor(val)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Pilih Ikon
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {ICON_PRESETS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                  icon === ic
                    ? "bg-amberGold/20 border-2 border-amberGold shadow-xs scale-110"
                    : "bg-obsidian-surface border border-obsidian-border hover:border-obsidian-borderStrong"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Target Tanggal Dicapai (Opsional)
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-obsidian-surface border border-obsidian-border rounded-lg px-3.5 py-2.5 text-sm text-slateText-primary focus:outline-hidden focus:border-amberGold/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slateText-secondary uppercase tracking-wider mb-1.5">
            Catatan / Rencana (Opsional)
          </label>
          <textarea
            rows={2}
            placeholder="Catatan tambahan, strategi alokasi, atau tujuan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-obsidian-surface border border-obsidian-border rounded-lg px-3.5 py-2 text-sm text-slateText-primary focus:outline-hidden focus:border-amberGold/50 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-obsidian-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm text-slateText-secondary hover:text-slateText-primary hover:bg-obsidian-hover transition-colors font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm bg-amberGold text-obsidian-bg font-semibold hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : (
              <>
                <PlusCircle className="w-4 h-4" />
                Simpan Target
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
