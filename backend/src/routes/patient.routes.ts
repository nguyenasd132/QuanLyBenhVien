import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateQuery } from '../middleware/validate';
import * as paymentService from '../services/payment.service';
import { sendError, sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate, requireRole('PATIENT'));

function notImplemented(_req: Request, res: Response) {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng Cổng Bệnh nhân (TV2 / TV3) chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
}

/**
 * TODO - Phân công cài đặt các endpoint Cổng Bệnh nhân (`/api/patient`):
 *
 * [TV2 - Hồ sơ & Đặt lịch khám 3 luồng (appointment.service.ts)]:
 * - GET  /api/patient/profile                   : Lấy hồ sơ sức khỏe (dị ứng, bệnh nền, liên hệ khẩn cấp JSONB)
 * - PUT / PATCH /api/patient/profile            : Cập nhật hồ sơ sức khỏe & thẻ BHYT
 * - GET  /api/patient/appointments              : Danh sách lịch hẹn + STT đang khám hiện tại tại phòng
 * - POST /api/patient/appointments              : Đặt lịch 3 luồng theo buổi + cấp STT chống trùng (SELECT ... FOR UPDATE)
 * - GET  /api/patient/appointments/:id          : Chi tiết lịch hẹn + phiếu hẹn + mã check-in
 * - PATCH /api/patient/appointments/:id/cancel  : Hủy lịch hẹn (giữ nguyên STT của người khác)
 * - PATCH /api/patient/appointments/:id/reschedule : Đổi lịch sang ngày/buổi khác và cấp STT mới
 *
 * [TV3 - Kết quả khám & Đơn thuốc phía Bệnh nhân]:
 * - GET /api/patient/records                    : Danh sách hồ sơ kết quả khám đã công bố
 * - GET /api/patient/records/:id                : Chi tiết kết quả khám (sinh hiệu, ICD-10, CLS, đơn thuốc)
 * - GET /api/patient/prescriptions              : Lịch sử đơn thuốc của bệnh nhân
 * - GET /api/patient/prescriptions/:id          : Chi tiết đơn thuốc để xem / in
 *
 * [TV4 - Thanh toán QR / Tiền mặt phía Bệnh nhân (payment.service.ts)]:
 * - GET  /api/patient/invoices                  : Danh sách hóa đơn (viện phí & đơn thuốc tách riêng)
 * - GET  /api/patient/invoices/:id              : Chi tiết hóa đơn & thông tin QR
 * - GET  /api/patient/payments                  : Lịch sử biên lai thanh toán của bệnh nhân
 * - POST /api/patient/payments                  : Khởi tạo thanh toán QR chuyển khoản hoặc tiền mặt tại quầy
 */

// --- [TV4-04] Thanh toán QR / Tiền mặt phía Bệnh nhân ---
router.get(
  '/invoices',
  validateQuery(paymentService.listPatientInvoicesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const invoices = await paymentService.listPatientInvoices(
      req.user!.userId,
      req.query as paymentService.ListPatientInvoicesQuery
    );
    return sendSuccess(res, invoices, 200);
  })
);

router.get(
  '/invoices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await paymentService.getPatientInvoiceDetail(
      req.user!.userId,
      req.params.id
    );
    return sendSuccess(res, invoice, 200);
  })
);

router.get(
  '/payments',
  asyncHandler(async (req: Request, res: Response) => {
    const payments = await paymentService.listPatientPayments(req.user!.userId);
    return sendSuccess(res, payments, 200);
  })
);

router.post(
  '/payments',
  validateBody(paymentService.createPatientPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.createPatientPayment(req.user!.userId, req.body);
    return sendSuccess(res, result, 201);
  })
);

// Các route của TV2 & TV3 chưa cài đặt sẽ trả về cảnh báo đỏ 501 NOT_IMPLEMENTED
router.all('*', notImplemented);

export default router;
