import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Xác thực (TV2) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV2 - auth.routes.ts & auth.service.ts):
 * - POST /api/auth/login    : Đăng nhập bằng email + mật khẩu, trả về JWT + thông tin user
 * - POST /api/auth/register : Đăng ký tài khoản Bệnh nhân mới (tạo user + patient)
 * - GET  /api/auth/me       : Trả về thông tin tài khoản hiện tại (cần authenticate)
 * - PATCH /api/auth/profile : Cập nhật thông tin cơ bản / đổi mật khẩu (cần authenticate)
 */
router.post('/login', notImplemented);
router.post('/register', notImplemented);
router.get('/me', authenticate, notImplemented);
router.patch('/profile', authenticate, notImplemented);

router.all('*', notImplemented);

export default router;
