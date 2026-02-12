"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import {
  getAccessToken,
  getProfile,
  listDoctorAppointments,
  listMySchedules,
  listSlots,
  updateAppointmentStatus,
  updateScheduleStatus,
} from "@/lib/api";

const BUSINESS_START = 8;
const BUSINESS_END = 17;

const pad2 = (n: number) => String(n).padStart(2, "0");

const toDateKey = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const getMonday = (d: Date) => {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDateInput = (value: string) => {
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
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

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  duration?: number | null;
  is_active: boolean;
};

type Schedule = {
  id: string;
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
  doctor_phone?: string | null;
};

export default function DoctorPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [weekStart, setWeekStart] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const profile = await getProfile();
        if (profile?.role !== "doctor") {
          toast({ type: "error", description: "Chỉ bác sĩ mới truy cập được." });
          router.push("/home");
          return;
        }
        const [apptRows, scheduleRows, slotRows] = await Promise.all([
          listDoctorAppointments(),
          listMySchedules(),
          listSlots(false),
        ]);
        const slotMap = new Map((slotRows || []).map((s: Slot) => [s.id, s]));
        const enriched = (scheduleRows || []).map((s: Schedule) => ({
          ...s,
          slot: slotMap.get(s.slot_id) || null,
        }));
        setAppointments(Array.isArray(apptRows) ? apptRows : []);
        setSchedules(enriched);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải dữ liệu bác sĩ";
        toast({ type: "error", description: message });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!weekStart) {
      setWeekStart(toDateInput(getMonday(new Date())));
    }
  }, [weekStart]);

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

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of schedules) {
      if (!s.slot?.start_time) continue;
      const key = toDateKey(s.slot.start_time);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(s);
    }
    return map;
  }, [schedules]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const appointmentSummary = useMemo(() => {
    const summary = { pending: 0, confirmed: 0, completed: 0 };
    appointments.forEach((a) => {
      if (a.status === "pending") summary.pending += 1;
      if (a.status === "confirmed") summary.confirmed += 1;
      if (a.status === "completed") summary.completed += 1;
    });
    return summary;
  }, [appointments]);

  const refreshSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const [scheduleRows, slotRows] = await Promise.all([listMySchedules(), listSlots(false)]);
      const slotMap = new Map((slotRows || []).map((s: Slot) => [s.id, s]));
      const enriched = (scheduleRows || []).map((s: Schedule) => ({
        ...s,
        slot: slotMap.get(s.slot_id) || null,
      }));
      setSchedules(enriched);
    } catch {
      toast({ type: "error", description: "Không thể tải lịch làm việc." });
    } finally {
      setIsLoadingSchedules(false);
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

  const handleUpdateAppointment = async (id: string, status: string) => {
    try {
      await updateAppointmentStatus(id, status);
      await refreshAppointments();
    } catch {
      toast({ type: "error", description: "Không thể cập nhật lịch hẹn." });
    }
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    if (!schedule.slot?.start_time || !schedule.slot?.end_time) return;
    if (schedule.status === "booked") {
      toast({ type: "error", description: "Slot đã được đặt, không thể thay đổi." });
      return;
    }
    const nextStatus = schedule.status === "available" ? "unavailable" : "available";
    try {
      await updateScheduleStatus(schedule.id, nextStatus);
      await refreshSchedules();
    } catch {
      toast({ type: "error", description: "Không thể cập nhật slot." });
    }
  };

  if (isLoading) {
    return <div className="flex min-h-dvh items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Doctor</p>
              <h1 className="text-2xl font-semibold text-slate-900">ClinicPT • Trang bác sĩ</h1>
              <p className="text-sm text-slate-600">Quản lý lịch làm việc và lịch hẹn của bạn.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/home")}>Về trang chọn</Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{appointmentSummary.pending}</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Confirmed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{appointmentSummary.confirmed}</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{appointmentSummary.completed}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1.1fr]">
          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lịch làm việc theo tuần</h2>
                <p className="text-xs text-slate-500">Bấm vào slot để bật/tắt (trừ slot đã đặt).</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="w-[160px]"
                  value={weekStart}
                  onChange={(e) => {
                    const parsed = parseDateInput(e.target.value);
                    if (parsed) {
                      setWeekStart(toDateInput(getMonday(parsed)));
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={refreshSchedules}>
                  Làm mới
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-3">
              {weekDates.map((date) => {
                const key = toDateKey(date.toISOString());
                const items = schedulesByDate.get(key) || [];
                return (
                  <div key={key} className="rounded-2xl border border-sky-100 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      {date.toLocaleDateString("vi-VN", { weekday: "short" })} · {pad2(date.getDate())}/{pad2(date.getMonth() + 1)}
                    </p>
                    <div className="mt-2 space-y-2">
                      {isLoadingSchedules ? (
                        <p className="text-xs text-slate-400">Đang tải...</p>
                      ) : items.length === 0 ? (
                        <p className="text-xs text-slate-400">Không có slot</p>
                      ) : (
                        items.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleToggleSchedule(slot)}
                            className={`w-full rounded-xl border px-2 py-1 text-left text-[11px] transition ${
                              slot.status === "available"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : slot.status === "booked"
                                  ? "border-sky-200 bg-sky-50 text-sky-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {fmtTime(slot.slot?.start_time || "")} - {fmtTime(slot.slot?.end_time || "")}
                              </span>
                              <span className="text-[10px]">{slot.status}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">Giờ hành chính: {BUSINESS_START}:00 - {BUSINESS_END}:00.</p>
          </div>

          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lịch hẹn</h2>
                <p className="text-xs text-slate-500">Lọc theo trạng thái và xử lý nhanh.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-xl border border-sky-100 bg-white px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                <Button variant="outline" size="sm" onClick={refreshAppointments}>
                  Làm mới
                </Button>
              </div>
            </div>

            <div className="mt-4 max-h-[520px] overflow-y-auto rounded-2xl border border-sky-100">
              {isLoadingAppointments ? (
                <div className="p-4 text-sm text-slate-500">Đang tải...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Chưa có lịch hẹn.</div>
              ) : (
                <ul className="divide-y divide-sky-100">
                  {filteredAppointments.map((appt) => (
                    <li key={appt.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{fmtDateTime(appt.scheduled_at)}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] ${statusStyle(appt.status)}`}>
                          {statusLabel(appt.status)}
                        </span>
                      </div>
                      {appt.reason ? <p className="mt-1 text-xs text-slate-500">{appt.reason}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {appt.status === "pending" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateAppointment(appt.id, "confirmed")}>
                              Xác nhận
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateAppointment(appt.id, "cancelled")}>
                              Hủy
                            </Button>
                          </>
                        ) : null}
                        {appt.status === "confirmed" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateAppointment(appt.id, "completed")}>
                              Hoàn tất
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateAppointment(appt.id, "cancelled")}>
                              Hủy
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
