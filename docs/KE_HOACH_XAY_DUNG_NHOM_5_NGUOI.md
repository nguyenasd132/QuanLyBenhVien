# KẾ HOẠCH XÂY DỰNG & LẬP TRÌNH CHỨC NĂNG PHẦN MỀM — HỆ THỐNG AN TÂM (NHÓM 5 NGƯỜI)

- **Trạng thái nền tảng (Giai đoạn 0 — $\le$ 19/11/2026):** **Đã hoàn thành 100%** (Khảo sát nghiệp vụ, Use Case & Logic, Kiến trúc 3 tầng & ERD 17 bảng + 12 JSONB, Database PostgreSQL 16 + seed 200 giường/7 bác sĩ, Giao diện Front-end 4 vai trò và Tài liệu API).
- **Lịch trình code lại phần chức năng & kiểm thử:** `20/11/2026` $\rightarrow$ `04/12/2026` (**15 ngày**, chốt bàn giao cuối ngày **04/12/2026**).
- **Bảng theo dõi tiến độ 9 trang tính (Excel / Google Sheets):** [Bang_Theo_Doi_Tien_Do_An_Tam.xlsx](Bang_Theo_Doi_Tien_Do_An_Tam.xlsx)

---

## 1. Bản sao lưu & Cấu trúc bản Starter trên nhánh `main`

Để đảm bảo an toàn và đúng mục tiêu cho 4 thành viên tự code lại phần xử lý chức năng từ đầu:

- **Bản sao lưu đầy đủ toàn bộ hệ thống hoàn chỉnh (Backup):**
  - **Trên Git:** Nhánh `backup/full-working` và Tag `backup-full-working` (commit `3f2240e`).
  - **File nén nội bộ (không đẩy lên Git):** `backups/an-tam-full-working-backup.zip` (được bỏ qua tự động trong `.gitignore`).
- **Bản Starter trên nhánh `main` hiện tại:**
  - **Giữ nguyên 100%:** Toàn bộ Giao diện người dùng (`frontend/`), Database PostgreSQL 16 (`backend/prisma/` gồm 17 bảng, migration, dữ liệu mẫu), `docker-compose.yml`, `.env.example`, tài liệu đặc tả [backend/API_CONTRACT.md](../backend/API_CONTRACT.md) và khung hạ tầng (`app.ts`, `server.ts`, middleware `auth.ts` / `errorHandler.ts` / `validate.ts`, `health.routes.ts`).
  - **Đã gỡ bỏ phần xử lý chức năng:** Các file xử lý nghiệp vụ trong `backend/src/services/` (`admin`, `appointment`, `auth`, `bed`, `invoice.formatter`, `payment`, `record`), `backend/src/utils/allergy.ts` và các file test cũ trong `backend/tests/` đã được xóa; 7 file route (`auth`, `public`, `notification`, `patient`, `doctor`, `nurse`, `admin`) được đưa về khung skeleton `501 NOT_IMPLEMENTED` kèm danh sách `TODO` chi tiết để 4 thành viên tự code lại từ `20/11`.

---

## 2. Giai đoạn 0: Các công việc đã hoàn thành trước ngày 20/11/2026

Các hạng mục sau đã được **Thành viên số 1 (Nhóm trưởng)** hoàn tất sẵn và tích **`Hoàn thành` (100%)** trong sheet `TV1_NhomTruong`:

| Mã | Hạng mục đã xong | Thời gian | Nội dung kết quả | Trạng thái |
| :--- | :--- | :---: | :--- | :---: |
| **GD0-01** | Khảo sát nghiệp vụ | 11/11 – 13/11 | Chốt quy trình thực tế 4 vai trò (Bệnh nhân, Bác sĩ, Điều dưỡng, Trưởng BV). | Hoàn thành (100%) |
| **GD0-02** | Phân tích & Logic | 13/11 – 15/11 | Chốt Use Case, Sơ đồ hoạt động/tuần tự, quy tắc đặt lịch 3 luồng theo buổi & cấp STT chống trùng, giữ STT khi hủy, cảnh báo dị ứng, thu ngân nguyên tử. | Hoàn thành (100%) |
| **GD0-03** | Kiến trúc & ERD | 15/11 – 16/11 | Chốt kiến trúc 3 tầng và ERD 4 phân hệ (17 bảng + 12 cột JSONB). | Hoàn thành (100%) |
| **GD0-04** | Xây dựng Database | 16/11 – 18/11 | Hoàn thành PostgreSQL 16 (`schema.prisma`, migration, chỉ mục GIN/Partial Unique, seed 7 khoa, 7 bác sĩ, 2 điều dưỡng, 200 giường bệnh) & Docker Compose. | Hoàn thành (100%) |
| **GD0-05** | Giao diện Front-end & API Contract | 17/11 – 18/11 | Hoàn thiện sẵn bộ Giao diện 4 vai trò (Desktop + Mobile) & đặc tả `backend/API_CONTRACT.md`. | Hoàn thành (100%) |
| **GD0-06** | Backup & Bản Starter | 19/11 | Tạo bản backup đầy đủ và tách khung Starter (giữ UI + DB + Middleware, xóa phần chức năng) để nhóm code từ 20/11. | Hoàn thành (100%) |

