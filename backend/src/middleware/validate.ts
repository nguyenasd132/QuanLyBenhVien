import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { badRequest } from '../utils/errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(badRequest('Dữ liệu đầu vào không hợp lệ', result.error.flatten()));
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(badRequest('Tham số truy vấn không hợp lệ', result.error.flatten()));
    }
    req.query = result.data as Request['query'];
    return next();
  };
}
