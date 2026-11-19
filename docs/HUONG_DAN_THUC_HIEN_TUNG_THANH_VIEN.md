# HƯỚNG DẪN THỰC HIỆN KẾ HOẠCH CHO TỪNG THÀNH VIÊN (NHÓM 5 NGƯỜI)

- **Thời gian code & kiểm thử:** `20/11/2026` $\rightarrow$ `04/12/2026` (15 ngày).
- **Bảng theo dõi tiến độ (9 sheet):** [Bang_Theo_Doi_Tien_Do_An_Tam.xlsx](Bang_Theo_Doi_Tien_Do_An_Tam.xlsx)
- **Tài liệu hợp đồng API bắt buộc bám sát:** [backend/API_CONTRACT.md](../backend/API_CONTRACT.md)

---

## Phần 0: Thiết lập chung cho cả 5 thành viên (Làm trong ngày đầu `20/11`)

1. **Đăng ký vị trí trong Sheet tiến độ:**
   - Mở file [Bang_Theo_Doi_Tien_Do_An_Tam.xlsx](Bang_Theo_Doi_Tien_Do_An_Tam.xlsx) (trên Google Sheets hoặc Excel).
   - Ở sheet **`Tong_Quan`**, chọn 1 vị trí còn trống (`TV1`–`TV5`) và **điền Họ & tên + MSSV/GitHub vào 2 ô màu vàng (`C6:D10`)**.
2. **Clone code & khởi chạy DB PostgreSQL 16 sẵn có:**
   ```powershell
   git clone <link-repo-github-nhom>
   cd <ten-thu-muc>
   Copy-Item .env.example .env
   docker compose up -d postgres
   ```
3. **Cài gói thư viện & sinh Prisma Client (Database đã có sẵn, KHÔNG sửa `schema.prisma`):**
   ```powershell
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   npm run dev          # Backend chạy tại http://localhost:4000
   ```
   Mở terminal thứ 2 chạy Giao diện có sẵn:
   ```powershell
   cd frontend
   npm install
   npm run dev          # Frontend chạy tại http://localhost:5173
   ```
