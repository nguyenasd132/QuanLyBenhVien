export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function badRequest(message: string, details?: unknown, code = 'VALIDATION_ERROR') {
  return new AppError(400, code, message, details);
}

export function unauthorized(message = 'Vui lòng đăng nhập để tiếp tục') {
  return new AppError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Không tìm thấy dữ liệu yêu cầu') {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(message: string, details?: unknown, code = 'CONFLICT') {
  return new AppError(409, code, message, details);
}
