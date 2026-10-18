"use client";

import React, { useState } from "react";
import { User, Send, CheckCircle2, LogOut, AlertCircle, Bot, Sparkles, ExternalLink, ShieldCheck, Unlink } from "lucide-react";
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
      icon={<User className="w-4 h-4 text-emerald-400" />}
      accent="mint"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* User Card Header */}
        <div className="p-3.5 rounded-xl bg-[#181C26] border border-[#252B3B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">{user.full_name}</p>
              <p className="text-[11px] text-slate-400 font-mono">@{user.username}{user.email ? ` • ${user.email}` : ""}</p>
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12151D] border border-[#252B3B]">
          <button
            type="button"
            onClick={() => { setActiveTab("profile"); setMsg(null); }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "profile"
                ? "bg-[#181C26] text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profil Pengguna
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("telegram"); setMsg(null); }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "telegram"
                ? "bg-[#181C26] text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Integrasi Telegram
            {isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Status / Error Alert Message */}
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

        {/* TAB 1: Profil Pengguna */}
        {activeTab === "profile" && (
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
                  "Simpan Perubahan Profil"
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Integrasi Dual-Mode Telegram */}
        {activeTab === "telegram" && (
          <div className="space-y-4">
            {/* Active Telegram Status Banner */}
            <div className="p-3.5 rounded-xl bg-[#181C26] border border-[#252B3B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isConnected ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                }`}>
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Status Integrasi Bot
                    </span>
                    {isConnected ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Terhubung ({user.telegram_mode === "custom" ? "Bot Sendiri" : "Shared Bot"})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                        Belum Terhubung
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
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
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Unlink className="w-3 h-3" />
                  Putuskan Tautan
                </button>
              )}
            </div>

            {/* Mode Selection Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Pilih Mode Bot Telegram
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTelegramMode("shared"); setMsg(null); }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    telegramMode === "shared"
                      ? "bg-[#181C26] border-cyan-500/50 shadow-md shadow-cyan-500/10"
                      : "bg-[#12151D] border-[#252B3B] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                      telegramMode === "shared" ? "text-cyan-300" : "text-slate-300"
                    }`}>
                      <Bot className="w-3.5 h-3.5" />
                      1. Shared Bot
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                      Praktis
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Pakai bot utama @AI7Fin4nc3_bot tanpa perlu buat bot baru.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { setTelegramMode("custom"); setMsg(null); }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    telegramMode === "custom"
                      ? "bg-[#181C26] border-amber-500/50 shadow-md shadow-amber-500/10"
                      : "bg-[#12151D] border-[#252B3B] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                      telegramMode === "custom" ? "text-amber-300" : "text-slate-300"
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      2. Bot Sendiri (BYOB)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      Privat
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight">
                    Buat bot dengan nama & avatar sendiri via @BotFather.
                  </p>
                </button>
              </div>
            </div>

            {/* PANDUAN & FORMULIR MODE 1: SHARED BOT */}
            {telegramMode === "shared" && (
              <div className="p-4 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-3.5">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Panduan 3 Langkah: Hubungkan ke Shared Bot
                </div>

                <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-[#12151D] p-3 rounded-xl border border-[#252B3B]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Buka aplikasi Telegram dan cari bot{" "}
                      <a
                        href="https://t.me/AI7Fin4nc3_bot"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        @AI7Fin4nc3_bot <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Ketik atau klik perintah <code className="text-cyan-300 font-mono bg-cyan-500/10 px-1 py-0.5 rounded">/start</code>. Bot akan membalas dengan menampilkan <strong>Chat ID</strong> unik Telegram kamu.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Salin nomor Chat ID tersebut dan masukkan ke kolom formulir di bawah ini, lalu klik tombol <strong>Hubungkan Telegram</strong>.
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLinkSharedBot} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Telegram Chat ID Kamu
                    </label>
                    <input
                      type="number"
                      value={sharedChatId}
                      onChange={(e) => setSharedChatId(e.target.value)}
                      placeholder="Contoh: 987654321"
                      className="w-full bg-[#12151D] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500/50 font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
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
              <div className="p-4 rounded-xl bg-[#181C26] border border-[#252B3B] space-y-3.5">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Panduan 4 Langkah: Buat & Hubungkan Bot Pribadi (BYOB)
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed bg-[#12151D] p-3 rounded-xl border border-[#252B3B]">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Buka aplikasi Telegram dan cari bot resmi{" "}
                      <a
                        href="https://t.me/BotFather"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        @BotFather <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Kirim pesan <code className="text-amber-300 font-mono bg-amber-500/10 px-1 py-0.5 rounded">/newbot</code>, lalu beri nama bot (misal: <em>Keuangan Pribadi</em>) dan username bot yang berakhiran <code className="text-amber-300 font-mono">bot</code> (misal: <em>keuangan_budi_bot</em>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      BotFather akan memberikan pesan konfirmasi beserta <strong>HTTP API Token</strong> (panjang sekitar 45 karakter diawali angka, contoh: <code className="text-slate-400 font-mono">7123456789:AAH...</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      Salin Token tersebut dan tempelkan pada kolom formulir di bawah. Server kami akan otomatis mendaftarkan Webhook Telegram dan menu perintah untuk bot kamu!
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLinkCustomBot} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Token Bot Telegram (Diberikan oleh @BotFather)
                    </label>
                    <input
                      type="text"
                      value={customBotToken}
                      onChange={(e) => setCustomBotToken(e.target.value)}
                      placeholder="Contoh: 7123456789:AAH_XYZ123456789abcdef"
                      className="w-full bg-[#12151D] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500/50 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Telegram Chat ID Kamu <span className="text-slate-500 font-normal">(Opsional — untuk notifikasi & sambutan)</span>
                    </label>
                    <input
                      type="number"
                      value={customChatId}
                      onChange={(e) => setCustomChatId(e.target.value)}
                      placeholder="Dapatkan dengan ketik /start di bot baru Anda"
                      className="w-full bg-[#12151D] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500/50 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
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