4. **Quy tắc viết code để ghép vào Giao diện sẵn có không bị lỗi:**
   - **KHÔNG sửa** thư mục `frontend/` trừ khi cần sửa lỗi nhỏ khi ghép API ở Giai đoạn 3–4 (nếu có phải báo cả nhóm).
   - **Tận dụng sẵn các hàm nền ở `backend/src/`:**
     - `middleware/auth.ts`: `authenticate`, `requireRole(...)`, `signAuthToken(...)`
     - `middleware/errorHandler.ts`: `asyncHandler(...)`
     - `middleware/validate.ts`: `validateBody(...)`, `validateQuery(...)`
     - `utils/response.ts`: `sendSuccess(...)`, `sendError(...)`
     - `utils/errors.ts`: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`
     - `utils/codes.ts`: `generateHospitalCode`, `generateSequentialCode`
     - `utils/date.ts`: `getTodayDateString`, `toDateOnly`, `formatDateOnly`, `addDays`, `getSessionBounds`, `getSessionLabel`, `computeEstimatedTime`
   - **Mọi API trả về đúng cấu trúc JSON** trong [backend/API_CONTRACT.md](../backend/API_CONTRACT.md) thì toàn bộ Giao diện Front-end sẽ tự động hiển thị đúng ngay lập tức.

---

## Thành viên số 1 (TV1 — Nhóm trưởng): Hạ tầng nhóm, Review PR & Kiểm thử toàn hệ thống

- **Sheet theo dõi riêng:** `TV1_NhomTruong` *(6 việc GĐ0 đã tích sẵn `Hoàn thành 100%`; thực hiện 6 việc `TV1-01` $\rightarrow$ `TV1-06`)*.
- **Nhánh làm việc:** `main` (quản trị chung) và nhánh viết test nếu cần.

### Các bước thực hiện theo ngày
1. **`20/11 – 21/11` (`TV1-01`):**
   - Đẩy bản Starter lên GitHub, mời 4 bạn vào repo, hỗ trợ cả nhóm dựng xong PostgreSQL + `npm run dev` trên máy cá nhân.
   - Thiết lập cấu hình test trong `backend/tests/` (đảm bảo `npm test` với Vitest + Supertest sẵn sàng).
2. **`23/11 – 28/11` (`TV1-02`, `TV1-03`):**
   - Viết 4 file kiểm thử tự động trong `backend/tests/`:
     - `appointment.service.test.ts`: Đặt lịch 3 luồng, khóa cấp STT không trùng khi chạy song song, hủy lịch giữ nguyên STT, chặn đặt trùng buổi.
     - `allergy-and-record.test.ts`: Cảnh báo dị ứng Penicillin (mức nặng) / chống chỉ định bệnh nền (mức trung bình), lưu bệnh án JSONB, công bố kết quả sinh 2 hóa đơn tách biệt.
     - `payment-and-bed.test.ts`: Thu ngân xác nhận thanh toán nguyên tử (cập nhật Hóa đơn + Thanh toán + Đơn thuốc + Thông báo), cấp phát thuốc trừ tồn kho, xếp/chuyển/xuất giường bệnh.
     - `routes-rbac.test.ts`: Chặn thiếu token (`401`) và chặn truy cập trái vai trò (`403`).
3. **`29/11 – 01/12` (`TV1-04`):**
   - Review từng Pull Request từ `TV2`, `TV3`, `TV4`, `TV5`, kiểm tra không đụng chạm ngoài phạm vi file, merge tuần tự vào `main`.
   - Chạy `npx tsc --noEmit`, `npm run build` ở cả `backend` & `frontend`, chốt **đóng băng mã nguồn lúc 22:00 ngày `01/12`**.
4. **`02/12 – 04/12` (`TV1-05`, `TV1-06`):**
   - Chạy `npm test` + tự tay test toàn bộ **13 kịch bản (`TC-01`..`TC-13`)** trên trình duyệt máy tính và điện thoại (qua Tailscale), cập nhật kết quả ở sheet `Kiem_Thu_TC`.
   - Giao danh sách lỗi (nếu có) cho `TV2`–`TV5` sửa ngày `03/12`, sau đó chạy lại kiểm thử hồi quy + test dựng sạch Docker (`docker compose down -v && docker compose up --build -d`) để chốt bàn giao ngày `04/12`.

---

## Thành viên số 2 (TV2): Xác thực, Tra cứu công khai, Thông báo & Cổng Bệnh nhân

- **Sheet theo dõi riêng:** `TV2_BenhNhan` (`TV2-01` $\rightarrow$ `TV2-08`).
- **Nhánh Git:** `git checkout -b feat/tv2-patient`
- **Các file cần tạo / hoàn thiện:**
  - `backend/src/services/auth.service.ts` *(tạo mới)*
  - `backend/src/services/appointment.service.ts` *(tạo mới)*
  - `backend/src/routes/auth.routes.ts` *(code thay stub `501`)*
  - `backend/src/routes/public.routes.ts` *(code thay stub `501`)*
  - `backend/src/routes/notification.routes.ts` *(code thay stub `501`)*
  - `backend/src/routes/patient.routes.ts` *(phần hồ sơ + đặt/xem/đổi/hủy lịch; giữ phần hóa đơn/thanh toán cho TV4 ghép chung PR sau hoặc điều phối qua TV1)*

### Các bước thực hiện theo ngày
1. **`20/11 – 21/11` (`TV2-01` — Ưu tiên hàng đầu):**
   - Code `auth.service.ts` + `auth.routes.ts`:
     - `POST /api/auth/login`: So sánh mật khẩu bằng `bcryptjs`, ký JWT bằng `signAuthToken`, trả về `{ token, user }` (kèm `patient`/`doctor`/`nurse` profile id).
     - `POST /api/auth/register`: Tạo tài khoản `PATIENT` mới + bản ghi `patients` với mã `BN-...`.
     - `GET /api/auth/me` & `PATCH /api/auth/profile`: Lấy thông tin cá nhân và đổi mật khẩu/họ tên.
   - **Kiểm chứng nhanh:** Mở `http://localhost:5173/login`, bấm thử nút **Demo Accounts** xem có đăng nhập vào được các cổng hay chưa (mở khóa login cho cả TV3, TV4, TV5 làm việc!).
2. **`21/11 – 22/11` (`TV2-02`):**
   - Code 5 route `GET` trong `public.routes.ts`: `/departments`, `/doctors`, `/schedules/availability` (trả về bác sĩ + buổi `MORNING`/`AFTERNOON` + số lượt trống + STT tiếp theo + giờ dự kiến), `/services`, `/medicines`.
   - **Kiểm chứng:** Trang `/doctors` hiển thị đầy đủ danh sách bác sĩ và lịch trống theo 3 luồng.
