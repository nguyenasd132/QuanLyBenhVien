import { Request, Response, Router } from 'express';
import { sendError } from '../utils/response';

const router = Router();

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Tra cứu công khai (TV2) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV2 - public.routes.ts):
 * LƯU Ý: Router này được mount tại `/api` trong app.ts trước các router khác,
 * nên chỉ đăng ký các route công khai tường minh (KHÔNG dùng router.all('*')).
 * - GET /api/departments            : Danh sách chuyên khoa
 * - GET /api/doctors                : Danh sách bác sĩ theo khoa / tìm kiếm
 * - GET /api/schedules/availability : Lịch trống 3 luồng (theo Khoa / Bác sĩ / Ngày, buổi Sáng/Chiều)
 * - GET /api/services               : Danh mục dịch vụ kỹ thuật
 * - GET /api/medicines              : Danh mục thuốc tra cứu
 */
router.get('/departments', notImplemented);
router.get('/doctors', notImplemented);
router.get('/schedules/availability', notImplemented);
router.get('/services', notImplemented);
router.get('/medicines', notImplemented);

export default router;
