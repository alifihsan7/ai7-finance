"use client";

import React, { useState } from "react";
import { User, Send, CheckCircle2, LogOut, AlertCircle, Bot, Sparkles, ExternalLink, ShieldCheck, Unlink, Trash2, AlertTriangle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"profile" | "telegram">("profile");

  // Profile form state
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email || "");
  const [newPassword, setNewPassword] = useState("");

  // Telegram integration state
  const initialMode = user.telegram_mode === "custom" ? "custom" : "shared";
  const [telegramMode, setTelegramMode] = useState<"shared" | "custom">(initialMode);
  const [sharedChatId, setSharedChatId] = useState(user.telegram_chat_id ? user.telegram_chat_id.toString() : "");
  const [customBotToken, setCustomBotToken] = useState("");
  const [customChatId, setCustomChatId] = useState(user.telegram_chat_id ? user.telegram_chat_id.toString() : "");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/v1/auth/me", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setMsg({ type: "error", text: err.detail || "Gagal menghapus akun" });
        setIsDeletingAccount(false);
        setShowDeleteConfirm(false);
        return;
      }
      onLogout();
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan saat menghapus akun" });
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

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
      setStoredUser(updatedUser);
      onUserUpdated(updatedUser);
      setMsg({ type: "success", text: "Profil berhasil diperbarui!" });
      setNewPassword("");
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan profil" });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSharedBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const cid = parseInt(sharedChatId.trim(), 10);
      if (!cid || isNaN(cid)) {
        throw new Error("Masukkan Telegram Chat ID berupa angka yang valid.");
      }

      const res = await authFetch("/api/v1/auth/link-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_chat_id: cid }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal menautkan Telegram Chat ID");
      }

      const updated = data as UserProfile;
      setStoredUser(updated);
      onUserUpdated(updated);
      setMsg({ type: "success", text: "Berhasil terhubung ke Shared Bot @AI7Fin4nc3_bot! Coba kirim /menu di Telegram." });
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Gagal menghubungkan Telegram" });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCustomBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const token = customBotToken.trim();
      if (!token || !token.includes(":")) {
        throw new Error("Format token bot tidak valid. Dapatkan dari @BotFather (format: 123456789:ABC...)");
      }

      const payload: Record<string, unknown> = { bot_token: token };
      if (customChatId.trim()) {
        const cid = parseInt(customChatId.trim(), 10);
        if (!isNaN(cid) && cid > 0) {
          payload.telegram_chat_id = cid;
        }
      }

      const res = await authFetch("/api/v1/auth/link-telegram-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal mendaftarkan bot kustom ke Telegram");
      }

      const updated = data as UserProfile;
      setStoredUser(updated);
      onUserUpdated(updated);
      setCustomBotToken("");
      setMsg({
        type: "success",
        text: `Bot kustom @${updated.telegram_bot_username || "bot"} berhasil diaktifkan dan siap digunakan!`,
      });
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Gagal mengaktifkan bot kustom" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm("Yakin ingin memutuskan tautan Telegram dari akun ini?")) return;
    setMsg(null);
    setLoading(true);

    try {
      const res = await authFetch("/api/v1/auth/unlink-telegram", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal memutuskan tautan Telegram");
      }

      const updated = data as UserProfile;
      setStoredUser(updated);
      onUserUpdated(updated);
      setSharedChatId("");
      setCustomChatId("");
      setCustomBotToken("");
      setMsg({ type: "success", text: "Tautan bot Telegram berhasil diputuskan." });
    } catch (err: unknown) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Gagal memutuskan tautan" });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(user.telegram_chat_id || user.telegram_bot_username);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil & Pengaturan Akun"
      subtitle={`Kelola profil @${user.username} dan integrasi Telegram`}
      icon={<User className="w-4 h-4 text-amberGold" />}
      accent="amber"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* User Card Header */}
        <div className="p-4 rounded-2xl bg-obsidian-card border border-white/[0.08] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amberGold/10 border border-amberGold/20 flex items-center justify-center text-amberGold font-bold text-sm">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{user.full_name}</p>
              <p className="text-[11px] text-zinc-400 font-mono">@{user.username}{user.email ? ` • ${user.email}` : ""}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-coralFall/10 hover:bg-coralFall/20 border border-coralFall/20 text-coralFall text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-obsidian-panel border border-white/[0.08]">
          <button
            type="button"
            onClick={() => { setActiveTab("profile"); setMsg(null); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "profile"
                ? "bg-obsidian-card text-amberGold border border-white/[0.08] shadow-sm font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profil Pengguna
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("telegram"); setMsg(null); }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "telegram"
                ? "bg-obsidian-card text-cyanHub border border-white/[0.08] shadow-sm font-semibold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Integrasi Telegram
            {isConnected && (
              <span className="w-2 h-2 rounded-full bg-mintRise animate-pulse" />
            )}
          </button>
        </div>

        {/* Status / Error Alert Message */}
        {msg && (
          <div
            className={`flex items-start gap-2.5 p-3.5 rounded-2xl border text-xs leading-relaxed animate-fadeIn ${
              msg.type === "success"
                ? "bg-mintRise/10 border-mintRise/25 text-mintRise"
                : "bg-coralFall/10 border-coralFall/25 text-coralFall"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-mintRise mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-coralFall mt-0.5" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* TAB 1: Profil Pengguna */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-obsidian-panel border border-white/[0.08] text-white rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amberGold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-obsidian-panel border border-white/[0.08] text-white placeholder-zinc-500 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amberGold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Password Baru <span className="text-zinc-500 font-normal">(Kosongkan jika tidak diubah)</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-obsidian-panel border border-white/[0.08] text-white placeholder-zinc-500 rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amberGold"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-2xl bg-amberGold hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                    Menyimpan...
                  </span>
                ) : (
                  "Simpan Perubahan Profil"
                )}
              </button>
            </div>

            {/* Danger Zone: Hapus Akun & Data (Self-Serve Reset) */}
            <div className="pt-4 mt-3 border-t border-coralFall/20 space-y-2">
              <div>
                <h4 className="text-xs font-semibold text-coralFall flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Zona Bahaya
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Hapus permanen akun Anda beserta seluruh data rekening, transaksi, dan target finansial.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 px-3 rounded-2xl bg-coralFall/10 hover:bg-coralFall/20 border border-coralFall/25 text-coralFall text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Akun & Seluruh Data (Reset)
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-coralFall/10 border border-coralFall/30 space-y-2.5 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-coralFall shrink-0 mt-0.5" />
                    <div className="text-[11px] text-zinc-200 leading-relaxed">
                      <strong>Konfirmasi Hapus Akun:</strong> Tindakan ini permanen. Seluruh data keuangan Anda akan dihapus dari server dan Anda akan otomatis keluar.
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-xl bg-obsidian-card hover:bg-white/[0.06] text-zinc-300 text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={handleDeleteAccount}
                      className="px-3.5 py-1.5 rounded-xl bg-coralFall hover:brightness-110 text-slate-950 text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isDeletingAccount ? "Menghapus..." : "Ya, Hapus Akun"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}

        {/* TAB 2: Integrasi Dual-Mode Telegram */}
        {activeTab === "telegram" && (
          <div className="space-y-4">
            {/* Active Telegram Status Banner */}
            <div className="p-4 rounded-2xl bg-obsidian-card border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isConnected ? "bg-mintRise/15 border border-mintRise/30 text-mintRise" : "bg-amberGold/15 border border-amberGold/30 text-amberGold"
                }`}>
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Status Integrasi Bot
                    </span>
                    {isConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-mintRise/15 border border-mintRise/30 text-mintRise text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Terhubung ({user.telegram_mode === "custom" ? "Bot Sendiri" : "Shared Bot"})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amberGold/15 border border-amberGold/30 text-amberGold text-[10px] font-medium">
                        Belum Terhubung
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {user.telegram_mode === "custom" && user.telegram_bot_username
                      ? `Bot aktif: @${user.telegram_bot_username} (ID: ${user.telegram_chat_id || "Auto-detect"})`
                      : user.telegram_chat_id
                      ? `Shared Bot @AI7Fin4nc3_bot • Chat ID: ${user.telegram_chat_id}`
                      : "Pilih salah satu mode di bawah untuk menghubungkan Telegram"}
                  </p>
                </div>
              </div>

              {isConnected && (
                <button
                  type="button"
                  onClick={handleUnlinkTelegram}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-coralFall/10 hover:bg-coralFall/20 border border-coralFall/25 text-coralFall text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Unlink className="w-3 h-3" />
                  Putuskan Tautan
                </button>
              )}
            </div>

            {/* Mode Selection Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Pilih Mode Bot Telegram
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTelegramMode("shared"); setMsg(null); }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    telegramMode === "shared"
                      ? "bg-obsidian-card border-cyanHub/50 shadow-sm"
                      : "bg-obsidian-panel border-white/[0.08] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                      telegramMode === "shared" ? "text-cyanHub" : "text-white"
                    }`}>
                      <Bot className="w-3.5 h-3.5" />
                      1. Shared Bot
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyanHub/10 text-cyanHub border border-cyanHub/20 font-medium">
                      Praktis
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-tight">
                    Pakai bot utama @AI7Fin4nc3_bot tanpa perlu buat bot baru.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { setTelegramMode("custom"); setMsg(null); }}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                    telegramMode === "custom"
                      ? "bg-obsidian-card border-amberGold/50 shadow-sm"
                      : "bg-obsidian-panel border-white/[0.08] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                      telegramMode === "custom" ? "text-amberGold" : "text-white"
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      2. Bot Sendiri (BYOB)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amberGold/10 text-amberGold border border-amberGold/20 font-medium">
                      Privat
                    </span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-tight">
                    Buat bot dengan nama & avatar sendiri via @BotFather.
                  </p>
                </button>
              </div>
            </div>

            {/* PANDUAN & FORMULIR MODE 1: SHARED BOT */}
            {telegramMode === "shared" && (
              <div className="p-5 rounded-3xl bg-obsidian-panel border border-white/[0.08] space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-cyanHub text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Panduan 3 Langkah: Hubungkan ke Shared Bot
                </div>

                <div className="space-y-2 text-xs text-zinc-300 leading-relaxed bg-obsidian-card p-3.5 rounded-2xl border border-white/[0.08]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyanHub/20 text-cyanHub flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Buka aplikasi Telegram dan cari bot{" "}
                      <a
                        href="https://t.me/AI7Fin4nc3_bot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyanHub font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        @AI7Fin4nc3_bot <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyanHub/20 text-cyanHub flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Ketik atau klik perintah <code className="text-cyanHub font-mono bg-cyanHub/10 px-1 py-0.5 rounded">/start</code>. Bot akan membalas dengan menampilkan <strong>Chat ID</strong> unik Telegram kamu.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyanHub/20 text-cyanHub flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Salin nomor Chat ID tersebut dan masukkan ke kolom formulir di bawah ini, lalu klik tombol <strong>Hubungkan Telegram</strong>.
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLinkSharedBot} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Telegram Chat ID Kamu
                    </label>
                    <input
                      type="number"
                      value={sharedChatId}
                      onChange={(e) => setSharedChatId(e.target.value)}
                      placeholder="Contoh: 987654321"
                      className="w-full bg-obsidian-card border border-white/[0.08] text-white placeholder-zinc-500 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyanHub font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-cyanHub hover:brightness-110 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                        Menghubungkan ke Shared Bot...
                      </span>
                    ) : (
                      "Hubungkan ke Shared Bot @AI7Fin4nc3_bot"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* PANDUAN & FORMULIR MODE 2: BRING YOUR OWN BOT (BYOB) */}
            {telegramMode === "custom" && (
              <div className="p-5 rounded-3xl bg-obsidian-panel border border-white/[0.08] space-y-3.5 shadow-sm">
                <div className="flex items-center gap-2 text-amberGold text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Panduan 4 Langkah: Buat & Hubungkan Bot Pribadi (BYOB)
                </div>

                <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed bg-obsidian-card p-3.5 rounded-2xl border border-white/[0.08]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amberGold/20 text-amberGold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Buka aplikasi Telegram dan cari bot resmi{" "}
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amberGold font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        @BotFather <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amberGold/20 text-amberGold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Kirim pesan <code className="text-amberGold font-mono bg-amberGold/10 px-1 py-0.5 rounded">/newbot</code>, lalu beri nama bot (misal: <em>Keuangan Pribadi</em>) dan username bot yang berakhiran <code className="text-amberGold font-mono">bot</code> (misal: <em>keuangan_budi_bot</em>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amberGold/20 text-amberGold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      BotFather akan memberikan pesan konfirmasi beserta <strong>HTTP API Token</strong> (panjang sekitar 45 karakter diawali angka, contoh: <code className="text-zinc-400 font-mono">7123456789:AAH...</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amberGold/20 text-amberGold flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      Salin Token tersebut dan tempelkan pada kolom formulir di bawah. Server kami akan otomatis mendaftarkan Webhook Telegram dan menu perintah untuk bot kamu!
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLinkCustomBot} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Token Bot Telegram (Diberikan oleh @BotFather)
                    </label>
                    <input
                      type="text"
                      value={customBotToken}
                      onChange={(e) => setCustomBotToken(e.target.value)}
                      placeholder="Contoh: 7123456789:AAH_XYZ123456789abcdef"
                      className="w-full bg-obsidian-card border border-white/[0.08] text-white placeholder-zinc-500 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-amberGold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Telegram Chat ID Kamu <span className="text-zinc-500 font-normal">(Opsional — untuk notifikasi & sambutan)</span>
                    </label>
                    <input
                      type="number"
                      value={customChatId}
                      onChange={(e) => setCustomChatId(e.target.value)}
                      placeholder="Dapatkan dengan ketik /start di bot baru Anda"
                      className="w-full bg-obsidian-card border border-white/[0.08] text-white placeholder-zinc-500 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-amberGold font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-2xl bg-amberGold hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                        Mendaftarkan Webhook & Menu Perintah...
                      </span>
                    ) : (
                      "Aktifkan Bot Pribadi Saya & Setup Webhook"
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomModal>
  );
}