3. **`23/11 – 28/11` (`TV2-03`, `TV2-04`, `TV2-05`):**
   - Code `appointment.service.ts`:
     - Đặt lịch 3 luồng (`BY_DEPARTMENT`, `BY_DOCTOR`, `BY_DATE`) trong `prisma.$transaction`: dùng `SELECT ... FOR UPDATE` khóa đúng dòng `doctor_schedules`, kiểm tra còn chỗ (`lastQueueNumber < maxPatients`), kiểm tra chưa đặt trùng bác sĩ trong cùng buổi, tăng `last_queue_number`, tính `estimatedTime` bằng `computeEstimatedTime(...)`, tạo lịch hẹn + thông báo xác nhận.
     - Hủy lịch (`PATCH /appointments/:id/cancel`): đổi trạng thái `CANCELLED`, **không** trừ hay đánh lại `queueNumber` của bệnh nhân khác.
     - Đổi lịch (`PATCH /appointments/:id/reschedule`): hủy lịch cũ và cấp STT mới ở buổi mới.
   - Code `patient.routes.ts` (lấy STT đang khám live tại phòng, cập nhật hồ sơ dị ứng/bệnh nền/liên hệ khẩn cấp JSONB) & `notification.routes.ts` (`GET /`, `PATCH /:id/read`, `PATCH /read-all`).
4. **`29/11 – 01/12` (`TV2-06`, `TV2-07`):**
   - Test toàn bộ các màn hình có sẵn của Bệnh nhân (`PatientHomePage`, `BookingWizardPage`, `MyAppointmentsPage`, `HealthProfilePage`), phối hợp TV3/TV4 chạy luồng liên hoàn, đẩy nhánh và mở PR trước `22:00` ngày `01/12`.
5. **`02/12 – 04/12` (`TV2-08`):** Phối hợp TV1 sửa lỗi kiểm thử (`TC-01`, `TC-02`, `TC-11`, `TC-12`, `TC-13`).

---

## Thành viên số 3 (TV3): Cổng Bác sĩ & Kết quả khám Bệnh nhân

- **Sheet theo dõi riêng:** `TV3_BacSi` (`TV3-01` $\rightarrow$ `TV3-08`).
- **Nhánh Git:** `git checkout -b feat/tv3-doctor`
- **Các file cần tạo / hoàn thiện:**
  - `backend/src/utils/allergy.ts` *(tạo mới)*
  - `backend/src/services/record.service.ts` *(tạo mới)*
  - `backend/src/services/invoice.formatter.ts` *(tạo mới)*
  - `backend/src/routes/doctor.routes.ts` *(code thay stub `501`)*
  - `backend/src/routes/patient.routes.ts` *(4 route xem Kết quả khám & Đơn thuốc: `/records`, `/records/:id`, `/prescriptions`, `/prescriptions/:id` — phối hợp ghép chung PR với TV2/TV1)*

### Các bước thực hiện theo ngày
1. **`20/11 – 22/11` (`TV3-01`, `TV3-02`):**
   - Chạy Docker + DB mẫu, kiểm tra dữ liệu dị ứng mẫu trong `seed.ts` (bệnh nhân dị ứng Penicillin, thuốc Amoxicillin/Ibuprofen trong `medicines.contraindications`).
   - Code `backend/src/utils/allergy.ts`: hàm đối chiếu danh sách hoạt chất/dị nguyên của thuốc với `allergies` (mức độ `HIGH`) và `chronicConditions` (mức độ `MEDIUM` / `LOW`) của bệnh nhân.
   - Dựng khung `doctor.routes.ts`, `record.service.ts`, `invoice.formatter.ts` và schema Zod.
2. **`23/11 – 28/11` (`TV3-03`, `TV3-04`, `TV3-05`):**
   - Code API Hàng đợi Bác sĩ (`GET /queue` chia theo `MORNING`/`AFTERNOON`, sắp tăng dần theo `queueNumber`, kèm sinh hiệu `triageData` và `allergies`), `POST /queue/call-next` (chuyển sang `IN_PROGRESS` + gửi thông báo gọi số), `GET /patients/:patientId/history`.
   - Code API Kiểm tra cảnh báo dị ứng (`POST /prescriptions/allergy-check`) và Lưu/Công bố bệnh án trong `record.service.ts`:
     - Khi công bố (`PUBLISHED`) trong `prisma.$transaction`: lưu `medical_records` (`specialty_results` JSONB), lưu `prescriptions` (`items` JSONB + `allergy_warnings` JSONB), **tách thành 2 hóa đơn riêng** trong `invoices` (`HOSPITAL_FEE` cho phí khám/CLS và `PRESCRIPTION` cho tiền thuốc), chuyển lịch hẹn sang `COMPLETED`, gửi thông báo `EXAM_RESULT`.
   - Code API Đặt lịch tái khám (`POST /appointments/follow-up` dùng chung logic cấp STT an toàn) & Quản lý lịch trực (`GET/POST/PATCH /schedules`), cùng 4 route xem/in kết quả khám & đơn thuốc phía Bệnh nhân.
