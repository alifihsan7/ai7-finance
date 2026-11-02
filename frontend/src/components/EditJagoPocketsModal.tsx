import React, { useEffect, useState } from "react";
import { CheckCircle2, Landmark } from "lucide-react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  JagoPocketItem,
  JagoPocketsSummaryResponse,
  updateJagoPockets,
} from "@/lib/api";

interface EditJagoPocketsModalProps {
  isOpen: boolean;
  pockets: JagoPocketItem[];
  formatRupiah: (val: number) => string;
  onClose: () => void;
  onSuccess: (updated: JagoPocketsSummaryResponse) => void;
}

export function EditJagoPocketsModal({
  isOpen,
  pockets,
  formatRupiah,
  onClose,
  onSuccess,
}: EditJagoPocketsModalProps) {
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      pockets.forEach((p) => {
        initial[p.slug] = (p.target_amount ?? 0).toString();
      });
      setTargets(initial);
      setError(null);
    }
  }, [isOpen, pockets]);

  const totalDraft = pockets.reduce((sum, p) => {
    const raw = (targets[p.slug] ?? "").replace(/[^\d]/g, "");
    return sum + (raw ? parseInt(raw, 10) : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pockets.length === 0) {
      setError("Belum ada sub-kantong yang dapat diperbarui");
      return;
    }

    const payload = pockets.map((p) => {
      const raw = (targets[p.slug] ?? "").replace(/[^\d]/g, "");
      const amount = raw ? parseInt(raw, 10) : 0;
      if (Number.isNaN(amount) || amount < 0) {
        throw new Error(`Nominal ${p.name} tidak valid`);
      }
      return {
        id: p.id,
        slug: p.slug,
        target_amount: amount,
      };
    });

    setLoading(true);
    try {
      const updated = await updateJagoPockets(payload);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui sub-kantong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Target Sub-Kantong"
      subtitle="Perbarui plafon alokasi tiap sub-kantong operasional"
      icon={<Landmark className="w-5 h-5 text-amberGold" />}
      accent="amber"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-coralFall/10 border border-coralFall/20 rounded-2xl text-coralFall text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {pockets.map((pocket) => (
            <div
              key={pocket.slug}
              className="bg-obsidian-panel border border-white/[0.08] rounded-2xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`jago-target-${pocket.slug}`}
                  className="text-xs font-semibold text-zinc-300 uppercase tracking-wider"
                >
                  {pocket.name}
                </label>
                <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                  Terpakai: {formatRupiah(pocket.spent_amount ?? 0)}
                </span>
              </div>
              <CurrencyInput
                value={targets[pocket.slug] ?? ""}
                onChange={(raw) =>
                  setTargets((prev) => ({ ...prev, [pocket.slug]: raw }))
                }
                placeholder="0"
                accent="amber"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-1 text-xs font-mono">
          <span className="text-zinc-400">Total plafon draf</span>
          <span className="font-bold text-white tabular-nums">{formatRupiah(totalDraft)}</span>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08] mt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-2xl text-xs sm:text-sm bg-amberGold text-slate-950 font-bold hover:bg-amber-300 transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amberGold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-card"
          >
            {loading ? (
              "Menyimpan..."
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}

export const EditOperationalPocketsModal = EditJagoPocketsModal;
export default EditJagoPocketsModal;
