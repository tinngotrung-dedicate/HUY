"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearTokens, getAccessToken, loginEmail, oauthLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getAccessToken());
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await loginEmail(email, password);
      toast({ type: "success", description: "Đăng nhập thành công." });
      router.push("/home");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      toast({ type: "error", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "facebook") => {
    setIsSubmitting(true);
    try {
      await oauthLogin(provider, {
        email: email || `demo_${provider}@local`,
        full_name: "Demo User",
      });
      toast({ type: "success", description: "Đăng nhập thành công." });
      router.push("/home");
    } catch (error) {
      toast({ type: "error", description: "OAuth thất bại. Vui lòng thử lại sau." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    setHasToken(false);
    toast({ type: "success", description: "Đã đăng xuất. Bạn có thể đăng nhập lại." });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-start md:justify-center">
        <div className="w-full max-w-lg rounded-3xl bg-white/90 p-6 shadow-2xl ring-1 ring-sky-100">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-sky-900">Đăng nhập</h1>
            <p className="mt-1 text-sm text-sky-700">
              Đăng nhập để quản lý hồ sơ và trò chuyện với bác sĩ.
            </p>
          </div>

          {hasToken ? (
            <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Bạn đang có phiên đăng nhập trước đó. Nếu muốn đăng nhập lại, hãy đăng xuất trước.
              <div className="mt-3 flex justify-center">
                <Button variant="outline" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </div>
            </div>
          ) : null}

          <form className="flex flex-col gap-4 px-2 sm:px-6" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-slate-600" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="text"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ban@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-slate-600" htmlFor="password">
                Mật khẩu
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button className="mt-2" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="mt-6 grid gap-3 px-2 sm:px-6">
            <Button
              variant="outline"
              onClick={() => handleOAuth("google")}
              disabled={isSubmitting}
            >
              Tiếp tục với Google (mock)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuth("facebook")}
              disabled={isSubmitting}
            >
              Tiếp tục với Facebook (mock)
            </Button>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-3xl bg-white/80 p-5 shadow-xl ring-1 ring-sky-100">
          <h3 className="text-base font-semibold text-sky-900">Vai trò hỗ trợ</h3>
          <ul className="mt-3 space-y-2 text-sm text-sky-800">
            <li>
              Admin: <span className="font-semibold">Duyệt bác sĩ</span>
            </li>
            <li>
              Bác sĩ: <span className="font-semibold">Theo dõi lịch hẹn</span>
            </li>
            <li>
              Người dùng: <span className="font-semibold">Nhiều hồ sơ trẻ</span>
            </li>
          </ul>
          <div className="mt-4 rounded-2xl border border-sky-100 bg-white/70 p-3 text-xs text-slate-600">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tài khoản demo</p>
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-semibold text-slate-800">Admin</span>: admin@example.com
                <br />
                Mật khẩu: <span className="font-semibold">Admin@12345</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Bác sĩ</span>: doctor@example.com
                <br />
                Mật khẩu: <span className="font-semibold">Doctor@12345</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Người dùng</span>: user@example.com
                <br />
                Mật khẩu: <span className="font-semibold">User@12345</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            OAuth đang ở chế độ mock. Khi bật OAuth thật, nút sẽ chuyển sang đăng nhập
            trực tiếp qua Google/Facebook.
          </p>
        </div>
      </div>
    </div>
  );
}