---

## 3. Phân công cho 5 thành viên (Tự chọn số tại sheet `Tong_Quan`)

Mỗi thành viên mở sheet **`Tong_Quan`** và điền **Họ và tên + MSSV/GitHub** vào ô màu vàng ứng với vị trí từ **`TV1`** đến **`TV5`** mình chọn:

| Mã TV | Trang việc riêng | Nhánh Git | Phân hệ & Công việc code / kiểm thử (20/11 – 04/12) | Tổng việc |
| :---: | :--- | :--- | :--- | :---: |
| **TV1** *(Trưởng)* | `TV1_NhomTruong` | `main` | *(Đã xong 6 việc GĐ0)* + 6 việc GĐ1–GĐ4: Hướng dẫn Docker/Git cho nhóm, thiết lập khung test `Vitest + Supertest`, viết test tự động Backend (`appointment`, `allergy-and-record`, `payment-and-bed`, `routes-rbac`), Review/Merge PR, **chạy kiểm thử toàn hệ thống 13 kịch bản Desktop/Mobile** & chốt nghiệm thu `04/12`. | 12 *(6 xong + 6 mới)* |
| **TV2** | `TV2_BenhNhan` | `feat/tv2-patient` | Code Backend + ghép UI có sẵn: `auth.routes.ts`, `auth.service.ts` (JWT, Đăng ký, `/me`, Đổi mật khẩu), `public.routes.ts` (Khoa, Bác sĩ, Dịch vụ, Thuốc, Lịch trống 3 luồng), `notification.routes.ts`, Đặt lịch 3 luồng + khóa dòng chống trùng STT (`appointment.service.ts`), Đổi/Hủy giữ STT, Hồ sơ sức khỏe JSONB (`patient.routes.ts`). | 8 |
| **TV3** | `TV3_BacSi` | `feat/tv3-doctor` | Code Backend + ghép UI có sẵn: `utils/allergy.ts` (đối chiếu dị ứng/bệnh nền), `doctor.routes.ts`, `record.service.ts`, `invoice.formatter.ts` (Hàng đợi theo Buổi/STT, Gọi số tiếp theo, Bệnh án ICD-10 + CLS JSONB, Kê đơn cảnh báo dị ứng, Công bố tách 2 hóa đơn, Đặt tái khám, Lịch trực BS) + phần xem/in Kết quả khám phía Bệnh nhân. | 8 |
| **TV4** | `TV4_DieuDuong_TT` | `feat/tv4-nurse` | Code Backend + ghép UI có sẵn: `nurse.routes.ts`, `payment.service.ts`, `bed.service.ts` (Tiếp đón Check-in, Đăng ký Walk-in ưu tiên, Đo sinh hiệu Triage/BMI & BHYT JSONB, Khởi tạo thanh toán QR/Tiền mặt phía BN, Thu ngân xác nhận nguyên tử mở khóa đơn thuốc, Phát thuốc trừ kho, Điều phối giường nội trú). | 8 |
| **TV5** | `TV5_QuanLy` | `feat/tv5-admin` | Code Backend + ghép UI có sẵn: `admin.routes.ts`, `admin.service.ts` (CRUD Khoa, Phòng, Giường, Thuốc, Dịch vụ, Nhân sự, Phân công lịch trực, Dashboard KPI + biểu đồ so sánh 7 ngày + công suất giường theo khoa + doanh thu, Tra cứu lịch hẹn/bệnh nhân/bệnh án toàn viện, Xuất báo cáo CSV). | 8 |

---

## 4. Lịch trình thực hiện chi tiết (20/11/2026 – 04/12/2026 — 15 ngày)

