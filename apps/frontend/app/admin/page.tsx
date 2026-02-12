"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import {
  adminSummary,
  createSlot,
  deleteSlot,
  getAccessToken,
  getProfile,
  listDoctorAvailability,
  listDoctorAppointments,
  listDoctors,
  listSlots,
  updateSlot,
} from "@/lib/api";

const BUSINESS_START = 8;
const BUSINESS_END = 17;
const WEEK_DAYS = [
  { label: "T2", offset: 0 },
  { label: "T3", offset: 1 },
  { label: "T4", offset: 2 },
  { label: "T5", offset: 3 },
  { label: "T6", offset: 4 },
  { label: "T7", offset: 5 },
  { label: "CN", offset: 6 },
];

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  duration?: number | null;
  slot_type?: string | null;
  is_active: boolean;
};

type Doctor = {
  id: string;
  full_name: string;
  specialty?: string | null;
};

type Schedule = {
  id: string;
  doctor_id: string;
  slot_id: string;
  status: string;
  slot?: Slot | null;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  reason?: string | null;
  note?: string | null;
  doctor_id?: string | null;
  doctor_phone?: string | null;
};

type Summary = {
  users_total?: number;
  users_by_role?: Record<string, number>;
  doctor_status?: Record<string, number>;
  appointments?: Record<string, number>;
  slots_total?: number;
  schedules_total?: number;
};

const toISO = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
};

const isBusinessStart = (iso: string) => {
  const d = new Date(iso);
  const hour = d.getHours();
  return hour >= BUSINESS_START && hour < BUSINESS_END;
};

const isBusinessEnd = (iso: string) => {
  const d = new Date(iso);
  const hour = d.getHours();
  const minute = d.getMinutes();
  return hour < BUSINESS_END || (hour === BUSINESS_END && minute === 0);
};

