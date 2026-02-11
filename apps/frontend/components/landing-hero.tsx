type Card = { title: string; desc: string };
type Feature = { title: string; items: string[] };

const cards: Card[] = [
  {
    title: "Hồ sơ trẻ",
    desc: "Tạo và quản lý hồ sơ sức khỏe cơ bản cho bé trong vài bước.",
  },
  {
    title: "Đặt lịch nhanh",
    desc: "Chọn khung giờ phù hợp và xác nhận lịch hẹn dễ dàng.",
  },
  {
    title: "Theo dõi lịch sử",
    desc: "Lưu lại lịch hẹn, ghi chú khám, tiện tra cứu khi cần.",
  },
];

const features: Feature[] = [
  {
    title: "Trải nghiệm cho phụ huynh",
    items: ["Giao diện rõ ràng", "Thông tin minh bạch", "Thao tác nhanh gọn"],
  },
  {
    title: "Đặt lịch an tâm",
    items: ["Khung giờ phù hợp", "Nhắc lịch thông minh", "Lưu dấu lịch sử"],
  },
  {
    title: "Sẵn sàng mở rộng",
    items: ["AI tư vấn sau", "Nhắc lịch SMS/Email", "Tích hợp hồ sơ khám"],
  },
];

export function LandingHero() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#d7efff_0%,_#eaf6ff_45%,_#f6fbff_100%)] px-4 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10" style={{ fontFamily: "\"Sora\", \"Space Grotesk\", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-sky-500/15" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">ClinicPT</p>
                <h1 className="text-2xl font-semibold text-slate-900">ClinicPT</h1>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                className="rounded-full border border-sky-200 px-4 py-2 text-sm text-slate-700 hover:border-sky-300"
                href="/login"
              >
                Đăng nhập
              </a>
              <a
                className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                href="/intake"
              >
                Hồ sơ trẻ
              </a>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                Trợ lý đặt lịch khám nhi khoa cho phụ huynh
              </h2>
              <p className="mt-4 max-w-2xl text-slate-600">
                Tạo hồ sơ cho bé, chọn khung giờ phù hợp và theo dõi lịch hẹn trong một
                giao diện đơn giản. Mọi thông tin đều rõ ràng để bạn yên tâm hơn.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-sky-100 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-600">
                  Hồ sơ trẻ
                </span>
                <span className="rounded-full border border-sky-100 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-600">
                  Đặt lịch nhanh
                </span>
                <span className="rounded-full border border-sky-100 bg-white px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-600">
                  Nhắc lịch thông minh
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white p-6 text-sm text-slate-600 shadow-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bắt đầu nhanh</p>
              <ol className="mt-4 space-y-3">
                <li>1. Đăng nhập hoặc tạo tài khoản</li>
                <li>2. Tạo hồ sơ cho bé</li>
                <li>3. Chọn khung giờ và xác nhận lịch hẹn</li>
                <li>4. Theo dõi lịch hẹn và nhắc lịch</li>
              </ol>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-sky-100 bg-white p-5 shadow-lg"
            >
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-sky-100 bg-white p-5 shadow-lg"
            >
              <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {feature.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white p-6 text-sm text-slate-600 shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gợi ý sử dụng</p>
          <ol className="mt-3 space-y-2">
            <li>1. Bắt đầu từ nút “Hồ sơ trẻ” để tạo hồ sơ cho bé.</li>
            <li>2. Chọn khung giờ phù hợp và xác nhận lịch hẹn.</li>
            <li>3. Theo dõi lịch hẹn và thông báo nhắc lịch.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
