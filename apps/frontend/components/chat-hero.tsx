export function ChatHero() {
  return (
    <section className="w-full border-b border-border bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            ClinicPT • Chat & Giới thiệu
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Hỏi đáp y khoa tức thì, kèm giới thiệu tính năng
          </h1>
          <p className="max-w-2xl text-slate-200">
            Bắt đầu trò chuyện ở bên dưới. Admin duyệt bác sĩ, người dùng đặt lịch, RAG trả lời dựa
            trên tài liệu nội bộ.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-200">
            <span className="rounded-full border border-white/30 px-3 py-1">JWT + 2FA</span>
            <span className="rounded-full border border-white/30 px-3 py-1">RBAC 3 vai trò</span>
            <span className="rounded-full border border-white/30 px-3 py-1">Lịch hẹn bác sĩ</span>
            <span className="rounded-full border border-white/30 px-3 py-1">RAG nội bộ</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#chat"
              className="rounded-xl bg-white px-4 py-2 text-slate-900 shadow-md hover:shadow-lg"
            >
              Bắt đầu chat
            </a>
            <a
              href="/intake"
              className="rounded-xl border border-white/30 px-4 py-2 text-white hover:border-white/60"
            >
              Form thu thập thông tin
            </a>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-slate-200">
          <div className="rounded-2xl border border-white/20 bg-white/5 p-4 shadow-lg">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Demo accounts</p>
            <p className="mt-2">
              Admin: <span className="font-semibold">admin@example.com</span>
            </p>
            <p>
              Bác sĩ: <span className="font-semibold">doctor@example.com</span>
            </p>
            <p>
              Người dùng: <span className="font-semibold">user@example.com</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/5 p-4 shadow-lg">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Backend</p>
            <p>
              API: <code className="text-xs">/auth • /appointments • /chat</code>
            </p>
            <p>Model: Gemini / nội bộ</p>
          </div>
        </div>
      </div>
    </section>
  );
}