1. **Giai đoạn 1 — Khởi chạy & Auth/Khung (`20/11 – 22/11/2026`):**
   - Cả nhóm dựng Docker + DB sẵn từ `main`, tách 4 nhánh riêng (`feat/tv2-patient`, `feat/tv3-doctor`, `feat/tv4-nurse`, `feat/tv5-admin`).
   - **TV2** ưu tiên hoàn thành sớm Đăng nhập/Đăng ký (`auth`) và Tra cứu công khai (`public`) để mọi người đăng nhập thẳng vào 4 cổng UI.
   - **TV3, TV4, TV5** hoàn thiện khung service, `allergy.ts`, Tiếp đón Check-in/Walk-in và CRUD Khoa/Phòng/Giường/Thuốc/Dịch vụ.
   - **TV1** hoàn thành khung kiểm thử tự động `Vitest + Supertest`.
2. **Giai đoạn 2 — Code toàn bộ chức năng xử lý lõi (`23/11 – 28/11/2026`):**
   - **TV2:** Đặt lịch 3 luồng + khóa tuần tự chống trùng STT, Đổi/Hủy lịch giữ STT, Hồ sơ sức khỏe & Thông báo.
   - **TV3:** Hàng đợi BS/Gọi số, Bệnh án JSONB + Cảnh báo dị ứng, Công bố kết quả tách 2 hóa đơn, Tái khám, Lịch trực BS.
   - **TV4:** Sinh hiệu Triage/BMI, Thanh toán QR & Thu ngân nguyên tử, Phát thuốc trừ tồn kho, Điều phối giường bệnh.
   - **TV5:** Nhân sự & Lịch trực, Dashboard KPI & biểu đồ 7 ngày/công suất giường, Tra cứu toàn viện & Xuất CSV.
   - **TV1:** Song song viết xong 4 bộ Test tự động Backend để sẵn sàng kiểm tra ngay khi ghép code.
3. **Giai đoạn 3 — Ghép luồng liên hoàn vào Giao diện có sẵn (`29/11 – 01/12/2026`):**
   - Ghép nối API thật vào toàn bộ các màn hình UI sẵn có của 4 cổng vai trò.
   - Chạy thông 2 vòng liên hoàn (Đặt lịch → Check-in/Sinh hiệu → Khám & Cảnh báo dị ứng → Hóa đơn → Thanh toán QR/Thu ngân → Phát thuốc → Giường bệnh → Dashboard KPI).
   - **TV1** review Pull Request, ghép sạch toàn bộ nhánh vào `main` và chốt **Đóng băng mã nguồn (Code Freeze) lúc 22:00 ngày 01/12/2026**.
4. **Giai đoạn 4 — Kiểm thử toàn diện, Sửa lỗi & Nghiệm thu (`02/12 – 04/12/2026`):**
   - **02/12:** **TV1** chạy full test tự động + test tay 13 kịch bản (`TC-01`..`TC-13`) trên Desktop & Mobile qua Tailscale, ghi nhận lỗi vào sheet `Kiem_Thu_TC`.
   - **03/12:** **TV2–TV5** sửa dứt điểm mọi lỗi phát sinh; **TV1** test hồi quy và kiểm tra dựng sạch Docker từ đầu (`docker compose down -v && docker compose up --build -d`).
   - **04/12 (Mốc cuối):** Xác nhận đạt 13/13 Test Cases, chốt bàn giao đồ án đúng hạn.

---

## 5. Hướng dẫn sử dụng bảng tiến độ 9 trang (`Bang_Theo_Doi_Tien_Do_An_Tam.xlsx`)

1. Tải [Bang_Theo_Doi_Tien_Do_An_Tam.xlsx](Bang_Theo_Doi_Tien_Do_An_Tam.xlsx) lên Google Drive → Mở bằng **Google Sheets** (hoặc dùng Excel) và chia sẻ quyền chỉnh sửa cho cả 5 bạn.
2. Vào **Sheet 1 (`Tong_Quan`)**: đọc mô tả từng vị trí `TV1`..`TV5`, ai nhận vị trí nào thì **điền Họ & tên + MSSV/GitHub vào 2 ô màu vàng** tương ứng (`C6:D10`). Cột trạng thái tự chuyển xanh và tên tự động cập nhật sang các sheet khác.
3. Mỗi người làm việc chủ yếu trên **trang việc riêng của mình** (`TV1_NhomTruong`, `TV2_BenhNhan`, `TV3_BacSi`, `TV4_DieuDuong_TT`, `TV5_QuanLy`): cập nhật `Tiến độ (%)` và `Trạng thái` cuối mỗi ngày.
4. Cuối mỗi ngày từ `20/11` đến `04/12`, cả nhóm check nhanh tại **`Daily_Checkin`** và theo dõi biểu đồ ngày tại **`Lich_Gantt`**. Giai đoạn cuối nghiệm thu theo 13 kịch bản ở **`Kiem_Thu_TC`**.
