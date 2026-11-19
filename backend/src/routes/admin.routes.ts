import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Cổng Trưởng bệnh viện / Quản lý (TV5) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV5 - admin.routes.ts & admin.service.ts):
 * - GET /api/admin/dashboard                : 4 KPI tổng quan, biểu đồ 7 ngày vs 7 ngày trước, BS trực, công suất giường theo khoa, doanh thu
 * - GET /api/admin/appointments             : Tra cứu & lọc toàn bộ lịch hẹn
 * - GET /api/admin/patients                 : Tra cứu hồ sơ bệnh nhân toàn viện
 * - GET /api/admin/records                  : Tra cứu hồ sơ bệnh án toàn viện
 * - GET / POST / PATCH / DELETE /api/admin/departments : Quản lý Chuyên khoa
 * - GET / POST / PATCH / DELETE /api/admin/rooms       : Quản lý Phòng khám / Phòng bệnh
 * - GET / POST / PATCH / DELETE /api/admin/beds        : Quản lý Giường bệnh nội trú
 * - GET / POST / PATCH / DELETE /api/admin/doctors     : Quản lý Bác sĩ
 * - GET / POST / PATCH / DELETE /api/admin/nurses      : Quản lý Điều dưỡng
 * - GET / POST / PATCH          /api/admin/schedules   : Quản lý & phân công lịch trực theo buổi
 * - GET / POST / PATCH / DELETE /api/admin/medicines   : Quản lý Danh mục Thuốc & tồn kho
 * - GET / POST / PATCH / DELETE /api/admin/services    : Quản lý Danh mục Dịch vụ kỹ thuật
 * - GET /api/admin/reports/export           : Xuất báo cáo thống kê định dạng CSV
 */
router.all('*', notImplemented);

export default router;
