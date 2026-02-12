# ClinicPT

Full‑stack clinic scheduling + chat demo (FastAPI backend + Next.js frontend).

## Cấu trúc thư mục
- `backend/` — FastAPI + SQLite (JWT/2FA/RBAC, appointments, schedules, notifications, RAG).
- `apps/frontend/` — Next.js UI.
- `data/preprocess/` — dữ liệu tiền xử lý/RAG (tuỳ chọn).
- `requirements.txt` — Python dependencies cho backend.

## Yêu cầu
- Node.js 18+
- pnpm
- Python 3.10+

## Chạy backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
# (tuỳ chọn) DB_URL=postgres://... nếu dùng Postgres
uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload
```

### Demo accounts (backend tự tạo khi login ở môi trường dev)
- Admin: `admin@example.com` / `Admin@12345`
- Doctor: `doctor@example.com` / `Doctor@12345`
- User: `user@example.com` / `User@12345`

Bạn có thể đổi qua ENV:
```
DEMO_ADMIN_EMAIL
DEMO_ADMIN_PASSWORD
DEMO_DOCTOR_EMAIL
DEMO_DOCTOR_PASSWORD
DEMO_USER_EMAIL
DEMO_USER_PASSWORD
```

### Env backend (quan trọng nếu deploy)
```
# Database
DB_URL=sqlite:///./app.db
# hoặc Postgres:
# DB_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=change-me
JWT_EXPIRE_SECONDS=3600
JWT_REFRESH_SECONDS=604800

# (tuỳ chọn) API key cho backend
BACKEND_API_KEY=
```

## Chạy frontend (Next.js)
```bash
cd apps/frontend
pnpm install
pnpm dev
```
Frontend chạy ở: http://localhost:3000

### File cấu hình frontend
`apps/frontend/.env.local`
```env
NEXT_PUBLIC_API_BASE=http://localhost:8008
NEXT_PUBLIC_API_MOCK=1   # bật mock cho frontend
```

### Env frontend cho deploy (Vercel/production)
```
# NextAuth (bắt buộc)
AUTH_SECRET=your-random-secret
NEXTAUTH_SECRET=your-random-secret
AUTH_URL=https://your-domain.vercel.app
NEXTAUTH_URL=https://your-domain.vercel.app
AUTH_TRUST_HOST=1

# Nếu không có backend, bật mock full:
NEXT_PUBLIC_API_MOCK=1
NEXT_PUBLIC_API_BASE=mock

# Nếu có backend thật:
# NEXT_PUBLIC_API_BASE=https://your-backend-domain
```

### Skip migrations nếu không có DB
Khi build trên môi trường không có DB (local/Vercel), có thể set:
```
SKIP_DB_MIGRATIONS=1
```

## Luồng chính
- `/home` — chọn Đặt lịch hoặc Chat
- `/booking` — đặt lịch + calendar + khai báo lâm sàng cơ bản
- `/intake` — hồ sơ trẻ (không phải nơi đặt lịch)
- `/chat` — chat
- `/admin` — dashboard admin + quản lý slot + lịch hẹn tuần
- `/doctor` — trang bác sĩ (lịch làm việc + lịch hẹn)

## Mock/Placeholder cần triển khai thật
- OAuth login (hiện mock ở frontend)
- Auto đặt tên hội thoại (mock trong `/chat`)
- RAG/Graph (LightRAG) dùng dữ liệu trong `backend/rag_storage` — cần cấu hình API key LLM thật nếu muốn chạy production

## Ghi chú
- Backend mặc định dùng SQLite (`backend/app.db`).
- Nếu bật Postgres: set `DB_URL` ở backend.
