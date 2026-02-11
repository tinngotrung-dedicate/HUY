export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8008";
const USE_MOCK =
  process.env.NEXT_PUBLIC_API_MOCK === "1" || process.env.NEXT_PUBLIC_API_BASE === "mock";
const TOKEN_KEY = "medgpt_jwt";
const REFRESH_KEY = "medgpt_refresh";

export type AuthTokens = { access_token: string; refresh_token: string };

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  } catch (error) {
    throw new Error("Không kết nối được backend");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      clearTokens();
      throw new Error("Phiên đăng nhập hết hạn");
    }
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---- Mock helpers (for local dev when backend chưa chạy) ----
type Child = { id: string; full_name: string; birth_date?: string | null; gender?: string | null; address?: string | null };
type Intake = Record<string, any>;

const MOCK_CHILDREN_KEY = "medgpt_mock_children";
const MOCK_INTAKE_KEY = "medgpt_mock_intake";

const loadMock = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
};

const saveMock = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

const mockListChildren = (): Child[] => loadMock<Child[]>(MOCK_CHILDREN_KEY, []);
const mockSaveChildren = (children: Child[]) => saveMock(MOCK_CHILDREN_KEY, children);
const mockGetIntakes = (): Record<string, Intake> => loadMock<Record<string, Intake>>(MOCK_INTAKE_KEY, {});
const mockSaveIntakes = (data: Record<string, Intake>) => saveMock(MOCK_INTAKE_KEY, data);

export async function loginEmail(email: string, password: string, code?: string) {
  const payload = await apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, code }),
  });
  setTokens(payload);
  return payload;
}

export async function signupEmail(email: string, full_name: string, password: string) {
  await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, full_name, password }),
  });
  return loginEmail(email, password);
}

export async function oauthLogin(provider: "google" | "facebook", payload: { id_token?: string; access_token?: string; email?: string; full_name?: string }) {
  const res = await apiFetch<AuthTokens>(`/auth/oauth/${provider}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokens(res);
  return res;
}

export async function getMe() {
  return apiFetch<{ id: string; email: string; full_name: string; role: string; two_factor_enabled: boolean }>("/auth/me");
}

export async function listChildren() {
  if (USE_MOCK) {
    return mockListChildren();
  }
  try {
    return await apiFetch<Array<any>>("/children");
  } catch (error) {
    if (USE_MOCK) return mockListChildren();
    throw error;
  }
}

export async function createChild(data: any) {
  if (USE_MOCK) {
    const children = mockListChildren();
    const newChild = { id: `mock-${Date.now()}`, ...data };
    children.unshift(newChild);
    mockSaveChildren(children);
    return newChild;
  }
  try {
    return await apiFetch<any>("/children", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    if (USE_MOCK) {
      const children = mockListChildren();
      const newChild = { id: `mock-${Date.now()}`, ...data };
      children.unshift(newChild);
      mockSaveChildren(children);
      return newChild;
    }
    throw error;
  }
}

export async function updateChild(childId: string, data: any) {
  if (USE_MOCK) {
    const children = mockListChildren();
    const next = children.map((c) => (c.id === childId ? { ...c, ...data } : c));
    mockSaveChildren(next);
    return next.find((c) => c.id === childId);
  }
  try {
    return await apiFetch<any>(`/children/${childId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  } catch (error) {
    if (USE_MOCK) {
      const children = mockListChildren();
      const next = children.map((c) => (c.id === childId ? { ...c, ...data } : c));
      mockSaveChildren(next);
      return next.find((c) => c.id === childId);
    }
    throw error;
  }
}

export async function getIntake(childId: string) {
  if (USE_MOCK) {
    const intakes = mockGetIntakes();
    return intakes[childId] || {};
  }
  try {
    return await apiFetch<any>(`/children/${childId}/intake`);
  } catch (error) {
    if (USE_MOCK) {
      const intakes = mockGetIntakes();
      return intakes[childId] || {};
    }
    throw error;
  }
}

export async function upsertIntake(childId: string, data: any) {
  if (USE_MOCK) {
    const intakes = mockGetIntakes();
    intakes[childId] = data;
    mockSaveIntakes(intakes);
    return data;
  }
  try {
    return await apiFetch<any>(`/children/${childId}/intake`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  } catch (error) {
    if (USE_MOCK) {
      const intakes = mockGetIntakes();
      intakes[childId] = data;
      mockSaveIntakes(intakes);
      return data;
    }
    throw error;
  }
}

export async function listChatMessages(childId: string) {
  if (USE_MOCK) {
    return [];
  }
  try {
    return await apiFetch<Array<any>>(`/chat/children/${childId}/messages`);
  } catch (error) {
    if (USE_MOCK) return [];
    throw error;
  }
}

export async function sendChat(childId: string, message: string, history?: any[]) {
  if (USE_MOCK) {
    return { answer: "Tin nhắn đã được gửi (mock). Hãy bật backend để nhận câu trả lời thật." };
  }
  try {
    return await apiFetch<{ answer: string }>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, child_id: childId }),
    });
  } catch (error) {
    if (USE_MOCK) {
      return { answer: "Tin nhắn đã được gửi (mock). Hãy bật backend để nhận câu trả lời thật." };
    }
    throw error;
  }
}