const parseTimeParts = (value: string) => {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const getMonday = (d: Date) => {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const parseDateInput = (value: string) => {
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toDateKey = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const statusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "confirmed":
      return "Đã xác nhận";
    case "completed":
      return "Hoàn tất";
    case "cancelled":
      return "Đã hủy";
    case "no-show":
      return "Vắng mặt";
    default:
      return status;
  }
};

const statusStyle = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "confirmed":
      return "bg-sky-50 text-sky-700";
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "no-show":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function AdminPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary>({});
  const [slots, setSlots] = useState<Slot[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [doctorSchedules, setDoctorSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const [slotType, setSlotType] = useState("working");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkWeekStart, setBulkWeekStart] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("08:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [bulkInterval, setBulkInterval] = useState("30");
  const [bulkDays, setBulkDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [bulkActive, setBulkActive] = useState(true);
  const [bulkSlotType, setBulkSlotType] = useState("working");
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkWeeks, setBulkWeeks] = useState("1");
  const [weekStart, setWeekStart] = useState("");
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [apptDoctorFilter, setApptDoctorFilter] = useState("all");

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const profile = await getProfile();
        if (profile?.role !== "admin") {
          toast({ type: "error", description: "Chỉ admin mới truy cập được." });
          router.push("/home");
          return;
        }
        const [summaryData, slotRows, doctorRows, appointmentRows] = await Promise.all([
          adminSummary(),
          listSlots(!showAllSlots),
          listDoctors(),
          listDoctorAppointments(),
        ]);
        setSummary(summaryData || {});
        setSlots(Array.isArray(slotRows) ? slotRows : []);
        setDoctors(Array.isArray(doctorRows) ? doctorRows : []);
        if (Array.isArray(doctorRows) && doctorRows.length && !selectedDoctorId) {
          setSelectedDoctorId(doctorRows[0].id);
        }
        setAppointments(Array.isArray(appointmentRows) ? appointmentRows : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải dữ liệu admin";
        toast({ type: "error", description: message });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, showAllSlots]);

  useEffect(() => {
    if (!weekStart) {
      setWeekStart(toDateInput(getMonday(new Date())));
    }
  }, [weekStart]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorSchedules([]);
      return;
    }
    const loadSchedules = async () => {
      setIsLoadingSchedules(true);
      try {
        const rows = await listDoctorAvailability(selectedDoctorId);
        setDoctorSchedules(Array.isArray(rows) ? rows : []);
      } catch {
        setDoctorSchedules([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    };
    loadSchedules();
  }, [selectedDoctorId]);

  const slotsByActive = useMemo(() => {
    return slots.filter((s) => (showAllSlots ? true : s.is_active));
  }, [slots, showAllSlots]);

  const weekStartDate = useMemo(() => {
    const parsed = parseDateInput(weekStart);
    if (!parsed) return null;
    return getMonday(parsed);
  }, [weekStart]);

  const weekDates = useMemo(() => {
    if (!weekStartDate) return [];
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + idx);
      return d;
    });
  }, [weekStartDate]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    const filtered =
      apptDoctorFilter === "all"
        ? appointments
        : appointments.filter((appt) => appt.doctor_id === apptDoctorFilter);
    for (const appt of filtered) {
      const key = toDateKey(appt.scheduled_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(appt);
    }
    return map;
  }, [appointments]);

  const handleCreateSlot = async () => {
    const startIso = toISO(startTime);
    const endIso = toISO(endTime);
    if (!startIso || !endIso) {
      toast({ type: "error", description: "Vui lòng chọn thời gian bắt đầu/kết thúc." });
      return;
    }
    if (!isBusinessStart(startIso) || !isBusinessEnd(endIso)) {
      toast({ type: "error", description: "Khung giờ phải nằm trong giờ hành chính." });
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        start_time: startIso,
        end_time: endIso,
        slot_type: slotType || "working",
        is_active: isActive,
      };
      if (duration) payload.duration = Number(duration);
      await createSlot(payload);
      toast({ type: "success", description: "Đã tạo slot mới." });
      setStartTime("");
      setEndTime("");
      setDuration("");
      const slotRows = await listSlots(!showAllSlots);
      setSlots(Array.isArray(slotRows) ? slotRows : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tạo slot thất bại";
      toast({ type: "error", description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkWeekStart) {
      toast({ type: "error", description: "Vui lòng chọn ngày bắt đầu tuần." });
      return;
    }
    const startParts = parseTimeParts(bulkStartTime);
    const endParts = parseTimeParts(bulkEndTime);
    const intervalMin = Number(bulkInterval);
    if (!startParts || !endParts || !intervalMin || intervalMin <= 0) {
      toast({ type: "error", description: "Vui lòng nhập giờ bắt đầu/kết thúc và interval hợp lệ." });
      return;
    }
    const withinStart = startParts.h >= BUSINESS_START && startParts.h < BUSINESS_END;
    const withinEnd = endParts.h < BUSINESS_END || (endParts.h === BUSINESS_END && endParts.m === 0);
    if (!withinStart || !withinEnd) {
      toast({ type: "error", description: "Giờ phải nằm trong khung 08:00 - 17:00." });
      return;
    }
    const startTotal = startParts.h * 60 + startParts.m;
    const endTotal = endParts.h * 60 + endParts.m;
    if (endTotal <= startTotal) {
      toast({ type: "error", description: "Giờ kết thúc phải sau giờ bắt đầu." });
      return;
    }
    const selected = bulkDays.filter(Boolean).length;
    if (!selected) {
      toast({ type: "error", description: "Vui lòng chọn ít nhất một ngày trong tuần." });
      return;
    }

    const [y, m, d] = bulkWeekStart.split("-").map((v) => Number(v));
    if (!y || !m || !d) {
      toast({ type: "error", description: "Ngày bắt đầu tuần không hợp lệ." });
      return;
    }

    const weeksCount = Math.max(1, Math.min(12, Number(bulkWeeks) || 1));
    const payloads: Array<{ start_time: string; end_time: string; duration: number; slot_type: string; is_active: boolean }> = [];
    for (let w = 0; w < weeksCount; w += 1) {
      WEEK_DAYS.forEach((day, idx) => {
        if (!bulkDays[idx]) return;
        const base = new Date(y, m - 1, d + day.offset + w * 7);
        let current = new Date(base.getFullYear(), base.getMonth(), base.getDate(), startParts.h, startParts.m);
        const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), endParts.h, endParts.m);
        while (current < end) {
          const next = new Date(current.getTime() + intervalMin * 60000);
          if (next > end) break;
          payloads.push({
            start_time: current.toISOString(),
            end_time: next.toISOString(),
            duration: intervalMin,
            slot_type: bulkSlotType || "working",
            is_active: bulkActive,
          });
          current = next;
        }
      });
    }

    if (!payloads.length) {
      toast({ type: "error", description: "Không có slot nào được tạo từ cấu hình này." });
      return;
    }

    setIsBulkCreating(true);
    let success = 0;
    let failed = 0;
    try {
      for (const payload of payloads) {
        try {
          await createSlot(payload);
          success += 1;
        } catch {
          failed += 1;
        }
      }
      toast({
        type: failed ? "error" : "success",
        description: `Đã tạo ${success} slot${failed ? `, lỗi ${failed}` : ""}.`,
      });
      const slotRows = await listSlots(!showAllSlots);
      setSlots(Array.isArray(slotRows) ? slotRows : []);
    } finally {
      setIsBulkCreating(false);
    }
  };

  const refreshAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const rows = await listDoctorAppointments();
      setAppointments(Array.isArray(rows) ? rows : []);
    } catch {
      toast({ type: "error", description: "Không thể tải lịch hẹn." });
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const exportAppointmentsCsv = () => {
    const rows =
      apptDoctorFilter === "all"
        ? appointments
        : appointments.filter((appt) => appt.doctor_id === apptDoctorFilter);
    if (!rows.length) {
      toast({ type: "error", description: "Không có lịch hẹn để xuất." });
      return;
    }
    const headers = ["id", "scheduled_at", "status", "doctor_id", "reason"];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.scheduled_at,
          r.status,
          r.doctor_id || "",
          (r.reason || "").replaceAll("\"", "\"\""),
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicpt_appointments_${weekStart}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleToggleActive = async (slot: Slot) => {
    try {
      await updateSlot(slot.id, { is_active: !slot.is_active });
      const slotRows = await listSlots(!showAllSlots);
      setSlots(Array.isArray(slotRows) ? slotRows : []);
    } catch {
      toast({ type: "error", description: "Không thể cập nhật slot" });
    }
  };

  const handleDeactivate = async (slot: Slot) => {
    try {
      await deleteSlot(slot.id);
      const slotRows = await listSlots(!showAllSlots);
      setSlots(Array.isArray(slotRows) ? slotRows : []);
      toast({ type: "success", description: "Đã tắt slot." });
    } catch {
      toast({ type: "error", description: "Không thể tắt slot" });
    }
  };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
              <h1 className="text-2xl font-semibold text-slate-900">ClinicPT Dashboard</h1>
              <p className="text-sm text-slate-600">Theo dõi hệ thống và quản lý slot giờ hành chính.</p>
            </div>
            <Button variant="outline" onClick={() => router.push("/home")}>Về trang chọn</Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Users</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.users_total ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">
              Admin: {summary.users_by_role?.admin ?? 0} · Doctor: {summary.users_by_role?.doctor ?? 0} · User: {summary.users_by_role?.user ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Appointments</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summary.appointments?.pending ?? 0}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Pending: {summary.appointments?.pending ?? 0} · Confirmed: {summary.appointments?.confirmed ?? 0} · Completed: {summary.appointments?.completed ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Slots</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.slots_total ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">Schedules: {summary.schedules_total ?? 0}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1.6fr]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <h2 className="text-lg font-semibold text-slate-900">Tạo slot mới</h2>
              <p className="mt-1 text-xs text-slate-500">Giờ hành chính: 08:00 - 17:00.</p>
              <div className="mt-4 grid gap-4">
                <div>
                  <Label>Thời gian bắt đầu</Label>
                  <Input
                    className="mt-2"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Thời gian kết thúc</Label>
                  <Input
                    className="mt-2"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Thời lượng (phút)</Label>
                  <Input
                    className="mt-2"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ví dụ: 30"
                  />
                </div>
                <div>
                  <Label>Loại slot</Label>
                  <Input
                    className="mt-2"
                    value={slotType}
                    onChange={(e) => setSlotType(e.target.value)}
                    placeholder="working"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Kích hoạt ngay
                </label>
                <Button onClick={handleCreateSlot} disabled={isSaving}>
                  {isSaving ? "Đang tạo..." : "Tạo slot"}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <h2 className="text-lg font-semibold text-slate-900">Tạo slot theo tuần</h2>
              <p className="mt-1 text-xs text-slate-500">
                Chọn ngày bắt đầu tuần, khung giờ và interval để tạo hàng loạt.
              </p>
              <div className="mt-4 grid gap-4">
                <div>
                  <Label>Ngày bắt đầu tuần</Label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={bulkWeekStart}
                    onChange={(e) => setBulkWeekStart(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Giờ bắt đầu</Label>
                    <Input
                      className="mt-2"
                      type="time"
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Giờ kết thúc</Label>
                    <Input
                      className="mt-2"
                      type="time"
                      value={bulkEndTime}
                      onChange={(e) => setBulkEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Interval (phút)</Label>
                  <Input
                    className="mt-2"
                    value={bulkInterval}
                    onChange={(e) => setBulkInterval(e.target.value)}
                    placeholder="Ví dụ: 30"
                  />
                </div>
                <div>
                  <Label>Chọn ngày trong tuần</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day, idx) => (
                      <label
                        key={day.label}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          bulkDays[idx]
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={bulkDays[idx]}
                          onChange={(e) => {
                            const next = [...bulkDays];
                            next[idx] = e.target.checked;
                            setBulkDays(next);
                          }}
                          className="hidden"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Số tuần tạo</Label>
                  <Input
                    className="mt-2"
                    value={bulkWeeks}
                    onChange={(e) => setBulkWeeks(e.target.value)}
                    placeholder="Ví dụ: 2"
                  />
                  <p className="mt-1 text-xs text-slate-500">Tối đa 12 tuần.</p>
                </div>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkStartTime("08:00");
                      setBulkEndTime("17:00");
                      setBulkInterval("30");
                      setBulkDays([true, true, true, true, true, false, false]);
                    }}
                  >
                    Template giờ hành chính (08:00-17:00 / 30')
                  </Button>
                  <p className="text-xs text-slate-500">
                    Tự động cấu hình khung giờ hành chính, T2-T6.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Loại slot</Label>
                    <Input
                      className="mt-2"
                      value={bulkSlotType}
                      onChange={(e) => setBulkSlotType(e.target.value)}
                      placeholder="working"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={bulkActive}
                      onChange={(e) => setBulkActive(e.target.checked)}
                    />
                    Kích hoạt ngay
                  </label>
                </div>
                <Button onClick={handleBulkCreate} disabled={isBulkCreating}>
                  {isBulkCreating ? "Đang tạo..." : "Tạo hàng loạt"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Danh sách slot</h2>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showAllSlots}
                  onChange={(e) => setShowAllSlots(e.target.checked)}
                />
                Hiển thị cả slot đã tắt
              </label>
            </div>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-sky-100">
              <table className="w-full text-sm">
                <thead className="bg-sky-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">Thời gian</th>
                    <th className="p-3 text-left">Loại</th>
                    <th className="p-3 text-left">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsByActive.map((slot) => (
                    <tr key={slot.id} className="border-t border-sky-100">
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">
                          {fmtDateTime(slot.start_time)} - {fmtDateTime(slot.end_time)}
                        </div>
                        <div className="text-xs text-slate-500">{slot.duration ? `${slot.duration} phút` : ""}</div>
                      </td>
                      <td className="p-3 text-slate-600">{slot.slot_type || "working"}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${slot.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {slot.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(slot)}
                          >
                            {slot.is_active ? "Tắt" : "Bật"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(slot)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {slotsByActive.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-sm text-slate-500" colSpan={4}>
                        Chưa có slot nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Lịch khả dụng theo bác sĩ</h2>
            </div>
            <div className="mt-4">
              <Label>Bác sĩ</Label>
              <select
                className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} {doc.specialty ? `· ${doc.specialty}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-sky-100">
              {isLoadingSchedules ? (
                <div className="p-4 text-sm text-slate-500">Đang tải...</div>
              ) : doctorSchedules.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Chưa có slot khả dụng.</div>
              ) : (
                <ul className="divide-y divide-sky-100 text-sm">
                  {doctorSchedules.map((s) => (
                    <li key={s.id} className="p-3">
                      <p className="font-semibold text-slate-800">
                        {fmtDateTime(s.slot?.start_time || "")} - {fmtDateTime(s.slot?.end_time || "")}
                      </p>
                      <p className="text-xs text-slate-500">Status: {s.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lịch hẹn theo tuần</h2>
                <p className="text-xs text-slate-500">Theo dõi lịch hẹn toàn hệ thống.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-xl border border-sky-100 bg-white px-3 text-sm"
                  value={apptDoctorFilter}
                  onChange={(e) => setApptDoctorFilter(e.target.value)}
                >
                  <option value="all">Tất cả bác sĩ</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  className="w-[160px]"
                  value={weekStart}
                  onChange={(e) => {
                    const parsed = parseDateInput(e.target.value);
                    if (parsed) {
                      setWeekStart(toDateInput(getMonday(parsed)));
                    } else {
                      setWeekStart(e.target.value);
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={refreshAppointments}>
                  Làm mới
                </Button>
                <Button variant="outline" size="sm" onClick={exportAppointmentsCsv}>
                  Xuất lịch (CSV)
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-3">
              {weekDates.map((date) => {
                const key = toDateKey(date.toISOString());
                const items = appointmentsByDate.get(key) || [];
                return (
                  <div key={key} className="rounded-2xl border border-sky-100 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      {date.toLocaleDateString("vi-VN", { weekday: "short" })} · {pad2(date.getDate())}/{pad2(date.getMonth() + 1)}
                    </p>
                    <div className="mt-2 space-y-2">
                      {isLoadingAppointments ? (
                        <p className="text-xs text-slate-400">Đang tải...</p>
                      ) : items.length === 0 ? (
                        <p className="text-xs text-slate-400">Không có lịch</p>
                      ) : (
                        items.map((appt) => (
                          <div key={appt.id} className="rounded-xl border border-sky-100 bg-sky-50 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700">
                                {fmtDateTime(appt.scheduled_at).split(" ").pop()}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusStyle(appt.status)}`}>
                                {statusLabel(appt.status)}
                              </span>
                            </div>
                            {appt.reason ? (
                              <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                                {appt.reason}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
