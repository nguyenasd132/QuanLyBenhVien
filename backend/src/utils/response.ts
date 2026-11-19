import { Response } from 'express';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
  const payload: { success: true; data: T; meta?: PaginationMeta } = {
    success: true,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  });
}
