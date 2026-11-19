# Thư mục Services (Phần xử lý nghiệp vụ Backend)

Thư mục này đã được làm trống để các thành viên tự lập trình lại toàn bộ logic xử lý nghiệp vụ (Database PostgreSQL 16 + Prisma schema + API Contract và Giao diện Front-end đã có sẵn).

Tham khảo đặc tả chi tiết request/response tại: `backend/API_CONTRACT.md`.

## Phân công file cần tạo theo thành viên

- **TV2 (Tài khoản, Công khai & Cổng Bệnh nhân):**
  - `auth.service.ts` — Đăng nhập JWT, Đăng ký bệnh nhân, lấy thông tin cá nhân, cập nhật mật khẩu/hồ sơ.
  - `appointment.service.ts` — Đặt lịch 3 luồng theo buổi (Sáng/Chiều), khóa dòng chống trùng STT (`SELECT ... FOR UPDATE`), tính giờ dự kiến, đổi lịch, hủy lịch giữ nguyên STT.

- **TV3 (Cổng Bác sĩ & Kết quả khám):**
  - `../utils/allergy.ts` — Đối chiếu hoạt chất/nhóm dị ứng & chống chỉ định bệnh nền của bệnh nhân với thuốc kê đơn.
  - `record.service.ts` — Hàng đợi theo buổi/STT, gọi số tiếp theo, lưu bệnh án (`specialty_results` JSONB), kê đơn cảnh báo dị ứng, công bố kết quả sinh 2 hóa đơn tách biệt, đặt lịch tái khám.
  - `invoice.formatter.ts` — Chuẩn hóa dữ liệu hóa đơn trả về cho Front-end.

- **TV4 (Cổng Điều dưỡng & Thanh toán Bệnh nhân):**
  - `payment.service.ts` — Khởi tạo thanh toán QR/Tiền mặt, thu ngân xác nhận/từ chối nguyên tử (mở khóa đơn thuốc, gửi thông báo), cấp phát thuốc trừ tồn kho.
  - `bed.service.ts` — Điều phối giường nội trú (xếp giường, chuyển giường, xuất viện, chuyển bảo trì, ghi lịch sử JSONB).

- **TV5 (Cổng Trưởng bệnh viện / Quản lý):**
  - `admin.service.ts` — Dashboard KPI, biểu đồ so sánh 7 ngày, công suất giường theo khoa, doanh thu, CRUD danh mục, tra cứu toàn viện và xuất CSV.
