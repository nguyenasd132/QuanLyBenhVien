import crypto from 'crypto';
import { getTodayDateString } from './date';

export function generateHospitalCode(prefix: string): string {
  const datePart = getTodayDateString().replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

export function generateSequentialCode(prefix: string, seqNumber: number, padLength = 5): string {
  return `${prefix}-${String(seqNumber).padStart(padLength, '0')}`;
}