3. **`29/11 – 01/12` (`TV3-06`, `TV3-07`):**
   - Ghép nối & kiểm thử trên `DoctorQueuePage`, `DoctorExamPage`, `DoctorSchedulePage` và `ExamResultsPage` (kiểm tra cảnh báo đỏ/vàng khi kê Amoxicillin/Ibuprofen, bản in đơn thuốc), mở PR trước `22:00` ngày `01/12`.
4. **`02/12 – 04/12` (`TV3-08`):** Phối hợp TV1 sửa lỗi kiểm thử (`TC-04`, `TC-05`, `TC-06`).

---

## Thành viên số 4 (TV4): Cổng Điều dưỡng & Thanh toán Bệnh nhân

- **Sheet theo dõi riêng:** `TV4_DieuDuong_TT` (`TV4-01` $\rightarrow$ `TV4-08`).
- **Nhánh Git:** `git checkout -b feat/tv4-nurse`
- **Các file cần tạo / hoàn thiện:**
  - `backend/src/services/payment.service.ts` *(tạo mới)*
  - `backend/src/services/bed.service.ts` *(tạo mới)*
  - `backend/src/routes/nurse.routes.ts` *(code thay stub `501`)*
  - `backend/src/routes/patient.routes.ts` *(3 route Thanh toán phía Bệnh nhân: `GET /invoices`, `GET /invoices/:id`, `POST /payments`)*

### Các bước thực hiện theo ngày
1. **`20/11 – 22/11` (`TV4-01`, `TV4-02`):**
   - Đọc `API_CONTRACT.md` phần Nurse & Billing, kiểm tra cấu trúc JSONB của `triage_data` (`appointments`) và `assignment_history` (`beds`).
   - Code phần Tiếp đón trong `nurse.routes.ts`: tìm lịch hẹn trong ngày theo mã/SĐT/STT, tìm nhanh hồ sơ bệnh nhân, `PATCH /appointments/:id/check-in`, `POST /reception/walk-in` (cấp STT tiếp theo cho bệnh nhân vãng lai, có cờ ưu tiên).
2. **`23/11 – 28/11` (`TV4-03`, `TV4-04`, `TV4-05`):**
   - Code API Đo sinh hiệu Triage (`POST /appointments/:id/triage`): tự tính BMI = $\text{cân nặng} / (\text{chiều cao (m)})^2$, lưu kèm checklist BHYT JSONB + người đo vào `triage_data`; và endpoint `/procedures`.
   - Code `payment.service.ts`:
     - Phía Bệnh nhân (`GET /invoices`, `POST /payments`): xem hóa đơn tách biệt, tạo thanh toán `QR_TRANSFER` (sinh `qrInfo`, đưa hóa đơn sang chờ đối soát) hoặc `COUNTER_CASH`.
     - Phía Thu ngân Điều dưỡng (`POST /nurse/payments/:id/confirm` và `/reject`): thực hiện **trong một giao dịch nguyên tử** (khóa `invoices`, cập nhật `Payment -> CONFIRMED`, `Invoice -> PAID`, nếu là hóa đơn thuốc thì mở `Prescription -> PAID`, đồng thời ghi `Notification` & `AuditLog`).
     - Cấp phát thuốc (`POST /nurse/prescriptions/:id/dispense`): **chặn nếu đơn chưa `PAID` hoặc tồn kho không đủ**, trừ `stock_quantity` từng thuốc và chuyển đơn sang `DISPENSED`.
   - Code `bed.service.ts`: lấy sơ đồ giường theo khoa/phòng; xếp giường (chỉ khi giường `AVAILABLE` và bệnh nhân chưa nằm giường khác); chuyển giường; xuất viện; chuyển `MAINTENANCE`; ghi lại lịch sử điều phối vào `assignment_history` JSONB.
