# Hệ thống Quản lý Bệnh viện & Cổng Sức Khỏe An Tâm

Nền tảng quản lý bệnh viện đa khoa và cổng chăm sóc sức khỏe trực tuyến **An Tâm**, thiết kế theo kiến trúc Client-Server (React + Vite + TypeScript + Tailwind CSS và Node.js + Express + TypeScript + Prisma ORM + PostgreSQL 16 với cột JSONB và Partial Unique Index).

> **Tài liệu báo cáo chi tiết (CNPM):** Xem [docs/BAO_CAO_CNPM_AN_TAM.md](docs/BAO_CAO_CNPM_AN_TAM.md)  
> **Đặc tả API REST:** Xem [backend/API_CONTRACT.md](backend/API_CONTRACT.md)

---

## 1. Tính năng nổi bật theo 4 vai trò

| Vai trò | Chức năng chính |
| :--- | :--- |
| **Bệnh nhân (`PATIENT`)** | Đặt lịch khám 3 luồng (*Theo chuyên khoa*, *Theo bác sĩ*, *Theo ngày*) theo **Buổi Sáng (07:30–11:30) / Buổi Chiều (13:30–17:00)** và nhận **Số thứ tự (STT)** tức thì; theo dõi STT đang khám trực tiếp; đổi/hủy lịch; quản lý hồ sơ dị ứng & bệnh nền; xem kết quả khám, đơn thuốc; thanh toán QR chuyển khoản giả lập hoặc tại quầy; nhận thông báo. |
| **Bác sĩ (`DOCTOR`)** | Hàng đợi theo buổi sắp xếp tăng dần theo STT, nút **Gọi số tiếp theo**; xem sinh hiệu & tiền sử dị ứng bệnh nhân; ghi bệnh án (ICD-10, kết quả chuyên khoa JSONB, chỉ định CLS); trình kê đơn **tự động cảnh báo dị ứng** đối chiếu với hồ sơ bệnh nhân; công bố kết quả tự động sinh hóa đơn & thông báo; đặt lịch tái khám cấp STT; quản lý lịch trực theo buổi. |
| **Điều dưỡng (`NURSE`)** | Tiếp nhận Check-in theo mã lịch hẹn / STT; đăng ký bệnh nhân vãng lai (**Walk-in**) có tùy chọn ưu tiên & cấp STT tiếp theo; đo sinh hiệu Triage & checklist BHYT (`JSONB`); thu ngân đối soát xác nhận thanh toán nguyên tử (QR / tiền mặt); cấp phát thuốc đã thanh toán; điều phối giường bệnh nội trú (nhập viện, chuyển giường, xuất viện, bảo trì). |
| **Trưởng bệnh viện (`ADMIN`)** | Dashboard KPI thời gian thực (lượt khám hôm nay, biểu đồ so sánh 7 ngày vs 7 ngày trước, bác sĩ đang trực, lịch hẹn trong ngày, công suất giường bệnh tổng thể & từng khoa, doanh thu); quản trị Khoa, Phòng, Giường bệnh, Bác sĩ, Điều dưỡng, Lịch trực, Thuốc, Dịch vụ; tra cứu toàn cục & xuất báo cáo CSV. |

---

## 2. Công nghệ sử dụng

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, React Router v6, Lucide React, Recharts
- **Backend:** Node.js 22, Express 4, TypeScript 5, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS
- **Cơ sở dữ liệu & ORM:** PostgreSQL 16 (`JSONB` + chỉ mục `GIN` + `Partial Unique Index` + khóa dòng `SELECT ... FOR UPDATE`), Prisma ORM 6
- **Kiểm thử & Hạ tầng:** Vitest, Supertest, Docker Compose, Tailscale Mesh VPN

---

## 3. Tài khoản Demo (Mật khẩu chung: `123456`)

Giao diện đăng nhập có sẵn nút chọn nhanh **1-click Demo Accounts** cho cả 4 vai trò:

| Vai trò | Họ tên | Email | Ghi chú |
| :--- | :--- | :--- | :--- |
| `PATIENT` | Lê Minh Anh | `minhanh.patient@antam.vn` | Mã BN: `BN-08250` |
| `DOCTOR` | BS. Hoàng Minh Long | `long.doctor@antam.vn` | `BS-001` • Nội tổng quát • Phòng 201 |
| `DOCTOR` | BS. Trần Thảo Nguyên | `nguyen.doctor@antam.vn` | `BS-002` • Tim mạch • Phòng 305 |
| `DOCTOR` | BS. Nguyễn Quốc Huy | `huy.doctor@antam.vn` | `BS-003` • Nhi khoa • Phòng 102 |
| `NURSE` | ĐD. Phạm Thị Mai | `mai.nurse@antam.vn` | `DD-001` • Nội tổng quát |
| `ADMIN` | Minh Anh (Giám đốc) | `admin@antam.vn` | Quản trị toàn diện bệnh viện |

---

## 4. Hướng dẫn cài đặt & Chạy nhanh với Docker Compose

