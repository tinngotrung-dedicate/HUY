"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            ClinicPT
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Dang nhap nhanh</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang dang nhap co ban cho demo UI.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/home");
          }}
        >
          <label className="block text-sm text-muted-foreground" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            id="email"
            placeholder="ban@phongkham.com"
            required
            type="email"
          />

          <label
            className="block text-sm text-muted-foreground"
            htmlFor="password"
          >
            Mat khau
          </label>
          <input
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            id="password"
            placeholder="********"
            required
            type="password"
          />

          <button
            className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            type="submit"
          >
            Dang nhap
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            Ban muon dang nhap day du?{" "}
            <Link className="text-primary hover:underline" href="/login">
              Dang nhap tai day
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
