export interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  telegram_chat_id: number | null;
  telegram_bot_username?: string | null;
  telegram_mode?: "shared" | "custom" | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_onboarded: boolean;
  created_at?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ai7_token");
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("ai7_token", token);
  } else {
    localStorage.removeItem("ai7_token");
  }
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ai7_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem("ai7_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("ai7_user");
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Bank Jago Pockets (Sub-Pocket Vanguard) — /api/v1/jago-pockets
// ---------------------------------------------------------------------------

export interface JagoPocketItem {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  target_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_spent: number;
  percentage: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface JagoPocketsSummaryResponse {
  total_jago_balance: number;
  total_target_amount: number;
  total_spent_amount: number;
  total_remaining_amount: number;
  cycle_start?: string | null;
  cycle_end?: string | null;
  pockets: JagoPocketItem[];
  items: JagoPocketItem[];
}

export interface JagoPocketTargetUpdate {
  id?: number;
  slug?: string;
  name?: string;
  target_amount: number;
  is_active?: boolean;
}

async function parseJagoResponse(res: Response, action: string): Promise<JagoPocketsSummaryResponse> {
  if (!res.ok) {
    let detail = `Gagal ${action} kantong Bank Jago`;
    try {
      const data = await res.json();
      if (data && typeof data.detail === "string" && data.detail.trim()) {
        detail = data.detail;
      }
    } catch {
      // Fall through to default message when body is not JSON.
    }
    throw new Error(detail);
  }
  return (await res.json()) as JagoPocketsSummaryResponse;
}

export async function getJagoPockets(): Promise<JagoPocketsSummaryResponse> {
  const res = await authFetch("/api/v1/jago-pockets");
  return parseJagoResponse(res, "memuat");
}

export async function updateJagoPockets(
  payload: JagoPocketTargetUpdate[]
): Promise<JagoPocketsSummaryResponse> {
  const res = await authFetch("/api/v1/jago-pockets", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJagoResponse(res, "memperbarui");
}

export async function syncJagoPocketCommitments(): Promise<JagoPocketsSummaryResponse> {
  const res = await authFetch("/api/v1/jago-pockets/sync-commitments", {
    method: "POST",
  });
  return parseJagoResponse(res, "menyelaraskan");
}
