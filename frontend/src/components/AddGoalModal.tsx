import React, { useState } from "react";
import {
  Target,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Laptop,
  Plane,
  Car,
  Home,
  Coins,
  GraduationCap,
  Heart,
  PlusCircle,
  Check,
} from "lucide-react";
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
  { value: "emerald", label: "Emerald", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" },
  { value: "cyan", label: "Cyan", dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" },
  { value: "amber", label: "Amber", dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" },
  { value: "purple", label: "Purple", dot: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]" },
  { value: "rose", label: "Rose", dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" },
];

const ICON_OPTIONS = [
  { id: "🎯", label: "Target", icon: Target },
  { id: "🛡️", label: "Tabungan", icon: ShieldCheck },
  { id: "📈", label: "Investasi", icon: TrendingUp },
  { id: "🚨", label: "Darurat", icon: AlertTriangle },
  { id: "✨", label: "Impian", icon: Sparkles },
  { id: "💻", label: "Gadget", icon: Laptop },
  { id: "✈️", label: "Liburan", icon: Plane },
  { id: "🚗", label: "Kendaraan", icon: Car },
  { id: "🏠", label: "Rumah", icon: Home },
  { id: "🪙", label: "Aset", icon: Coins },
  { id: "🎓", label: "Edukasi", icon: GraduationCap },
  { id: "❤️", label: "Keluarga", icon: Heart },
];

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
      subtitle="Tetapkan milestone tabungan atau investasi untuk dipantau setiap siklus 14 hari"
      icon={<Target className="w-5 h-5 text-amberGold" />}
      accent="amber"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-coralFall/10 border border-coralFall/20 rounded-xl text-coralFall text-xs">
            {error}
          </div>
        )}

        {/* Nama Target */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Nama Target / Milestone <span className="text-coralFall">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Contoh: Dana Dingin BRI 2, Laptop M3 Pro..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition placeholder:text-slateText-muted"
          />
        </div>

        {/* Nominal Target */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Nominal Target (Rp) <span className="text-coralFall">*</span>
          </label>
          <CurrencyInput
            value={targetAmount}
            onChange={(raw) => setTargetAmount(raw)}
            placeholder="5.000.000"
            required
            accent={color === "emerald" ? "mint" : color === "cyan" ? "cyan" : color === "rose" ? "coral" : "amber"}
            quickAmounts={[1000000, 3000000, 5000000, 10000000]}
          />
        </div>

        {/* 2 Kolom: Rekening & Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Sinkronisasi Rekening
            </label>
            <CustomSelect
              options={accountOptions}
              value={linkedAccount}
              onChange={(val) => setLinkedAccount(val)}
              placeholder="Pilih rekening terhubung"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Kategori
            </label>
            <CustomSelect
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(val) => setCategory(val)}
            />
          </div>
        </div>

        {!linkedAccount && (
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Saldo Terkumpul Saat Ini (Rp)
            </label>
            <CurrencyInput
              value={manualCurrentAmount}
              onChange={(raw) => setManualCurrentAmount(raw)}
              placeholder="0"
              accent="amber"
            />
          </div>
        )}

        {/* Tema Warna - Grid 5 Kolom Proporsional */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Tema Warna Aksen
          </label>
          <div className="grid grid-cols-5 gap-2 pt-0.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                  color === c.value
                    ? "bg-obsidian-hover border-amberGold text-white shadow-xs"
                    : "bg-obsidian-panel border-obsidian-border text-slateText-secondary hover:text-white hover:border-obsidian-borderStrong"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
                <span className="truncate">{c.label}</span>
                {color === c.value && <Check className="w-3.5 h-3.5 text-amberGold shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Pilih Ikon */}
        <div>
          <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
            Pilih Ikon
          </label>
          <div className="grid grid-cols-6 gap-2 pt-0.5">
            {ICON_OPTIONS.map((item) => {
              const IconComp = item.icon;
              const isSelected = icon === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIcon(item.id)}
                  title={item.label}
                  className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-amberGold/15 border-2 border-amberGold text-amberGold shadow-xs scale-105"
                      : "bg-obsidian-panel border border-obsidian-border text-slateText-muted hover:text-white hover:border-obsidian-borderStrong"
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 Kolom: Tanggal & Catatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Target Tanggal (Opsional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slateText-primary focus:outline-none focus:border-amberGold transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slateText-muted uppercase tracking-wider mb-1.5">
              Catatan / Rencana (Opsional)
            </label>
            <input
              type="text"
              placeholder="Strategi alokasi atau tujuan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-obsidian-panel border border-obsidian-border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slateText-primary focus:outline-none focus:border-amberGold transition placeholder:text-slateText-muted"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-obsidian-border/50 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm bg-amberGold text-obsidian-bg font-semibold hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : (
              <>
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                Simpan Target
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
