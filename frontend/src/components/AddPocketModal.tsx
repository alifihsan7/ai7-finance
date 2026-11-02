import React, { useState } from "react";
import { Wallet } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { CustomSelect } from "./ui/CustomSelect";
import { CurrencyInput } from "./ui/CurrencyInput";
import { createAccountPocket } from "@/lib/api";

interface AddPocketModalProps {
  accountId: number;
  accountName: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddPocketModal({ accountId, accountName, onClose, onCreated }: AddPocketModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("operasional");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const target = Number(amount || 0);
    if (!name.trim() || !Number.isSafeInteger(target) || target < 0 || target > 9000000000000000) {
      setError("Isi nama dan plafon yang valid.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAccountPocket({ account_id: accountId, name: name.trim(), role, target_amount: target });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah kantong.");
      setSaving(false);
    }
  };

  return <CustomModal isOpen onClose={() => { if (!saving) onClose(); }} title="Tambah kantong" subtitle={`Rekening induk: ${accountName}`} icon={<Wallet className="w-5 h-5" />} maxWidth="md">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="text-sm text-luma-coral">{error}</p>}
      <div>
        <label htmlFor="pocket-name" className="block mb-1.5">Nama kantong</label>
        <input id="pocket-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={saving} placeholder="Contoh: Belanja bulanan" className="w-full px-3 py-2 border border-luma-smokeline rounded-xl bg-obsidian-card text-luma-ivory" />
      </div>
      <fieldset disabled={saving}>
        <legend className="text-xs font-medium text-luma-smoke mb-1.5">Jenis kantong</legend>
        <CustomSelect value={role} onChange={setRole} disabled={saving} options={[
          { value: "operasional", label: "Operasional" }, { value: "tagihan", label: "Tagihan" },
          { value: "darurat", label: "Dana darurat" }, { value: "tabungan", label: "Tabungan" },
          { value: "investasi", label: "Investasi" },
        ]} />
      </fieldset>
      <fieldset disabled={saving}>
        <legend className="text-xs font-medium text-luma-smoke mb-1.5">Plafon alokasi</legend>
        <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
        <p className="text-xs text-luma-smoke mt-2">Alokasi dari saldo {accountName}. Saldo rekening tidak bertambah saat kantong dibuat.</p>
      </fieldset>
      <div className="flex justify-end gap-2 pt-4 border-t border-luma-smokeline">
        <button type="button" disabled={saving} onClick={onClose} className="px-4 py-2 border border-luma-smokeline text-luma-smoke">Batal</button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-luma-ivory text-luma-charcoal">{saving ? "Menyimpan..." : "Tambah kantong"}</button>
      </div>
    </form>
  </CustomModal>;
}
