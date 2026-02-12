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
  if (USE_MOCK) {
    localStorage.removeItem(MOCK_PROFILE_KEY);
  }
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
type MockProfile = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "doctor" | "user";
  doctor_id?: string;
  two_factor_enabled?: boolean;
};
type MockDoctor = { id: string; full_name: string; specialty?: string | null; phone?: string | null };
type MockSlot = {
  id: string;
  start_time: string;
  end_time: string;
  duration?: number | null;
  slot_type?: string | null;
  is_active: boolean;
};
type MockSchedule = { id: string; doctor_id: string; slot_id: string; status: string };
type MockAppointment = {
  id: string;
  scheduled_at: string;
  status: string;
  reason?: string | null;
  note?: string | null;
  doctor_id?: string | null;
  doctor_phone?: string | null;
  child_id?: string | null;
};
type MockNotification = { id: string; title: string; body?: string | null; created_at?: string | null };

const MOCK_CHILDREN_KEY = "medgpt_mock_children";
const MOCK_INTAKE_KEY = "medgpt_mock_intake";
const MOCK_PROFILE_KEY = "medgpt_mock_profile";
const MOCK_DOCTORS_KEY = "medgpt_mock_doctors";
const MOCK_SLOTS_KEY = "medgpt_mock_slots";
const MOCK_SCHEDULES_KEY = "medgpt_mock_schedules";
const MOCK_APPOINTMENTS_KEY = "medgpt_mock_appointments";
const MOCK_NOTIFICATIONS_KEY = "medgpt_mock_notifications";

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

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

const resolveRole = (email?: string) => {
  const v = (email || "").toLowerCase();
  if (v.includes("admin")) return "admin";
  if (v.includes("doctor")) return "doctor";
  return "user";
};

const ensureMockSeeds = () => {
  if (typeof window === "undefined") return;

  const children = mockListChildren();
  if (!children.length) {
    mockSaveChildren([
      { id: "child-1", full_name: "Bé An", birth_date: "2020-05-12", gender: "Nam" },
    ]);
  }

  const doctors = loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
  if (!doctors.length) {
    saveMock(MOCK_DOCTORS_KEY, [
      { id: "doc-1", full_name: "BS. Minh Nguyen", specialty: "Nhi khoa", phone: "0901 234 567" },
      { id: "doc-2", full_name: "BS. Thao Le", specialty: "Hien nhi", phone: "0908 765 432" },
      { id: "doc-3", full_name: "BS. Hai Tran", specialty: "Dinh duong", phone: "0912 111 222" },
    ]);
  }

  const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
  if (!slots.length) {
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    const seedSlots: MockSlot[] = [];
    const hourPairs = [
      [9, 10],
      [10, 11],
      [14, 15],
      [15, 16],
    ];
    for (let day = 0; day < 5; day += 1) {
      const base = new Date(now);
      base.setDate(base.getDate() + day);
      for (const [startH, endH] of hourPairs) {
        const start = new Date(base);
        start.setHours(startH, 0, 0, 0);
        const end = new Date(base);
        end.setHours(endH, 0, 0, 0);
        seedSlots.push({
          id: makeId("slot"),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          duration: 60,
          slot_type: "working",
          is_active: true,
        });
      }
    }
    saveMock(MOCK_SLOTS_KEY, seedSlots);
  }

  const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
  if (!schedules.length) {
    const seededDoctors = loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
    const seededSlots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const seedSchedules: MockSchedule[] = [];
    for (const doc of seededDoctors) {
      for (const slot of seededSlots) {
        seedSchedules.push({
          id: makeId("schedule"),
          doctor_id: doc.id,
          slot_id: slot.id,
          status: "available",
        });
      }
    }
    saveMock(MOCK_SCHEDULES_KEY, seedSchedules);
  }

  const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
  if (!appointments.length) {
    const seededDoctors = loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
    const seededSlots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const firstSlot = seededSlots[0];
    const firstDoctor = seededDoctors[0];
    if (firstSlot && firstDoctor) {
      saveMock(MOCK_APPOINTMENTS_KEY, [
        {
          id: makeId("appt"),
          scheduled_at: firstSlot.start_time,
          status: "confirmed",
          reason: "Kiem tra suc khoe dinh ky",
          doctor_id: firstDoctor.id,
          doctor_phone: firstDoctor.phone || "",
          child_id: "child-1",
        },
      ]);
    }
  }

  const notifications = loadMock<MockNotification[]>(MOCK_NOTIFICATIONS_KEY, []);
  if (!notifications.length) {
    saveMock(MOCK_NOTIFICATIONS_KEY, [
      {
        id: makeId("noti"),
        title: "Lich hen moi",
        body: "Ban da dat lich kham thanh cong. Vui long den truoc 10 phut.",
        created_at: new Date().toISOString(),
      },
    ]);
  }
};

