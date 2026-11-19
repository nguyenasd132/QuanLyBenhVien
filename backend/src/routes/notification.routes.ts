import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendError } from '../utils/response';

const router = Router();

router.use(authenticate);

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Thông báo (TV2) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO (TV2 - notification.routes.ts):
 * - GET   /api/notifications          : Lấy danh sách thông báo của người dùng hiện tại + số chưa đọc
 * - PATCH /api/notifications/:id/read : Đánh dấu đã đọc 1 thông báo
 * - PATCH /api/notifications/read-all : Đánh dấu đã đọc tất cả thông báo
 */
router.get('/', notImplemented);
router.patch('/:id/read', notImplemented);
router.patch('/read-all', notImplemented);

router.all('*', notImplemented);

export default router;