### Yêu cầu môi trường
- **Docker Desktop** (hoặc Docker Engine + Docker Compose v2) nếu chạy toàn bộ bằng container.
- Hoặc **Node.js >= 20** (khuyến nghị Node.js 22) và **PostgreSQL 16** nếu chạy Backend/Frontend trực tiếp trên máy.

### Bước 1: Tạo file biến môi trường `.env`
Sao chép file mẫu `.env.example` ở thư mục gốc:

```bash
cp .env.example .env
```

*(Trên Windows PowerShell: `Copy-Item .env.example .env`)*

Các biến mặc định trong `.env.example`:
```env
POSTGRES_USER=antam_user
POSTGRES_PASSWORD=antam_password
POSTGRES_DB=antam_hospital
POSTGRES_PORT=5432

DATABASE_URL=postgresql://antam_user:antam_password@localhost:5432/antam_hospital?schema=public

BACKEND_PORT=4000
NODE_ENV=development
JWT_SECRET=antam-hospital-dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173

FRONTEND_PORT=5173
VITE_API_URL=http://localhost:4000/api
```

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Tại thư mục gốc dự án:

```bash
docker compose up --build -d
```

Lệnh trên sẽ lần lượt:
1. Khởi chạy `antam-postgres` (`postgres:16-alpine`) kèm healthcheck.
2. Build & khởi chạy `antam-backend` (tự động chạy `npx prisma migrate deploy && npx prisma db seed && node dist/server.js`).
3. Khởi chạy `antam-frontend` (Vite dev server tại cổng `5173`).

Truy cập ứng dụng:
- **Giao diện Web:** `http://localhost:5173`
- **Backend API Healthcheck:** `http://localhost:4000/api/health`

Để dừng các container:
```bash
docker compose down
```
*(Thêm `-v` nếu muốn xóa sạch volume dữ liệu PostgreSQL để seed lại từ đầu: `docker compose down -v`)*

---

## 5. Chạy phát triển cục bộ (Hybrid: PostgreSQL trên Docker + Backend/Frontend trên máy)

Nếu muốn phát triển và debug nhanh bằng hot-reload trên máy (hoặc chỉ chạy DB bằng Docker):

### 5.1. Khởi chạy PostgreSQL 16
```bash
docker compose up -d postgres
```

### 5.2. Cài đặt & chạy Backend (`backend/`)
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```
Backend sẽ chạy tại `http://localhost:4000`.

### 5.3. Cài đặt & chạy Frontend (`frontend/`)
Mở terminal mới tại thư mục gốc:
```bash
cd frontend
npm install
npm run dev
```
Frontend chạy tại `http://localhost:5173` (mặc định proxy `/api` về `http://localhost:4000` qua `vite.config.ts`).

---

## 6. Kiểm tra chất lượng mã nguồn & Chạy Test

*(Các lệnh kiểm tra không cần PostgreSQL đang chạy đối với phần build/typecheck/unit-test mock)*

### Backend
*(Đảm bảo đã sao chép `.env.example` thành `.env` hoặc truyền biến môi trường `DATABASE_URL` trước khi chạy `npx prisma validate`)*

```bash
cd backend
npx prisma validate
npx tsc --noEmit
npm run build
npm test
```

### Frontend
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 7. Hướng dẫn kết nối làm việc nhóm qua Tailscale (Mesh VPN)

Khi nhóm làm việc phân tán (một thành viên chạy Backend + PostgreSQL, các thành viên khác chạy Frontend hoặc kiểm thử trên điện thoại di động):

1. **Cài đặt & đăng nhập chung một mạng Tailscale (Tailnet)** trên máy chạy Backend/DB và các máy/điện thoại kiểm thử.
2. **Lấy địa chỉ IP Tailscale** của máy host (ví dụ `100.88.12.34`) bằng lệnh:
   ```bash
   tailscale ip -4
   ```
3. **Cấu hình CORS trên máy Backend:** `backend/src/app.ts` đã cấu hình tự động cho phép các origin thuộc dải mạng Tailscale (`http://100.*`) cũng như `http://localhost:*` và `http://127.0.0.1:*`. Ngoài ra bạn có thể liệt kê nhiều origin phân tách bằng dấu phẩy trong `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=http://localhost:5173,http://100.88.12.99:5173
   ```
4. **Cấu hình Frontend trỏ tới Backend qua Tailscale:**
   - Cách A (dùng biến `VITE_API_URL`):
     ```env
     VITE_API_URL=http://100.88.12.34:4000/api
     ```
   - Cách B (dùng Vite proxy `VITE_PROXY_TARGET`, hữu ích khi mở web từ điện thoại qua IP Tailscale của máy Frontend):
     ```bash
     VITE_PROXY_TARGET=http://100.88.12.34:4000 npm run dev
     ```
5. **Kiểm thử trên điện thoại thật:** Mở trình duyệt điện thoại đã bật Tailscale và truy cập `http://<Tailscale-IP-may-Frontend>:5173` để trải nghiệm giao diện Mobile responsive.
