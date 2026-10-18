"use client";

import React, { useState } from "react";
import { User, Send, CheckCircle2, LogOut, AlertCircle } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { authFetch, setStoredUser, UserProfile } from "@/lib/api";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (updated: UserProfile) => void;
  onLogout: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onLogout,
}: UserProfileModalProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [telegramIdStr, setTelegramIdStr] = useState(user.telegram_chat_id ? user.telegram_chat_id.toString() : "");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        full_name: fullName.trim(),
        email: email.trim() || null,
      };
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error("Password baru minimal 6 karakter");
        }
        payload.password = newPassword.trim();
      }

      const res = await authFetch("/api/v1/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON fallback
      }
      if (!res.ok || !data) {
        const detail = (data as { detail?: string })?.detail;
        throw new Error(detail || `Gagal memperbarui profil (Status: ${res.status})`);
      }

      const updatedUser = data as unknown as UserProfile;

      // If telegram ID changed
      const tgNum = telegramIdStr.trim() ? parseInt(telegramIdStr.trim(), 10) : null;
      if (tgNum && tgNum !== user.telegram_chat_id) {
        const tgRes = await authFetch("/api/v1/auth/link-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram_chat_id: tgNum }),
        });
        const tgData = await tgRes.json();
        if (!tgRes.ok) {
          throw new Error(tgData.detail || "Profil tersimpan, namun gagal menautkan Telegram ID");
        }
        setStoredUser(tgData);
        onUserUpdated(tgData);
      } else {
        setStoredUser(updatedUser);
        onUserUpdated(updatedUser);
      }

      setMsg({ type: "success", text: "Profil dan pengaturan akun berhasil diperbarui!" });
      setNewPassword("");
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil & Pengaturan Akun"
      subtitle={`Kelola akun @${user.username} dan integrasi bot Telegram`}
      icon={<User className="w-4 h-4 text-emerald-400" />}
      accent="mint"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-[#181C26] border border-[#252B3B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">{user.full_name}</p>
              <p className="text-[11px] text-slate-400 font-mono">@{user.username} • User #{user.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>

        {msg && (
          <div
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed animate-in fade-in ${
              msg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/25 text-rose-300"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Telegram Integration Card */}
        <div className="p-3.5 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              Tautan Telegram Bot (@AI7Fin4nc3_bot)
            </span>
            {user.telegram_chat_id ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Terhubung
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                Belum Terhubung
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tautkan Telegram Chat ID agar bot mencatat struk belanja, voice note, dan transaksi langsung ke akun Anda.
          </p>
          <div className="pt-1">
            <input
              type="number"
              value={telegramIdStr}
              onChange={(e) => setTelegramIdStr(e.target.value)}
              placeholder="Contoh: 1357550611"
              className="w-full bg-[#12151D] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password Baru <span className="text-slate-500 font-normal">(Kosongkan jika tidak diubah)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </form>
      </div>
    </CustomModal>
  );
}
