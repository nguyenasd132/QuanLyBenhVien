# Thư mục Tests (Kiểm thử tự động — TV1 / Nhóm trưởng)

Thư mục này dành cho **Thành viên số 1 (Nhóm trưởng)** viết và chạy bộ kiểm thử tự động bằng **Vitest + Supertest** để nghiệm thu phần code của TV2–TV5:

- `appointment.service.test.ts`: Đặt lịch 3 luồng theo buổi, cấp STT đồng thời không trùng, chặn đặt trùng buổi, hủy lịch giữ nguyên STT.
- `allergy-and-record.test.ts`: Cảnh báo dị ứng Penicillin/chống chỉ định bệnh nền, lưu bệnh án JSONB, công bố kết quả tách 2 hóa đơn.
- `payment-and-bed.test.ts`: Thu ngân xác nhận thanh toán nguyên tử, cấp phát thuốc trừ tồn kho, xếp/chuyển/xuất giường bệnh.
- `routes-rbac.test.ts`: Kiểm tra xác thực JWT và chặn truy cập trái vai trò (RBAC 4 vai trò).
