"use client";

import React, { useEffect, useRef, useState } from "react";
import { User, Send, LogOut, Unlink, Trash2, ExternalLink } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { authFetch, setStoredUser, UserProfile } from "@/lib/api";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (updated: UserProfile) => void;
  onLogout: () => void;
}

export function UserProfileModal({ isOpen, onClose, user, onUserUpdated, onLogout }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "telegram">("profile");
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [expired, setExpired] = useState(false);
  const inFlight = useRef(false);
  const isConnected = Boolean(user.telegram_chat_id && user.telegram_mode !== "custom");

  const updateUser = (updated: UserProfile) => {
    setStoredUser(updated);
    onUserUpdated(updated);
  };

  useEffect(() => {
    if (!isOpen || !link) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, link.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [isOpen, link]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = { full_name: fullName.trim(), email: email.trim() || null };
      if (newPassword.trim()) {
        if (newPassword.trim().length < 8) throw new Error("Password baru minimal 8 karakter.");
        payload.password = newPassword.trim();
      }
      const response = await authFetch("/api/v1/auth/me", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Gagal menyimpan profil.");
      updateUser(data);
      setNewPassword("");
      setMsg({ type: "success", text: "Profil diperbarui." });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal menyimpan profil." });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMsg(null);
    setLink(null);
    try {
      const response = await authFetch("/api/v1/auth/link-telegram", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Gagal membuat tautan Telegram.");
      setLink({ url: data.url, expiresAt: Date.now() + data.expires_in * 1000 });
      setExpired(false);
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal menghubungkan Telegram." });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleCheckConnection = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMsg(null);
    try {
      const response = await authFetch("/api/v1/auth/me");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Gagal memeriksa koneksi.");
      updateUser(data);
      const connected = data.telegram_chat_id && data.telegram_mode === "shared";
      if (connected) setLink(null);
      setMsg({ type: connected ? "success" : "error", text: connected
        ? "Telegram terhubung. Ketik /menu di bot untuk mulai."
        : "Belum terhubung. Buka tautan bot dan tekan Start, lalu cek lagi." });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal memeriksa koneksi." });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMsg(null);
    try {
      const response = await authFetch("/api/v1/auth/unlink-telegram", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Gagal memutuskan tautan.");
      updateUser(data);
      setLink(null);
      setShowUnlinkConfirm(false);
      setMsg({ type: "success", text: "Telegram diputuskan." });
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal memutuskan tautan." });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMsg(null);
    try {
      const response = await authFetch("/api/v1/auth/me", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Gagal menghapus akun.");
      }
      onLogout();
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal menghapus akun." });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const fieldClass = "w-full min-h-11 rounded-[var(--ai7-radius-control)] border border-luma-smokeline bg-luma-coal px-3 text-base text-luma-ivory";

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title="Profil & pengaturan akun"
      subtitle={"Kelola akun @" + user.username} icon={<User className="h-4 w-4" />} maxWidth="lg">
      <div className="space-y-5 text-sm text-luma-ivory">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-medium">{user.full_name}</p><p className="text-luma-smoke">@{user.username}</p></div>
          <button type="button" onClick={onLogout} className="luma-action-secondary"><LogOut className="h-4 w-4" />Keluar</button>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Pengaturan akun">
          <button type="button" role="tab" aria-selected={activeTab === "profile"} aria-controls="profile-panel"
            id="profile-tab" onClick={() => { setActiveTab("profile"); setMsg(null); }}
            className={activeTab === "profile" ? "luma-action-primary" : "luma-action-secondary"}>Profil</button>
          <button type="button" role="tab" aria-selected={activeTab === "telegram"} aria-controls="telegram-panel"
            id="telegram-tab" onClick={() => { setActiveTab("telegram"); setMsg(null); }}
            className={activeTab === "telegram" ? "luma-action-primary" : "luma-action-secondary"}><Send className="h-4 w-4" />Integrasi Telegram</button>
        </div>
        {msg && <p role={msg.type === "error" ? "alert" : "status"} className={msg.type === "error" ? "text-coralFall" : "text-mintRise"}>{msg.text}</p>}
        {activeTab === "profile" && (
          <div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" className="space-y-5">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2"><label htmlFor="profile-name">Nama lengkap</label>
                <input id="profile-name" value={fullName} onChange={event => setFullName(event.target.value)} className={fieldClass} required /></div>
              <div className="space-y-2"><label htmlFor="profile-email">Email</label>
                <input id="profile-email" type="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></div>
              <div className="space-y-2"><label htmlFor="profile-password">Password baru</label>
                <input id="profile-password" type="password" autoComplete="new-password" minLength={8} value={newPassword}
                  onChange={event => setNewPassword(event.target.value)} className={fieldClass} aria-describedby="profile-password-help" />
                <p id="profile-password-help" className="text-xs text-luma-smoke">Kosongkan jika belum ingin mengganti password.</p></div>
              <button type="submit" disabled={loading} className="luma-action-primary">{loading ? "Menyimpan…" : "Simpan profil"}</button>
            </form>
            <div className="space-y-3 border-t border-luma-smokeline pt-5">
              <p>Hapus akun beserta seluruh data keuangan secara permanen.</p>
              {!showDeleteConfirm ? <button type="button" className="luma-action-secondary text-coralFall" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="h-4 w-4" />Hapus akun</button>
                : <div className="space-y-3"><p role="alert">Seluruh data akan dihapus dan kamu akan keluar. Lanjutkan?</p><div className="flex gap-2">
                  <button type="button" disabled={loading} className="luma-action-secondary" onClick={() => setShowDeleteConfirm(false)}>Batal</button>
                  <button type="button" disabled={loading} className="luma-action-secondary text-coralFall" onClick={handleDeleteAccount}>{loading ? "Menghapus…" : "Ya, hapus akun"}</button>
                </div></div>}
            </div>
          </div>
        )}
        {activeTab === "telegram" && (
          <div role="tabpanel" id="telegram-panel" aria-labelledby="telegram-tab" className="space-y-4">
            <div className="space-y-2 rounded-[var(--ai7-radius-panel)] border border-luma-smokeline bg-luma-coal p-5">
              <h3 className="font-medium">Bot Tillfold</h3>
              <p className="text-luma-smoke">Catat transaksi, kirim struk, dan cek saldo lewat Telegram. Semua pengguna memakai satu bot dengan akun keuangan masing-masing.</p>
              <p className={isConnected ? "text-mintRise" : "text-luma-smoke"}>{isConnected ? "Terhubung · ID " + user.telegram_chat_id : "Belum terhubung"}</p>
              {user.telegram_mode === "custom" && <p>Hubungkan ulang untuk beralih dari bot pribadi ke bot Tillfold.</p>}
            </div>
            {!isConnected && !link && <button type="button" onClick={handleConnect} disabled={loading} className="luma-action-primary">{loading ? "Menyiapkan tautan…" : "Hubungkan Telegram"}</button>}
            {link && <div className="space-y-3">
              <p>Buka bot dan tekan Start. Tautan ini berlaku 10 menit dan hanya bisa dipakai sekali. Simpan tautan untuk diri sendiri.</p>
              {expired ? <p role="status" className="text-coralFall">Tautan kedaluwarsa. Buat tautan baru untuk melanjutkan.</p>
                : <a href={link.url} target="_blank" rel="noreferrer" className="luma-action-primary"><ExternalLink className="h-4 w-4" />Buka bot Tillfold</a>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleCheckConnection} disabled={loading} className="luma-action-secondary">{loading ? "Memeriksa…" : "Cek koneksi"}</button>
                <button type="button" onClick={handleConnect} disabled={loading} className="luma-action-secondary">Buat tautan baru</button>
              </div>
            </div>}
            {(isConnected || user.telegram_mode === "custom") && !showUnlinkConfirm &&
              <button type="button" onClick={() => setShowUnlinkConfirm(true)} disabled={loading} className="luma-action-secondary"><Unlink className="h-4 w-4" />Putuskan Telegram</button>}
            {showUnlinkConfirm && <div className="space-y-3">
              <p>Putuskan koneksi Telegram dari akun ini?</p><div className="flex gap-2">
                <button type="button" onClick={() => setShowUnlinkConfirm(false)} disabled={loading} className="luma-action-secondary">Batal</button>
                <button type="button" onClick={handleUnlink} disabled={loading} className="luma-action-secondary text-coralFall">{loading ? "Memutuskan…" : "Putuskan"}</button>
              </div>
            </div>}
          </div>
        )}
      </div>
    </CustomModal>
  );
}
