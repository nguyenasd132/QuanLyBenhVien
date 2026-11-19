import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || process.env.BACKEND_PORT || 4000),
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://antam_user:antam_password@localhost:5432/antam_hospital?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'antam-hospital-dev-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
