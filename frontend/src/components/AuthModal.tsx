"use client";

import React, { useState, useEffect } from "react";
import { LogIn, UserPlus, Shield, Sparkles, AlertCircle, KeyRound, AtSign, User, Info } from "lucide-react";
import { CustomModal } from "./ui/CustomModal";
import { setAuthToken, setStoredUser, UserProfile } from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile, isNewUser: boolean) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleHelpOpen, setGoogleHelpOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Config
  const [googleConfig, setGoogleConfig] = useState<{ client_id: string | null; is_configured: boolean }>({
    client_id: null,
    is_configured: false,
  });

  // Form states
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/v1/auth/google/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.is_configured === "boolean") {
          setGoogleConfig(data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON fallback
      }

      if (!res.ok || !data) {
        const detail = (data as { detail?: string })?.detail;
        throw new Error(detail || `Gagal masuk dengan Google (Status: ${res.status})`);
      }

      const authData = data as { access_token: string; user: UserProfile };
      setAuthToken(authData.access_token);
      setStoredUser(authData.user);
      onSuccess(authData.user, !authData.user.is_onboarded);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat masuk dengan Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !googleConfig.client_id) return;

    const initGsi = () => {
      // @ts-expect-error google GIS global
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        try {
          // @ts-expect-error google GIS global
          window.google.accounts.id.initialize({
            client_id: googleConfig.client_id,
            callback: (res: { credential?: string }) => {
              if (res.credential) {
                handleGoogleCredential(res.credential);
              }
            },
          });
          const btn = document.getElementById("google-gsi-render-area");
          if (btn && btn.childElementCount === 0) {
            // @ts-expect-error google GIS global
            window.google.accounts.id.renderButton(btn, {
              type: "standard",
              shape: "rectangular",
              theme: "filled_black",
              text: "continue_with",
              size: "large",
              logo_alignment: "left",
              width: 380,
            });
          }
        } catch {
          // GSI init failed silently
        }
      }
    };

    const timer = setTimeout(initGsi, 50);

    if (typeof window !== "undefined" && !document.getElementById("gsi-client-script")) {
      const script = document.createElement("script");
      script.id = "gsi-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(initGsi, 50);
      };
      document.body.appendChild(script);
    }

    return () => clearTimeout(timer);
  }, [isOpen, googleConfig.client_id]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginId.trim() || !loginPassword) {
      setError("Mohon isi username/email dan password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username_or_email: loginId.trim(),
          password: loginPassword,
        }),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response fallback
      }
      if (!res.ok || !data) {
        const detail = (data as { detail?: string })?.detail;
        throw new Error(detail || `Gagal masuk (Status: ${res.status}). Periksa username dan password.`);
      }

      const authData = data as { access_token: string; user: UserProfile };
      setAuthToken(authData.access_token);
      setStoredUser(authData.user);
      onSuccess(authData.user, false);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat masuk");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regFullName.trim() || !regUsername.trim() || !regPassword) {
      setError("Nama lengkap, username, dan password wajib diisi");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          username: regUsername.trim().toLowerCase(),
          email: regEmail.trim() || null,
          password: regPassword,
        }),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response fallback
      }
      if (!res.ok || !data) {
        const detail = (data as { detail?: string })?.detail;
        throw new Error(detail || `Gagal mendaftar akun baru (Status: ${res.status}).`);
      }

      const authData = data as { access_token: string; user: UserProfile };
      setAuthToken(authData.access_token);
      setStoredUser(authData.user);
      onSuccess(authData.user, true); // Trigger onboarding wizard for new user!
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mendaftar");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAlif = () => {
    setLoginId("alifihsan");
    setLoginPassword("alifihsan2026");
    setError(null);
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "login" ? "Masuk ke AI7 Finance" : "Daftar Akun Baru"}
      subtitle="Akses dashboard & pencatatan keuangan multi-tenant Anda"
      icon={<Shield className="w-4 h-4" />}
      accent="mint"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-[#181C26] p-1 rounded-xl border border-[#252B3B]">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
              mode === "login"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Masuk
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
              mode === "register"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Daftar Baru
          </button>
        </div>

        {/* Google Sign-in Section */}
        <div className="space-y-2">
          {googleConfig.is_configured ? (
            <div className="space-y-2">
              <div className="w-full flex justify-center h-[44px] min-h-[44px] overflow-hidden">
                <div id="google-gsi-render-area" className="w-full flex justify-center min-h-[44px]" />
              </div>
              {googleLoading && (
                <div className="text-center text-xs text-emerald-400 animate-pulse flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  Mengotentikasi akun Google...
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setGoogleHelpOpen(!googleHelpOpen)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#181C26] hover:bg-[#1E2330] border border-[#252B3B] text-slate-200 text-xs font-medium flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono">
                  Setup OAuth
                </span>
              </button>

              {googleHelpOpen && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#12151D] border border-amber-500/20 text-xs text-slate-300 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-300 font-medium text-xs">
                    <Info className="w-3.5 h-3.5" />
                    <span>Langkah Menghubungkan Google OAuth:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                    <li>Buka <b>Google Cloud Console</b> &rarr; APIs & Services &rarr; Credentials.</li>
                    <li>Buat <b>OAuth Client ID</b> (Type: <i>Web application</i>).</li>
                    <li>Tambahkan Authorized Javascript Origins:
                      <code className="block mt-0.5 p-1 bg-[#181C26] rounded text-emerald-400 font-mono text-[10px]">
                        https://alifihsan-studio.tailbdd42d.ts.net:8443
                      </code>
                    </li>
                    <li>Salin <b>Client ID</b> dan masukkan ke konfigurasi <code>GOOGLE_CLIENT_ID</code> di server.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <div className="h-px bg-[#252B3B] flex-1" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              atau dengan username & password
            </span>
            <div className="h-px bg-[#252B3B] flex-1" />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === "login" ? (
          <form key="login-form" onSubmit={handleLogin} className="space-y-3.5 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username atau Email
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="alifihsan atau email@domain.com"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Pre-fill for Alif */}
            <div className="pt-1">
              <button
                type="button"
                onClick={fillQuickAlif}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Quick Login Akun Utama (Alif Ihsan)
              </button>
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
                    Memverifikasi...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Masuk Sekarang
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form key="register-form" onSubmit={handleRegister} className="space-y-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Nama Lengkap Anda"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="contoh: user_baru"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 karakter"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Konfirmasi
                </label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full bg-[#181C26] border border-[#252B3B] text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                  required
                />
              </div>
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
                    Membuat Akun...
                  </span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Daftar & Mulai Wizard Setup
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </CustomModal>
  );
}
