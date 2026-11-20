# Hệ thống Quản lý Bệnh viện & Cổng Sức Khỏe An Tâm

> **Hướng dẫn cài đặt môi trường & khởi chạy dự án dành cho thành viên mới (Starter Edition — Nhánh `main`)**

Nền tảng **An Tâm Hospital & Health Portal** là hệ thống quản lý khám chữa bệnh đa khoa và cổng sức khỏe trực tuyến gồm **4 cổng vai trò**: **Bệnh nhân (`PATIENT`)**, **Bác sĩ (`DOCTOR`)**, **Điều dưỡng (`NURSE`)** và **Trưởng bệnh viện (`ADMIN`)**.

---

## Mục lục

1. [Tổng quan dự án & Tài liệu có sẵn](#1-tổng-quan-dự-án--tài-liệu-có-sẵn)
2. [Công cụ cần cài đặt & Link tải chính thức](#2-công-cụ-cần-cài-đặt--link-tải-chính-thức)
3. [Hướng dẫn cài đặt & Chạy dự án từng bước](#3-hướng-dẫn-cài-đặt--chạy-dự-án-từng-bước)
4. [Quy trình làm việc nhóm trên GitHub & Phân công](#4-quy-trình-làm-việc-nhóm-trên-github--phân-công)
5. [Kết nối test chéo qua Tailscale & Xử lý lỗi thường gặp](#5-kết-nối-test-chéo-qua-tailscale--xử-lý-lỗi-thường-gặp)

---

## 1. Tổng quan dự án & Tài liệu có sẵn

### 1.1. Ngăn xếp công nghệ (Tech Stack)
- **Frontend (`frontend/`):** React 18, TypeScript 5.6, Vite 5.4, Tailwind CSS 3.4, React Router v6, Lucide React, Recharts.
- **Backend (`backend/`):** Node.js 22, Express 4, TypeScript 5.8, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS.
- **Cơ sở dữ liệu (`backend/prisma/`):** PostgreSQL 16 + Prisma ORM 6 (`17` bảng quan hệ chuẩn hóa, `12` cột bán cấu trúc `JSONB`, chỉ mục `GIN` và `2` `Partial Unique Index` chống trùng Số thứ tự STT).
- **Kiểm thử & Hạ tầng:** Vitest, Supertest, Docker Compose, Tailscale Mesh VPN.

### 1.2. Hiện trạng dự án trên nhánh `main`
Nhánh `main` đã hoàn thiện sẵn nền tảng hạ tầng, giao diện, cơ sở dữ liệu và module xác thực để thành viên mới kéo về **tiếp tục lập trình phần xử lý nghiệp vụ các cổng & kiểm thử**:
- **Đã có sẵn & hoạt động:**
  - Toàn bộ giao diện React cho cả 4 vai trò (`frontend/`), Lược đồ PostgreSQL 16 & migration (`backend/prisma/schema.prisma`, `backend/prisma/migrations/`), dữ liệu mẫu (`backend/prisma/seed.ts`), Docker Compose (`docker-compose.yml`), Middleware xác thực JWT/RBAC/Zod (`backend/src/middleware/`), cấu trúc Router (`backend/src/routes/`) và `GET /api/health`.
  - **Chức năng Đăng nhập & Đăng ký (`backend/src/services/auth.service.ts`, `backend/src/routes/auth.routes.ts`, `backend/tests/auth.test.ts`):** Đã hoàn thiện `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` và `PATCH /api/auth/profile` (đã có 11 test cases Vitest + Supertest).
- **Phần thành viên tiếp tục tự code:** Các xử lý nghiệp vụ còn lại trong `backend/src/services/` (`appointment`, `record`, `invoice.formatter`, `payment`, `bed`, `admin`, `utils/allergy.ts`), kết nối vào 6 file router (`public`, `notification`, `patient`, `doctor`, `nurse`, `admin` — hiện đang trả về `501 NOT_IMPLEMENTED` kèm ghi chú `TODO` chi tiết), và bổ sung các bộ test tự động trong `backend/tests/`.

### 1.3. Tài liệu tham khảo quan trọng trong Repository

| Tài liệu | Nội dung chính |
| :--- | :--- |
| [backend/API_CONTRACT.md](backend/API_CONTRACT.md) | **Hợp đồng API chuẩn:** Toàn bộ TypeScript DTOs, HTTP Method, đường dẫn, query/body, response envelope & danh sách tài khoản Demo (`123456`). |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | **Lược đồ Cơ sở dữ liệu (17 bảng):** `users`, `departments`, `rooms`, `beds`, `patients`, `doctors`, `nurses`, `doctor_schedules`, `appointments`, `medical_records`, `medicines`, `services`, `prescriptions`, `invoices`, `payments`, `notifications`, `audit_logs`. |
| [backend/prisma/migrations/20261117000000_init/migration.sql](backend/prisma/migrations/20261117000000_init/migration.sql) | **SQL Migration gốc:** Khởi tạo 17 bảng, 2 Partial Unique Index (`WHERE "status" <> 'CANCELLED'`) và 11 chỉ mục `GIN` cho các cột `JSONB`. |
| [backend/prisma/seed.ts](backend/prisma/seed.ts) | **Dữ liệu mẫu tiếng Việt:** 7 chuyên khoa, 7 bác sĩ, 2 điều dưỡng, 200 giường bệnh (156 giường đang sử dụng = 78%), tài khoản demo & lịch sử 14 ngày. |
| [backend/src/services/README.md](backend/src/services/README.md) | **Phân công file Service:** Danh sách chi tiết các file service cần tạo cho từng thành viên (`TV2`–`TV5`). |
| [backend/tests/README.md](backend/tests/README.md) | **Hướng dẫn Kiểm thử tự động:** 4 bộ test Vitest + Supertest dành cho nhóm trưởng (`TV1`). |
| [docs/BAO_CAO_CNPM_AN_TAM.md](docs/BAO_CAO_CNPM_AN_TAM.md) | **Báo cáo Đồ án CNPM (6 chương):** Phân tích nghiệp vụ, Use Case, ERD, Sequence/Activity Diagram, UI/UX và Thiết kế hệ thống. |

---

## 2. Công cụ cần cài đặt & Link tải chính thức

Trước khi kéo mã nguồn về máy, mỗi thành viên cần cài đặt đầy đủ các công cụ bên dưới (ưu tiên cài trên **Windows 10/11** hoặc macOS/Linux tương đương):

### 2.1. Git (Quản lý mã nguồn & làm việc nhóm)
- **Link tải chính thức:** https://git-scm.com/downloads
- **Hướng dẫn cài đặt:** Chọn bộ cài phù hợp với hệ điều hành (Windows 64-bit Setup). Khi cài giữ các tùy chọn mặc định (`Git from the command line and also from 3rd-party software`).
- **Kiểm tra sau khi cài:** Mở PowerShell / Terminal và chạy:
  ```bash
  git --version
  ```

![Trang tải chính thức Git](docs/images/setup/git-download.png)

### 2.2. Docker Desktop (Chạy PostgreSQL 16 & Toàn bộ hệ thống)
- **Link tải chính thức:** https://www.docker.com/products/docker-desktop/
- **Lưu ý quan trọng khi cài trên Windows (WSL 2):**
  1. Bật tính năng ảo hóa (**Virtualization / VT-x / AMD-V**) trong BIOS nếu máy chưa bật.
  2. Mở PowerShell với quyền **Administrator** và cài đặt WSL 2 trước nếu chưa có:
     ```powershell
     wsl --install
     ```
     *(Sau đó khởi động lại máy nếu Windows yêu cầu).*
  3. Khi cài Docker Desktop, tích chọn **"Use WSL 2 instead of Hyper-V"** (trong Settings → General đảm bảo bật *"Use the WSL 2 based engine"*).
- **Kiểm tra sau khi cài:** Mở Docker Desktop đến khi góc dưới hiện trạng thái **Engine running**, rồi chạy:
  ```bash
  docker --version
  docker compose version
  ```

![Trang tải chính thức Docker Desktop](docs/images/setup/docker-download.png)

### 2.3. Node.js (Khuyến nghị v22 LTS hoặc >= 20)
- **Link tải chính thức:** https://nodejs.org/en/download
- **Lưu ý:** Chọn tab **LTS** (khuyến nghị **v22 LTS** để khớp với image `node:22-alpine` trong `docker-compose.yml`). Trình cài đặt tự động kèm theo `npm`.
- **Kiểm tra sau khi cài:**
  ```bash
  node -v
  npm -v
  ```

![Trang tải chính thức Node.js](docs/images/setup/nodejs-download.png)

### 2.4. PostgreSQL 16 (Khuyên dùng qua Docker, tùy chọn cài riêng)
- **Link tải chính thức:** https://www.postgresql.org/download/
- **Khuyến nghị cho nhóm:** Bạn **KHÔNG bắt buộc** phải cài PostgreSQL trực tiếp lên Windows vì `docker-compose.yml` đã đóng gói sẵn container `postgres:16-alpine` (`antam-postgres`).
- **Lưu ý nếu máy bạn ĐÃ cài sẵn PostgreSQL trên Windows:** PostgreSQL cục bộ thường chiếm cổng mặc định **`5432`**. Lúc cấu hình `.env`, hãy đổi `POSTGRES_PORT=5433` để chạy song song không bị xung đột cổng (xem [Bước 2](#bước-2-tạo-file-biến-môi-trường-env)).

![Trang tải chính thức PostgreSQL](docs/images/setup/postgres-download.png)

### 2.5. Visual Studio Code & Extensions gợi ý
- **Link tải chính thức:** https://code.visualstudio.com/download
- **Extensions nên cài trong VS Code** (tìm trong mục Extensions `Ctrl + Shift + X`):
  1. **Prisma** (`Prisma.prisma`) — Tô màu cú pháp, tự động format và gợi ý schema trong `backend/prisma/schema.prisma`.
  2. **ESLint** (`dbaeumer.vscode-eslint`) — Cảnh báo lỗi cú pháp TypeScript/JS tức thì.
  3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Gợi ý class Tailwind khi đọc/tra cứu giao diện.
  4. **Prettier - Code formatter** (`esbenp.prettier-vscode`) — Định dạng mã nguồn thống nhất.
  5. **Thunder Client** hoặc **REST Client** — Gửi request test nhanh các endpoint API (`/api/...`).
  6. **Docker** (`ms-azuretools.vscode-docker`) — Xem container và log Docker trực quan ngay trong VS Code.

![Trang tải chính thức Visual Studio Code](docs/images/setup/vscode-download.png)

### 2.6. Tailscale (Mạng riêng ảo Mesh VPN để test chéo nhóm)
- **Link tải chính thức:** https://tailscale.com/download
- **Mục đích:** Tạo mạng LAN ảo bảo mật giữa máy các thành viên trong nhóm (hoặc giữa laptop và điện thoại) để gọi API/xem web chéo nhau từ xa mà không cần mở port router hay thuê server cloud.
- **Kiểm tra sau khi cài & đăng nhập:**
  ```bash
  tailscale ip -4
  ```

![Trang tải chính thức Tailscale](docs/images/setup/tailscale-download.png)

---

## 3. Hướng dẫn cài đặt & Chạy dự án từng bước

### Bước 1: Clone mã nguồn từ GitHub
Mở PowerShell / Terminal tại thư mục muốn lưu dự án và chạy:

```bash
git clone https://github.com/nguyenasd132/QuanLyBenhVien.git
cd QuanLyBenhVien
```

*(Kiểm tra chắc chắn bạn đang ở nhánh `main`: `git checkout main`)*

---

### Bước 2: Tạo file biến môi trường `.env`
Sao chép file mẫu `.env.example` thành `.env` ở **thư mục gốc dự án**:

- **Trên Windows PowerShell:**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Trên macOS / Linux / Git Bash:**
  ```bash
  cp .env.example .env
  ```

> **LƯU Ý QUAN TRỌNG VỀ CỔNG POSTGRESQL (`5432` vs `5433`):**  
> Nếu máy tính của bạn **đã có sẵn một dịch vụ PostgreSQL khác chạy ở cổng `5432`**, hãy mở file `.env` vừa tạo và đổi `POSTGRES_PORT=5433` cùng cổng trong `DATABASE_URL` thành `5433`:
>
> ```env
> # Database (PostgreSQL 16)
> POSTGRES_USER=antam_user
> POSTGRES_PASSWORD=antam_password
> POSTGRES_DB=antam_hospital
> POSTGRES_PORT=5433
>
> # Local development DATABASE_URL (Docker Compose tự override host sang 'postgres:5432' bên trong mạng nội bộ)
> DATABASE_URL=postgresql://antam_user:antam_password@localhost:5433/antam_hospital?schema=public
>
> # Backend API Server
> BACKEND_PORT=4000
> NODE_ENV=development
> JWT_SECRET=antam-hospital-dev-jwt-secret-change-in-production
> JWT_EXPIRES_IN=7d
> CORS_ORIGIN=http://localhost:5173
>
> # Frontend Vite App
> FRONTEND_PORT=5173
> VITE_API_URL=http://localhost:4000/api
> ```
>
> **Mẹo cho Prisma CLI:** Khi chạy các lệnh `npx prisma validate`, `migrate`, `seed`, `studio` trực tiếp trên máy bên trong thư mục `backend/`, Prisma CLI chỉ tìm file `.env` ngay tại `backend/.env` (trong khi code Express đọc cả `.env` ở gốc lẫn `backend/.env`). Hãy copy thêm một bản sang `backend/.env`:
> ```powershell
> Copy-Item .env backend\.env
> ```
> *(Cả `.env` và `backend/.env` đều đã được liệt kê trong `.gitignore`, không bị đẩy lên Git).*

---

### Bước 3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Đảm bảo **Docker Desktop đang mở**, đứng tại thư mục gốc dự án và chạy:

```bash
docker compose up --build -d
```

Lệnh này sẽ khởi chạy tuần tự 3 container:
1. **`antam-postgres`** (`postgres:16-alpine`): Khởi tạo database PostgreSQL 16 kèm healthcheck.
2. **`antam-backend`** (`backend/Dockerfile`): Tự động chạy `npx prisma migrate deploy && npx prisma db seed && node dist/server.js` trên cổng `4000`.
3. **`antam-frontend`** (`node:22-alpine`): Cài dependencies và chạy Vite dev server trên cổng `5173`.

Kiểm tra trạng thái các container:
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

![Minh họa kiểm tra 3 container Docker Compose](docs/images/setup/step-docker-ps.png)

> Nếu muốn tắt hệ thống: `docker compose down`  
> Nếu muốn xóa sạch dữ liệu DB để chạy seed lại từ đầu: `docker compose down -v && docker compose up --build -d`

---

### Bước 4: Kiểm tra Giao diện Web (`:5173`) & API Healthcheck (`:4000`)

Sau khi 3 container báo `Up` / `(healthy)`, mở trình duyệt kiểm tra 3 đường dẫn sau:

1. **Trang Đăng nhập Web:** `http://localhost:5173/login`  
   Giao diện An Tâm hiển thị kèm 4 thẻ **Đăng nhập nhanh tài khoản Demo**:

   ![Màn hình Đăng nhập Web An Tâm](docs/images/setup/app-login.png)

2. **Trang Trung tâm Trợ giúp công khai:** `http://localhost:5173/help`

   ![Màn hình Trung tâm Trợ giúp An Tâm](docs/images/setup/app-help.png)

3. **Backend Healthcheck API:** `http://localhost:4000/api/health`  
   Kết quả JSON trả về thành công: `{"success":true,"data":{"status":"ok","service":"antam-backend",...}}`:

   ![Kết quả API Healthcheck](docs/images/setup/api-health.png)

#### Danh sách Tài khoản Demo đã được Seed sẵn (Mật khẩu chung: `123456`)
*(Lưu ý: API xác thực `/api/auth/login`, `/api/auth/register`, `/api/auth/me` và `/api/auth/profile` đã hoạt động đầy đủ — bạn có thể đăng nhập bằng các tài khoản Demo bên dưới hoặc đăng ký bệnh nhân mới tại `/register`. Các API nghiệp vụ chuyên sâu bên trong từng cổng hiện vẫn trả `501 NOT_IMPLEMENTED` cho đến khi nhóm code xong phần Service tương ứng).*

| Vai trò | Họ tên | Email đăng nhập | Ghi chú hồ sơ |
| :--- | :--- | :--- | :--- |
| `PATIENT` | Lê Minh Anh | `minhanh.patient@antam.vn` | Mã BN: `BN-08250` |
| `DOCTOR` | BS. Hoàng Minh Long | `long.doctor@antam.vn` | `BS-001` • Nội tổng quát • Phòng 201 |
| `DOCTOR` | BS. Trần Thảo Nguyên | `nguyen.doctor@antam.vn` | `BS-002` • Tim mạch • Phòng 305 |
| `DOCTOR` | BS. Nguyễn Quốc Huy | `huy.doctor@antam.vn` | `BS-003` • Nhi khoa • Phòng 102 |
| `NURSE` | ĐD. Phạm Thị Mai | `mai.nurse@antam.vn` | `DD-001` • Nội tổng quát |
| `ADMIN` | Minh Anh (Giám đốc) | `admin@antam.vn` | Quản trị toàn diện bệnh viện |

---

### Bước 5: Chế độ chạy Hybrid để Code 

Khi bắt đầu lập trình phần Backend, bạn nên giữ **PostgreSQL chạy trong Docker** và chạy **Backend + Frontend trực tiếp trên máy** để nhận tính năng tự khởi động lại khi lưu file (`tsx watch` & Vite HMR):

1. **Tắt container `backend` và `frontend`, chỉ giữ `antam-postgres` chạy nền:**
   ```bash
   docker compose stop backend frontend
   docker compose up -d postgres
   ```
2. **Terminal 1 — Chạy Backend (`backend/`):**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```
   *(Nếu chưa chạy seed lần nào: chạy thêm `npx prisma db seed` trước `npm run dev`.)*  
   Terminal sẽ báo: `An Tâm Hospital Backend API listening on http://0.0.0.0:4000`.
3. **Terminal 2 — Chạy Frontend (`frontend/`):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend chạy tại `http://localhost:5173` (file `frontend/vite.config.ts` tự proxy mọi request `/api` về `http://localhost:4000`).

![Hướng dẫn chạy 2 Terminal chế độ Hybrid Dev](docs/images/setup/step-hybrid-dev.png)

#### Các lệnh kiểm tra & build hữu ích trong quá trình code
- **Backend (`cd backend`):**
  - `npx prisma validate` *(hoặc `npm run prisma:validate`)* — Kiểm tra hợp lệ `schema.prisma` (cần có `backend/.env`).
  - `npx tsc --noEmit` — Kiểm tra lỗi kiểu TypeScript.
  - `npm run build` — Biên dịch mã nguồn sang `backend/dist/`.
  - `npm test` — Chạy bộ test tự động bằng Vitest (`vitest run`) *(cần `antam-postgres` đang chạy và `backend/.env` hoặc `.env` ở gốc; hiện đã có `backend/tests/auth.test.ts` gồm 11 test cases cho Auth, các test nghiệp vụ khác sẽ chạy cùng khi `TV1` bổ sung thêm `*.test.ts`)*.
- **Frontend (`cd frontend`):**
  - `npm run typecheck` *(tương đương `npx tsc --noEmit`)* — Kiểm tra kiểu TypeScript.
  - `npm run build` — Kiểm tra build production (`tsc -b && vite build`).

---

### Bước 6: Xem & kiểm tra dữ liệu Database bằng Prisma Studio
Để kiểm tra trực quan 17 bảng dữ liệu (giường bệnh, lịch trực, lịch hẹn, cột `JSONB`...) sau khi seed hoặc sau khi test API, mở một Terminal mới tại `backend/` (đã có `backend/.env`):

```bash
cd backend
npx prisma studio
```

Trình duyệt sẽ mở giao diện quản lý dữ liệu tại `http://localhost:5555`.

---

## 4. Quy trình làm việc nhóm trên GitHub & Phân công

### 4.1. Phân công công việc 5 thành viên (Tóm tắt)
Mỗi thành viên đối chiếu chi tiết tại [backend/src/services/README.md](backend/src/services/README.md), [backend/tests/README.md](backend/tests/README.md) và comment `TODO` trong từng file `backend/src/routes/*.routes.ts`:

| Thành viên | Nhánh Git | Phạm vi phụ trách |
| :--- | :--- | :--- |
| **TV1 (Nhóm trưởng)** | `main` | Thiết lập khung Docker/DB/CI, viết bộ test tự động Vitest + Supertest (`backend/tests/`), Review & Merge Pull Request, kiểm thử tích hợp toàn hệ thống. |
| **TV2 (Bệnh nhân & Auth)** | `feat/tv2-patient` | `auth.routes.ts` & `auth.service.ts` *(đã hoàn thành)*; phần cần tiếp tục: `public.routes.ts`, `notification.routes.ts`, `appointment.service.ts` (đặt lịch 3 luồng, `SELECT FOR UPDATE` chống trùng STT, đổi/hủy giữ STT), phần hồ sơ & đặt lịch trong `patient.routes.ts`. |
| **TV3 (Bác sĩ & Bệnh án)** | `feat/tv3-doctor` | `utils/allergy.ts`, `doctor.routes.ts`, `record.service.ts`, `invoice.formatter.ts`, phần xem kết quả khám & đơn thuốc trong `patient.routes.ts`. |
| **TV4 (Điều dưỡng & Thu ngân)** | `feat/tv4-nurse` | `nurse.routes.ts`, `payment.service.ts` (QR/tiền mặt, xác nhận thu ngân nguyên tử, phát thuốc trừ kho), `bed.service.ts` (nhập/chuyển/xuất/bảo trì giường), phần thanh toán trong `patient.routes.ts`. |
| **TV5 (Quản trị & Báo cáo)** | `feat/tv5-admin` | `admin.routes.ts`, `admin.service.ts` (Dashboard KPI, so sánh 7 ngày, công suất giường, CRUD danh mục & nhân sự, tra cứu toàn viện, xuất CSV). |

### 4.2. Quy trình Git chuẩn (Pull → Branch → Commit → Push → Pull Request)

1. **Cập nhật code mới nhất từ `main` trước khi bắt đầu:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Tạo nhánh tính năng riêng (ví dụ cho TV2):**
   ```bash
   git checkout -b feat/tv2-patient
   ```
3. **Code và tự kiểm tra trước khi commit:**
   ```bash
   cd backend
   npx tsc --noEmit
   npm run build
   ```
4. **Commit và đẩy nhánh lên GitHub:**
   ```bash
   git status
   git add <cac-file-ban-da-sua>
   git commit -m "feat(tv2): implement auth and 3-flow appointment booking"
   git push -u origin feat/tv2-patient
   ```
5. **Tạo Pull Request (PR) trên GitHub:**
   - Truy cập repository trên GitHub → chọn **Compare & pull request** từ nhánh `feat/...` vào `main`.
   - Mô tả các endpoint đã hoàn thành và gắn Nhóm trưởng (`TV1`) review trước khi merge.

### 4.3. Quy tắc bảo vệ mã nguồn nền (BẮT BUỘC)
- **KHÔNG** sửa trực tiếp code giao diện trong `frontend/` (giao diện đã khớp sẵn với `backend/API_CONTRACT.md`).
- **KHÔNG** tự ý thay đổi `backend/prisma/schema.prisma` hoặc file migration gốc khi chưa thảo luận và thống nhất cả nhóm.
- **KHÔNG** push trực tiếp lên nhánh `main` (luôn đi qua nhánh `feat/...` và Pull Request).
- **KHÔNG** commit file `.env`, `backend/.env` hoặc thư mục `node_modules/`.

---

## 5. Kết nối test chéo qua Tailscale & Xử lý lỗi thường gặp

### 5.1. Kết nối test chéo nhóm & kiểm thử Mobile qua Tailscale
Khi một thành viên chạy Backend + PostgreSQL trên máy của mình và muốn thành viên khác (hoặc điện thoại thật) truy cập kiểm thử từ xa:

1. Cả hai thiết bị đăng nhập **cùng một mạng Tailscale (Tailnet)**.
2. Trên máy chạy Backend, lấy địa chỉ IP Tailscale (`100.x.y.z`):
   ```bash
   tailscale ip -4
   ```
3. **CORS trên Backend:** `backend/src/app.ts` đã cấu hình **tự động cho phép** mọi origin thuộc dải IP Tailscale (`http://100.*`), `http://localhost:*` và `http://127.0.0.1:*`. Ngoài ra bạn có thể liệt kê nhiều origin phân tách bằng dấu phẩy trong `CORS_ORIGIN` tại `.env`:
   ```env
   CORS_ORIGIN=http://localhost:5173,http://100.88.12.99:5173
   ```
4. **Trỏ Frontend tới Backend qua IP Tailscale:**
   - **Cách A (Sửa biến môi trường `VITE_API_URL`):**  
     Đặt trong file `.env` ở **thư mục gốc** (nếu chạy bằng Docker Compose) hoặc tạo/sửa file `frontend/.env` (nếu chạy `npm run dev` trực tiếp trên máy vì Vite mặc định đọc `.env` tại `frontend/`):
     ```env
     VITE_API_URL=http://100.88.12.34:4000/api
     ```
   - **Cách B (Dùng Vite Proxy `VITE_PROXY_TARGET` — khuyên dùng khi test trên điện thoại):**  
     Đảm bảo **KHÔNG** khai báo `VITE_API_URL` trong `frontend/.env` (để `src/lib/api.ts` giữ đường dẫn tương đối `/api` đi qua Vite proxy), sau đó chạy:
     ```bash
     VITE_PROXY_TARGET=http://100.88.12.34:4000 npm run dev
     ```
     *(Trên PowerShell: `$env:VITE_PROXY_TARGET="http://100.88.12.34:4000"; npm run dev`)*.  
     Sau đó mở trình duyệt trên điện thoại (đã bật Tailscale) và truy cập `http://<Tailscale-IP-may-chay-Frontend>:5173`.

---

### 5.2. Xử lý các lỗi thường gặp

| Triệu chứng / Thông báo lỗi | Nguyên nhân | Cách khắc phục nhanh |
| :--- | :--- | :--- |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Máy đã có PostgreSQL khác đang chạy chiếm cổng `5432`. | Mở `.env` (và `backend/.env`), đổi `POSTGRES_PORT=5433` và đổi `:5432/` trong `DATABASE_URL` thành `:5433/`. Sau đó chạy `docker compose up -d`. |
| Docker Desktop báo `WSL 2 installation is incomplete` hoặc không khởi động được | Chưa bật WSL 2 hoặc chưa bật Virtualization trong BIOS. | Mở PowerShell (Run as Administrator) chạy `wsl --install` hoặc `wsl --update`, bật Virtualization (VT-x/AMD-V) trong BIOS, khởi động lại máy. |
| `Error: P1012: Environment variable not found: DATABASE_URL` khi chạy `npx prisma validate` / `migrate` / `studio` | Prisma CLI chỉ tìm file `.env` bên trong thư mục `backend/`, chưa tìm thấy `backend/.env`. | Đứng ở thư mục gốc chạy `Copy-Item .env backend\.env` (hoặc truyền biến `$env:DATABASE_URL="postgresql://antam_user:antam_password@localhost:5433/antam_hospital?schema=public"`). |
| Giao diện báo lỗi `501 NOT_IMPLEMENTED` khi mở đặt lịch, khám bệnh, thu ngân hoặc báo cáo | Chức năng Đăng nhập/Đăng ký đã hoạt động, nhưng các route nghiệp vụ của cổng tương ứng trên `main` chưa được TV2–TV5 cài đặt. | Xem comment `TODO` trong file `backend/src/routes/*.routes.ts` tương ứng và đặc tả `backend/API_CONTRACT.md` để lập trình service/route. |
| Đã sửa code trong `backend/src/` nhưng container Docker chưa cập nhật | Container `antam-backend` chạy bản build `dist/` cũ. | Nếu đang code, hãy chuyển sang **Chế độ Hybrid** (`docker compose stop backend` và chạy `npm run dev` ở máy), hoặc chạy `docker compose up --build -d backend` để build lại image. |
