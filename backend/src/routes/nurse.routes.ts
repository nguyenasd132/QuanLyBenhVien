import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

router.use(authenticate, requireRole('NURSE'));

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Cổng Điều dưỡng (TV4) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV4 - nurse.routes.ts, payment.service.ts, bed.service.ts):
 * - GET   /api/nurse/reception/appointments        : Danh sách tiếp đón trong ngày (tìm theo mã/SĐT/STT)
 * - GET   /api/nurse/reception/patients/search     : Tìm hồ sơ bệnh nhân nhanh tại quầy
 * - POST  /api/nurse/reception/walk-in             : Đăng ký bệnh nhân vãng lai (ưu tiên nếu cần) & cấp STT
 * - PATCH /api/nurse/appointments/:id/check-in     : Xác nhận bệnh nhân đặt trước đã có mặt
 * - POST  /api/nurse/appointments/:id/triage       : Nhập sinh hiệu Triage (tự tính BMI) & checklist BHYT (JSONB)
 * - GET   /api/nurse/procedures                    : Danh sách thủ thuật/đo sinh hiệu cần thực hiện
 * - POST  /api/nurse/procedures                    : Tạo thủ thuật điều dưỡng
 * - GET   /api/nurse/cashier/invoices              : Danh sách hóa đơn chờ thanh toán / chờ đối soát QR
 * - POST  /api/nurse/payments/:id/confirm          : Thu ngân xác nhận đã thu tiền (giao dịch nguyên tử mở khóa đơn)
 * - POST  /api/nurse/payments/:id/reject           : Từ chối giao dịch QR chưa hợp lệ
 * - GET   /api/nurse/prescriptions                 : Danh sách đơn thuốc chờ cấp phát
 * - POST  /api/nurse/prescriptions/:id/dispense    : Xác nhận phát thuốc (chỉ khi đã thanh toán, trừ tồn kho)
 * - GET   /api/nurse/beds                          : Sơ đồ giường bệnh theo khoa/phòng & bệnh nhân đang nằm
 * - POST  /api/nurse/beds/:id/assign               : Xếp giường nhập viện cho bệnh nhân
 * - POST  /api/nurse/beds/:id/transfer             : Chuyển bệnh nhân sang giường trống khác
 * - POST  /api/nurse/beds/:id/discharge            : Làm thủ tục xuất viện trả giường trống
 * - PATCH /api/nurse/beds/:id/status               : Đổi trạng thái giường (Trống / Bảo trì)
 */
router.all('*', notImplemented);

export default router;