export async function listDoctors() {
  return apiFetch<Array<any>>("/doctors");
}

export async function listDoctorAvailability(doctorId: string) {
  return apiFetch<Array<any>>(`/schedules/doctor/${doctorId}`);
}

export async function listMySchedules() {
  return apiFetch<Array<any>>("/schedules/my");
}

export async function updateScheduleStatus(scheduleId: string, status: string) {
  return apiFetch<any>(`/schedules/${scheduleId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function listSlots(activeOnly = true) {
  const qs = `?active_only=${activeOnly ? "true" : "false"}`;
  return apiFetch<Array<any>>(`/slots${qs}`);
}

export async function createSlot(payload: any) {
  return apiFetch<any>("/slots", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSlot(slotId: string, payload: any) {
  return apiFetch<any>(`/slots/${slotId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSlot(slotId: string) {
  return apiFetch<any>(`/slots/${slotId}`, {
    method: "DELETE",
  });
}

export async function adminSummary() {
  return apiFetch<any>("/admin/reports/summary");
}

export async function createAppointment(data: any) {
  return apiFetch<any>("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listMyAppointments(childId?: string) {
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<Array<any>>(`/appointments/my${qs}`);
}

export async function listDoctorAppointments() {
  return apiFetch<Array<any>>("/appointments/doctor");
}

export async function updateAppointmentStatus(id: string, status: string) {
  return apiFetch<any>(`/appointments/${id}/status?status=${status}`, { method: "PATCH" });
}

export async function listAssignments(params?: { doctor_id?: string; child_id?: string }) {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiFetch<Array<any>>(`/admin/assignments${qs}`);
}

export async function assignDoctor(payload: { doctor_id: string; child_id: string }) {
  return apiFetch<any>("/admin/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listNotifications() {
  return apiFetch<Array<any>>("/me/notifications");
}

export async function getProfile() {
  return apiFetch<any>("/me");
}

export async function updateProfile(payload: any) {
  return apiFetch<any>("/me", { method: "PUT", body: JSON.stringify(payload) });
}

export async function changePassword(payload: { current_password: string; new_password: string }) {
  return apiFetch<any>("/me/password", { method: "PUT", body: JSON.stringify(payload) });
}

export async function getSettings() {
  return apiFetch<any>("/me/settings");
}

export async function updateSettings(payload: any) {
  return apiFetch<any>("/me/settings", { method: "PUT", body: JSON.stringify(payload) });
}

export async function listPlans() {
  return apiFetch<Array<any>>("/billing/plans");
}

export async function getSubscription() {
  return apiFetch<any>("/billing/subscription");
}

export async function updateSubscription(plan_id: string) {
  return apiFetch<any>(`/billing/subscription?plan_id=${plan_id}`, { method: "POST" });
}

export async function listInvoices() {
  return apiFetch<Array<any>>("/billing/invoices");
}
