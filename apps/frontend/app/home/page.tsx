"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/toast";
import { clearTokens, getAccessToken, getProfile } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const profile = await getProfile();
        setRole(profile?.role || null);
      } catch {
        setRole(null);
      }
    };
    load();
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    toast({ type: "success", description: "Đã đăng xuất." });
    router.push("/login");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Welcome</p>
            <h1 className="text-2xl font-semibold text-slate-900">Chọn thao tác</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bạn có thể đặt lịch khám hoặc vào chat để trao đổi nhanh.
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Đặt lịch</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tạo hồ sơ trẻ, chọn khung giờ và xác nhận lịch hẹn.
            </p>
            <div className="mt-4">
              <Button asChild className="bg-sky-500 text-white hover:bg-sky-600">
                <Link href="/booking">Đi tới đặt lịch</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Chat</h2>
            <p className="mt-2 text-sm text-slate-600">
              Trao đổi nhanh với trợ lý y tế và xem lại lịch sử hội thoại.
            </p>
            <div className="mt-4">
              <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
                <Link href="/chat">Đi tới chat</Link>
              </Button>
            </div>
          </div>
          {role === "admin" ? (
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl md:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">Admin Dashboard</h2>
              <p className="mt-2 text-sm text-slate-600">
                Quản lý slot giờ hành chính, theo dõi thống kê và vận hành hệ thống.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href="/admin">Đi tới Admin Dashboard</Link>
                </Button>
              </div>
            </div>
          ) : null}
          {role === "doctor" ? (
            <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl md:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">Trang bác sĩ</h2>
              <p className="mt-2 text-sm text-slate-600">
                Theo dõi lịch làm việc, xử lý lịch hẹn và cập nhật trạng thái nhanh.
              </p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href="/doctor">Đi tới trang bác sĩ</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-6 text-sm text-slate-600 shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gợi ý</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Trong chat luôn có nút “Đặt lịch” để chuyển nhanh.</li>
            <li>Hồ sơ trẻ là bước bắt buộc trước khi đặt lịch khám.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