const getMockProfile = (): MockProfile => {
  ensureMockSeeds();
  const existing = loadMock<MockProfile | null>(MOCK_PROFILE_KEY, null);
  if (existing) return existing;
  const defaultProfile: MockProfile = {
    id: "mock-user",
    email: "user@example.com",
    full_name: "Demo User",
    role: "user",
    two_factor_enabled: false,
  };
  saveMock(MOCK_PROFILE_KEY, defaultProfile);
  return defaultProfile;
};

const setMockProfile = (profile: MockProfile) => {
  if (typeof window === "undefined") return;
  saveMock(MOCK_PROFILE_KEY, profile);
};

export async function loginEmail(email: string, password: string, code?: string) {
  if (USE_MOCK) {
    const role = resolveRole(email);
    const profile: MockProfile = {
      id: `mock-${role}`,
      email,
      full_name: role === "admin" ? "Admin Demo" : role === "doctor" ? "Bac si Demo" : "User Demo",
      role,
      two_factor_enabled: false,
      doctor_id: role === "doctor" ? "doc-1" : undefined,
    };
    setMockProfile(profile);
    const payload = {
      access_token: `mock-${role}-token`,
      refresh_token: `mock-${role}-refresh`,
    };
    setTokens(payload);
    return payload;
  }
  const payload = await apiFetch<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, code }),
  });
  setTokens(payload);
  return payload;
}

export async function signupEmail(email: string, full_name: string, password: string) {
  if (USE_MOCK) {
    const role = resolveRole(email);
    const profile: MockProfile = {
      id: `mock-${role}`,
      email,
      full_name: full_name || "User Demo",
      role,
      two_factor_enabled: false,
      doctor_id: role === "doctor" ? "doc-1" : undefined,
    };
    setMockProfile(profile);
    const payload = {
      access_token: `mock-${role}-token`,
      refresh_token: `mock-${role}-refresh`,
    };
    setTokens(payload);
    return payload;
  }
  await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, full_name, password }),
  });
  return loginEmail(email, password);
}

