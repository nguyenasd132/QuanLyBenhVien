import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

router.use(authenticate, requireRole('DOCTOR'));

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Cổng Bác sĩ (TV3) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV3 - doctor.routes.ts, record.service.ts, utils/allergy.ts, invoice.formatter.ts):
 * - GET   /api/doctor/queue                       : Hàng đợi bệnh nhân theo buổi (Sáng/Chiều) sắp theo STT
 * - POST  /api/doctor/queue/call-next             : Gọi số tiếp theo theo STT & gửi thông báo
 * - PATCH /api/doctor/appointments/:id/status     : Cập nhật trạng thái lượt khám
 * - GET   /api/doctor/patients/:patientId/history : Tiền sử dị ứng, bệnh nền, lịch sử khám cũ của bệnh nhân
 * - POST  /api/doctor/records                     : Lưu/công bố bệnh án + đơn thuốc + sinh 2 hóa đơn tách biệt
 * - GET   /api/doctor/records/:id                 : Xem chi tiết hồ sơ khám
 * - POST  /api/doctor/records/:id/publish         : Công bố kết quả khám & hoàn tất lượt khám
 * - PUT   /api/doctor/records/:id                 : Cập nhật bệnh án nháp
 * - POST  /api/doctor/prescriptions/allergy-check : Đối chiếu thuốc kê với dị ứng & bệnh nền (allergy.ts)
 * - POST  /api/doctor/appointments/follow-up      : Đặt lịch tái khám / chuyển khoa & cấp STT mới
 * - GET   /api/doctor/schedules                   : Xem lịch trực theo buổi của bác sĩ
 * - POST  /api/doctor/schedules                   : Tạo/cập nhật lịch trực & giới hạn lượt khám mỗi buổi
 * - PATCH /api/doctor/schedules/:id               : Bật/tắt nhận đặt lịch buổi khám
 */
router.all('*', notImplemented);

export default router;