3. **`29/11 – 01/12` (`TV4-06`, `TV4-07`):**
   - Ghép nối & kiểm thử trên `NurseReceptionPage`, `NurseCashierPage`, `NurseBedsPage` và `BillingPage` của Bệnh nhân, mở PR trước `22:00` ngày `01/12`.
4. **`02/12 – 04/12` (`TV4-08`):** Phối hợp TV1 sửa lỗi kiểm thử (`TC-03`, `TC-07`, `TC-08`, `TC-09`).

---

## Thành viên số 5 (TV5): Cổng Trưởng bệnh viện / Quản lý & Thống kê

- **Sheet theo dõi riêng:** `TV5_QuanLy` (`TV5-01` $\rightarrow$ `TV5-08`).
- **Nhánh Git:** `git checkout -b feat/tv5-admin`
- **Các file cần tạo / hoàn thiện:**
  - `backend/src/services/admin.service.ts` *(tạo mới)*
  - `backend/src/routes/admin.routes.ts` *(code thay stub `501`)*

### Các bước thực hiện theo ngày
1. **`20/11 – 22/11` (`TV5-01`, `TV5-02`):**
   - Dựng khung `admin.routes.ts` & `admin.service.ts`, kiểm tra `seed.ts` (7 chuyên khoa, 7 bác sĩ, 2 điều dưỡng, 200 giường bệnh đang có `156/200 = 78%` công suất).
   - Code API CRUD Cơ sở vật chất (`/departments`, `/rooms`, `/beds`) và Danh mục (`/medicines` có `contraindications` JSONB, `/services`).
2. **`23/11 – 28/11` (`TV5-03`, `TV5-04`, `TV5-05`):**
   - Code API Quản lý Nhân sự (`/doctors`, `/nurses`) & Phân công lịch trực (`/schedules`).
   - Code `admin.service.ts` phần Dashboard (`GET /api/admin/dashboard`):
     - 4 KPI: Lượt khám hôm nay, Lịch hẹn hôm nay, Bác sĩ đang trực, Giường đang sử dụng (`occupied / total` & `%`).
     - Biểu đồ so sánh lượt khám 7 ngày gần nhất vs 7 ngày trước đó.
     - Danh sách bác sĩ đang trực, lịch hẹn trong ngày, công suất giường theo từng khoa, tổng hợp doanh thu (viện phí & tiền thuốc).
   - Code API Tra cứu toàn viện có lọc/phân trang (`/appointments`, `/patients`, `/records`) và Xuất báo cáo CSV (`GET /reports/export`, nhớ thêm UTF-8 BOM `\uFEFF` để Excel mở tiếng Việt không lỗi font).
3. **`29/11 – 01/12` (`TV5-06`, `TV5-07`):**
   - Ghép nối & kiểm thử trên 8 trang có sẵn ở `frontend/src/pages/admin/` (`AdminDashboardPage`, `AdminFacilitiesPage`, `AdminStaffPage`, `AdminCatalogPage`, `AdminAppointmentsPage`, `AdminPatientsPage`, `AdminRecordsPage`, `AdminReportsPage`).
   - Kiểm tra đồng bộ số liệu Dashboard sau khi TV3/TV4 hoàn tất ca khám, thu tiền và xếp giường; mở PR trước `22:00` ngày `01/12`.
4. **`02/12 – 04/12` (`TV5-08`):** Phối hợp TV1 sửa lỗi kiểm thử (`TC-10`).

---

## Lưu ý phối hợp file dùng chung (`patient.routes.ts` & `index.ts`)
- Riêng file [backend/src/routes/patient.routes.ts](../backend/src/routes/patient.routes.ts) có endpoint của **TV2** (đặt lịch, hồ sơ), **TV3** (xem kết quả khám, đơn thuốc) và **TV4** (xem hóa đơn, thanh toán):
  - **Cách ghép sạch không xung đột:** Mỗi bạn viết logic chính vào file service riêng (`appointment.service.ts`, `record.service.ts`, `payment.service.ts`). Đến cuối Giai đoạn 2 (`28/11`), **TV2** đưa phần router `/profile` + `/appointments` vào `patient.routes.ts` trước, sau đó **TV3** và **TV4** chỉ gắn thêm các dòng route gọi sang service của mình (hoặc tách thành `patient.clinical.routes.ts` / `patient.billing.routes.ts` rồi import vào `patient.routes.ts` với sự điều phối của **TV1**).