export async function oauthLogin(provider: "google" | "facebook", payload: { id_token?: string; access_token?: string; email?: string; full_name?: string }) {
  if (USE_MOCK) {
    const role = resolveRole(payload.email);
    const profile: MockProfile = {
      id: `mock-${role}`,
      email: payload.email || `${provider}@mock.local`,
      full_name: payload.full_name || "Demo User",
      role,
      two_factor_enabled: false,
      doctor_id: role === "doctor" ? "doc-1" : undefined,
    };
    setMockProfile(profile);
    const res = {
      access_token: `mock-${role}-token`,
      refresh_token: `mock-${role}-refresh`,
    };
    setTokens(res);
    return res;
  }
  const res = await apiFetch<AuthTokens>(`/auth/oauth/${provider}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setTokens(res);
  return res;
}

export async function getMe() {
  if (USE_MOCK) {
    const profile = getMockProfile();
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      two_factor_enabled: profile.two_factor_enabled ?? false,
    };
  }
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
  if (USE_MOCK) {
    ensureMockSeeds();
    return loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
  }
  return apiFetch<Array<any>>("/doctors");
}

export async function listDoctorAvailability(doctorId: string) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const slotMap = new Map(slots.map((s) => [s.id, s]));
    return schedules
      .filter((s) => s.doctor_id === doctorId)
      .map((s) => ({ ...s, slot: slotMap.get(s.slot_id) || null }));
  }
  return apiFetch<Array<any>>(`/schedules/doctor/${doctorId}`);
}

export async function listMySchedules() {
  if (USE_MOCK) {
    ensureMockSeeds();
    const profile = getMockProfile();
    if (profile.role !== "doctor") return [];
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    return schedules.filter((s) => s.doctor_id === profile.doctor_id);
  }
  return apiFetch<Array<any>>("/schedules/my");
}

export async function updateScheduleStatus(scheduleId: string, status: string) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    const next = schedules.map((s) => (s.id === scheduleId ? { ...s, status } : s));
    saveMock(MOCK_SCHEDULES_KEY, next);
    return next.find((s) => s.id === scheduleId);
  }
  return apiFetch<any>(`/schedules/${scheduleId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function listSlots(activeOnly = true) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    return activeOnly ? slots.filter((s) => s.is_active) : slots;
  }
  const qs = `?active_only=${activeOnly ? "true" : "false"}`;
  return apiFetch<Array<any>>(`/slots${qs}`);
}

export async function createSlot(payload: any) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const slot: MockSlot = {
      id: makeId("slot"),
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration: payload.duration ?? null,
      slot_type: payload.slot_type ?? "working",
      is_active: payload.is_active ?? true,
    };
    const nextSlots = [slot, ...slots];
    saveMock(MOCK_SLOTS_KEY, nextSlots);

    const doctors = loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    const newSchedules = doctors.map((doc) => ({
      id: makeId("schedule"),
      doctor_id: doc.id,
      slot_id: slot.id,
      status: "available",
    }));
    saveMock(MOCK_SCHEDULES_KEY, [...newSchedules, ...schedules]);
    return slot;
  }
  return apiFetch<any>("/slots", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSlot(slotId: string, payload: any) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const next = slots.map((s) => (s.id === slotId ? { ...s, ...payload } : s));
    saveMock(MOCK_SLOTS_KEY, next);
    return next.find((s) => s.id === slotId);
  }
  return apiFetch<any>(`/slots/${slotId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteSlot(slotId: string) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const nextSlots = slots.filter((s) => s.id !== slotId);
    saveMock(MOCK_SLOTS_KEY, nextSlots);
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    const nextSchedules = schedules.filter((s) => s.slot_id !== slotId);
    saveMock(MOCK_SCHEDULES_KEY, nextSchedules);
    return { ok: true };
  }
  return apiFetch<any>(`/slots/${slotId}`, {
    method: "DELETE",
  });
}

export async function adminSummary() {
  if (USE_MOCK) {
    ensureMockSeeds();
    const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
    return {
      users_total: 3,
      users_by_role: { admin: 1, doctor: 1, user: 1 },
      doctor_status: { active: 3 },
      appointments: {
        pending: appointments.filter((a) => a.status === "pending").length,
        confirmed: appointments.filter((a) => a.status === "confirmed").length,
        completed: appointments.filter((a) => a.status === "completed").length,
      },
      slots_total: loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []).length,
      schedules_total: loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []).length,
    };
  }
  return apiFetch<any>("/admin/reports/summary");
}

export async function createAppointment(data: any) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
    const doctors = loadMock<MockDoctor[]>(MOCK_DOCTORS_KEY, []);
    const schedules = loadMock<MockSchedule[]>(MOCK_SCHEDULES_KEY, []);
    const slots = loadMock<MockSlot[]>(MOCK_SLOTS_KEY, []);
    const schedule = schedules.find((s) => s.id === data.slot_id || s.slot_id === data.slot_id);
    const slot = slots.find((s) => s.id === (schedule?.slot_id || data.slot_id));
    const doctor = doctors.find((d) => d.id === data.doctor_id);
    const appt: MockAppointment = {
      id: makeId("appt"),
      scheduled_at: slot?.start_time || new Date().toISOString(),
      status: "pending",
      reason: data.reason || null,
      note: data.note || null,
      doctor_id: data.doctor_id,
      doctor_phone: doctor?.phone || null,
      child_id: data.child_id || null,
    };
    const next = [appt, ...appointments];
    saveMock(MOCK_APPOINTMENTS_KEY, next);
    return appt;
  }
  return apiFetch<any>("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listMyAppointments(childId?: string) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
    return childId ? appointments.filter((a) => a.child_id === childId) : appointments;
  }
  const qs = childId ? `?child_id=${childId}` : "";
  return apiFetch<Array<any>>(`/appointments/my${qs}`);
}

export async function listDoctorAppointments() {
  if (USE_MOCK) {
    ensureMockSeeds();
    const profile = getMockProfile();
    const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
    if (profile.role === "doctor") {
      return appointments.filter((a) => a.doctor_id === profile.doctor_id);
    }
    return appointments;
  }
  return apiFetch<Array<any>>("/appointments/doctor");
}

export async function updateAppointmentStatus(id: string, status: string) {
  if (USE_MOCK) {
    ensureMockSeeds();
    const appointments = loadMock<MockAppointment[]>(MOCK_APPOINTMENTS_KEY, []);
    const next = appointments.map((a) => (a.id === id ? { ...a, status } : a));
    saveMock(MOCK_APPOINTMENTS_KEY, next);
    return next.find((a) => a.id === id);
  }
  return apiFetch<any>(`/appointments/${id}/status?status=${status}`, { method: "PATCH" });
}

export async function listAssignments(params?: { doctor_id?: string; child_id?: string }) {
  if (USE_MOCK) {
    return [];
  }
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return apiFetch<Array<any>>(`/admin/assignments${qs}`);
}

export async function assignDoctor(payload: { doctor_id: string; child_id: string }) {
  if (USE_MOCK) {
    return { ok: true };
  }
  return apiFetch<any>("/admin/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listNotifications() {
  if (USE_MOCK) {
    ensureMockSeeds();
    return loadMock<MockNotification[]>(MOCK_NOTIFICATIONS_KEY, []);
  }
  return apiFetch<Array<any>>("/me/notifications");
}

export async function getProfile() {
  if (USE_MOCK) {
    return getMockProfile();
  }
  return apiFetch<any>("/me");
}

export async function updateProfile(payload: any) {
  if (USE_MOCK) {
    const profile = getMockProfile();
    const next = { ...profile, ...payload };
    setMockProfile(next);
    return next;
  }
  return apiFetch<any>("/me", { method: "PUT", body: JSON.stringify(payload) });
}

export async function changePassword(payload: { current_password: string; new_password: string }) {
  if (USE_MOCK) {
    return { ok: true };
  }
  return apiFetch<any>("/me/password", { method: "PUT", body: JSON.stringify(payload) });
}

export async function getSettings() {
  if (USE_MOCK) {
    return { notifications: true, language: "vi" };
  }
  return apiFetch<any>("/me/settings");
}

export async function updateSettings(payload: any) {
  if (USE_MOCK) {
    return payload;
  }
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
