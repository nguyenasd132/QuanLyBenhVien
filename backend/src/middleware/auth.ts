import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, Role } from '../types';
import { forbidden, unauthorized } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signAuthToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Thiếu token xác thực'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(unauthorized('Token xác thực không hợp lệ'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded || !decoded.userId || !decoded.role) {
      return next(unauthorized('Token xác thực không hợp lệ'));
    }
    req.user = decoded;
    return next();
  } catch {
    return next(unauthorized('Phiên đăng nhập đã hết hạn hoặc không hợp lệ'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(unauthorized('Vui lòng đăng nhập để tiếp tục'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden(`Quyền truy cập yêu cầu vai trò: ${allowedRoles.join(', ')}`));
    }
    return next();
  };
}
