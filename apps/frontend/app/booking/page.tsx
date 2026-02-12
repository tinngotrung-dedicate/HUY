"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/toast";
import {
  createAppointment,
  getAccessToken,
  listChildren,
  listDoctorAvailability,
  listDoctors,
  listMyAppointments,
  listNotifications,
} from "@/lib/api";

type Child = {
  id: string;
  full_name: string;
  birth_date?: string | null;
  gender?: string | null;
};

type Doctor = {
  id: string;
  full_name: string;
  specialty?: string | null;
  hospital?: string | null;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  duration?: number | null;
};

type Schedule = {
  id: string;
  doctor_id: string;
  slot_id: string;
  status: string;
  slot?: Slot | null;
};

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  created_at?: string;
  sent_at?: string | null;
  read?: boolean;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  reason?: string | null;
  note?: string | null;
  doctor_phone?: string | null;
};

const BUSINESS_START = 8;
const BUSINESS_END = 17;

const pad2 = (n: number) => String(n).padStart(2, "0");

const toDateKey = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toDateKeyFromDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDateKey = (value: string) => {
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
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

const isBusinessSlot = (slot?: Slot | null) => {
  if (!slot?.start_time || !slot?.end_time) return false;
  return isBusinessStart(slot.start_time) && isBusinessEnd(slot.end_time);
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

export default function BookingPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [temperature, setTemperature] = useState("");
  const [severity, setSeverity] = useState("Vừa");
  const [note, setNote] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const [childRows, doctorRows, noticeRows] = await Promise.all([
          listChildren(),
          listDoctors(),
          listNotifications().catch(() => []),
        ]);
        setChildren(childRows || []);
        setDoctors(doctorRows || []);
        setNotifications(noticeRows || []);
        if (childRows?.length) setSelectedChildId(childRows[0].id);
        if (doctorRows?.length) setSelectedDoctorId(doctorRows[0].id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải dữ liệu";
        toast({ type: "error", description: message });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!calendarMonth) {
      setCalendarMonth(new Date());
    }
  }, [calendarMonth]);

  useEffect(() => {
    if (!selectedDoctorId) {
      setSchedules([]);
      return;
    }
    const loadSchedules = async () => {
      try {
        const data = await listDoctorAvailability(selectedDoctorId);
        setSchedules(Array.isArray(data) ? data : []);
      } catch (error) {
        setSchedules([]);
      }
    };
    loadSchedules();
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!selectedChildId) {
      setAppointments([]);
      return;
    }
    const loadAppointments = async () => {
      setIsLoadingAppointments(true);
      try {
        const rows = await listMyAppointments(selectedChildId);
        setAppointments(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setAppointments([]);
      } finally {
        setIsLoadingAppointments(false);
      }
    };
    loadAppointments();
  }, [selectedChildId]);

  const availableSchedules = useMemo(() => {
    return schedules.filter((s) => isBusinessSlot(s.slot));
  }, [schedules]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of availableSchedules) {
      if (s.slot?.start_time) set.add(toDateKey(s.slot.start_time));
    }
    return Array.from(set).sort();
  }, [availableSchedules]);

  useEffect(() => {
    if (!availableDates.length) {
      setSelectedDate("");
      setSelectedScheduleId("");
      return;
    }
    if (!selectedDate || !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
      setSelectedScheduleId("");
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      const parsed = parseDateKey(selectedDate);
      if (parsed) {
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
      return;
    }
    if (availableDates.length) {
      const parsed = parseDateKey(availableDates[0]);
      if (parsed) {
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [selectedDate, availableDates]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return availableSchedules.filter((s) => toDateKey(s.slot?.start_time || "") === selectedDate);
  }, [availableSchedules, selectedDate]);

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  const calendarCells = useMemo(() => {
    if (!calendarMonth) return [];
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < 42; i += 1) {
      const dayNum = i - startOffset + 1;
      if (dayNum <= 0 || dayNum > daysInMonth) {
        cells.push(null);
      } else {
        cells.push(dayNum);
      }
    }
    return cells;
  }, [calendarMonth]);

  const handleBook = async () => {
    if (!selectedChildId) {
      toast({ type: "error", description: "Vui lòng chọn hồ sơ trẻ." });
      return;
    }
    if (!selectedDoctorId) {
      toast({ type: "error", description: "Vui lòng chọn bác sĩ." });
      return;
    }
    const schedule = slotsForDate.find((s) => s.id === selectedScheduleId);
    if (!schedule) {
      toast({ type: "error", description: "Vui lòng chọn khung giờ hợp lệ." });
      return;
    }
    if (!isBusinessSlot(schedule.slot)) {
      toast({ type: "error", description: "Khung giờ phải nằm trong giờ hành chính." });
      return;
    }

    const reasonParts = [
      symptoms ? `Triệu chứng: ${symptoms}` : "",
      duration ? `Thời gian: ${duration}` : "",
      temperature ? `Nhiệt độ: ${temperature}` : "",
      severity ? `Mức độ: ${severity}` : "",
    ].filter(Boolean);

    setIsBooking(true);
    try {
      await createAppointment({
        doctor_id: selectedDoctorId,
        child_id: selectedChildId,
        slot_id: schedule.slot_id,
        reason: reasonParts.join(" | "),
        note: note || null,
      });
      toast({ type: "success", description: "Đã gửi yêu cầu đặt lịch." });
      setNote("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đặt lịch thất bại";
      toast({ type: "error", description: message });
    } finally {
      setIsBooking(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      const data = await listNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      toast({ type: "error", description: "Không thể tải thông báo." });
    }
  };

  const refreshAppointments = async () => {
    if (!selectedChildId) return;
    setIsLoadingAppointments(true);
    try {
      const rows = await listMyAppointments(selectedChildId);
      setAppointments(Array.isArray(rows) ? rows : []);
    } catch {
      toast({ type: "error", description: "Không thể tải lịch hẹn." });
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-dvh items-center justify-center">Đang tải...</div>;
  }

  if (!calendarMonth) {
    return <div className="flex min-h-dvh items-center justify-center">Đang tải...</div>;
  }

  const monthLabel = calendarMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Booking</p>
              <h1 className="text-2xl font-semibold text-slate-900">Đặt lịch khám</h1>
              <p className="text-sm text-slate-600">
                Chọn hồ sơ trẻ, bác sĩ và khung giờ trong giờ hành chính.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/chat")}>
                Vào chat
              </Button>
              <Button variant="outline" onClick={() => router.push("/intake")}>
                Hồ sơ trẻ
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <h2 className="text-lg font-semibold text-slate-900">Thông tin đặt lịch</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Hồ sơ trẻ</Label>
                  <select
                    className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm"
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                  >
                    <option value="">-- Chọn hồ sơ --</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.full_name || "Trẻ chưa đặt tên"}
                      </option>
                    ))}
                  </select>
                  {!children.length && (
                    <p className="mt-2 text-xs text-slate-500">
                      Chưa có hồ sơ trẻ. Vui lòng tạo ở mục Hồ sơ trẻ.
                    </p>
                  )}
                </div>
                <div>
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
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Ngày khám</Label>
                  <select
                    className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    <option value="">-- Chọn ngày --</option>
                    {availableDates.map((date) => (
                      <option key={date} value={date}>
                        {fmtDate(date)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Khung giờ (giờ hành chính)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slotsForDate.length === 0 && (
                      <span className="text-xs text-slate-500">Chưa có slot phù hợp.</span>
                    )}
                    {slotsForDate.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedScheduleId(s.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          selectedScheduleId === s.id
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
                        }`}
                      >
                        {fmtTime(s.slot?.start_time || "")} - {fmtTime(s.slot?.end_time || "")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-full border border-sky-100 px-3 py-1 text-xs text-slate-600 hover:border-sky-300"
                    onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}
                  >
                    Tháng trước
                  </button>
                  <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
                  <button
                    type="button"
                    className="rounded-full border border-sky-100 px-3 py-1 text-xs text-slate-600 hover:border-sky-300"
                    onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}
                  >
                    Tháng sau
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] text-slate-400">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                    <div key={label}>{label}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendarCells.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="h-9" />;
                    }
                    const dateKey = toDateKeyFromDate(
                      new Date(calendarYear, calendarMonthIndex, day)
                    );
                    const isAvailable = availableDateSet.has(dateKey);
                    const isSelected = selectedDate === dateKey;
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) return;
                          setSelectedDate(dateKey);
                          setSelectedScheduleId("");
                        }}
                        className={`h-9 rounded-lg border text-xs transition ${
                          isSelected
                            ? "border-sky-500 bg-sky-500 text-white"
                            : isAvailable
                              ? "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
                              : "border-transparent bg-slate-50 text-slate-300"
                        }`}
                        disabled={!isAvailable}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Chỉ ngày có slot hợp lệ mới bấm được.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <h3 className="text-base font-semibold text-slate-900">Tình trạng lâm sàng cơ bản</h3>
              <p className="mt-1 text-xs text-slate-500">
                Thông tin ngắn gọn giúp bác sĩ nắm nhanh tình trạng hiện tại.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Triệu chứng chính</Label>
                  <Input
                    className="mt-2"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Sốt, ho, đau họng..."
                  />
                </div>
                <div>
                  <Label>Thời gian xuất hiện</Label>
                  <Input
                    className="mt-2"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ví dụ: 2 ngày"
                  />
                </div>
                <div>
                  <Label>Nhiệt độ (nếu có)</Label>
                  <Input
                    className="mt-2"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="Ví dụ: 38.5°C"
                  />
                </div>
                <div>
                  <Label>Mức độ</Label>
                  <select
                    className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option>Nhẹ</option>
                    <option>Vừa</option>
                    <option>Nặng</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Ghi chú thêm</Label>
                  <Textarea
                    className="mt-2 min-h-[120px]"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Thuốc đã dùng, tiền sử dị ứng, lưu ý khác..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handleBook} disabled={isBooking}>
                  {isBooking ? "Đang đặt lịch..." : "Xác nhận đặt lịch"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Lịch hẹn đã đặt</h3>
                <Button variant="outline" size="sm" onClick={refreshAppointments}>
                  Làm mới
                </Button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {isLoadingAppointments ? (
                  <p>Đang tải...</p>
                ) : appointments.length === 0 ? (
                  <p>Chưa có lịch hẹn.</p>
                ) : (
                  appointments.slice(0, 6).map((appt) => (
                    <div key={appt.id} className="rounded-2xl border border-sky-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {fmtDate(appt.scheduled_at)} {fmtTime(appt.scheduled_at)}
                        </p>
                        <span className={`rounded-full px-2 py-1 text-[11px] ${statusStyle(appt.status)}`}>
                          {statusLabel(appt.status)}
                        </span>
                      </div>
                      {appt.reason ? (
                        <p className="mt-1 text-xs text-slate-500">{appt.reason}</p>
                      ) : null}
                      {appt.doctor_phone ? (
                        <p className="mt-2 text-xs text-slate-400">Bác sĩ liên hệ: {appt.doctor_phone}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Thông báo</h3>
                <Button variant="outline" size="sm" onClick={refreshNotifications}>
                  Làm mới
                </Button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {notifications.length === 0 ? (
                  <p>Chưa có thông báo.</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="rounded-2xl border border-sky-100 bg-white p-3">
                      <p className="font-semibold text-slate-900">{n.title}</p>
                      {n.body ? <p className="mt-1 text-xs text-slate-500">{n.body}</p> : null}
                      <p className="mt-2 text-[11px] text-slate-400">
                        {fmtDate(n.created_at || n.sent_at || "")} {fmtTime(n.created_at || n.sent_at || "")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white/90 p-6 text-sm text-slate-600 shadow-xl ring-1 ring-sky-100">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Giờ hành chính</p>
              <p className="mt-2">
                Khung giờ đặt lịch hợp lệ: {BUSINESS_START}:00 – {BUSINESS_END}:00.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Nếu chưa có slot phù hợp, vui lòng liên hệ phòng khám để được hỗ trợ thêm.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
