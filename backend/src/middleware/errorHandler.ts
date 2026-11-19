import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ', err.flatten());
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = JSON.stringify(err.meta?.target || '');
      if (target.includes('uq_appointments_patient_doctor_date_session_active')) {
        return sendError(
          res,
          409,
          'DUPLICATE_BOOKING',
          'Bạn đã có lịch hẹn với bác sĩ này trong buổi khám đã chọn'
        );
      }
      if (target.includes('uq_appointments_doctor_date_session_stt_active')) {
        return sendError(
          res,
          409,
          'QUEUE_CONFLICT',
          'Số thứ tự (STT) vừa được cấp cho bệnh nhân khác, vui lòng thử lại'
        );
      }
      return sendError(res, 409, 'CONFLICT', 'Dữ liệu đã tồn tại trong hệ thống', err.meta);
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy bản ghi cần xử lý');
    }
    if (err.code === 'P2003') {
      return sendError(res, 400, 'FOREIGN_KEY_ERROR', 'Tham chiếu dữ liệu không hợp lệ');
    }
  }

  // Raw SQL unique constraint error (PostgreSQL 23505)
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    ((err as { code?: string }).code === '23505' ||
      (err as { code?: string }).code === 'P2010')
  ) {
    const msg = String((err as { message?: string }).message || '');
    if (msg.includes('uq_appointments_patient_doctor_date_session_active')) {
      return sendError(
        res,
        409,
        'DUPLICATE_BOOKING',
        'Bạn đã có lịch hẹn với bác sĩ này trong buổi khám đã chọn'
      );
    }
    if (msg.includes('uq_appointments_doctor_date_session_stt_active')) {
      return sendError(
        res,
        409,
        'QUEUE_CONFLICT',
        'Xung đột số thứ tự (STT), vui lòng thử lại'
      );
    }
  }

  console.error('Unhandled API Error:', err);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau');
}
