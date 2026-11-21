import crypto from 'crypto';
import { AppointmentStatus, Gender, Prisma, Role, SessionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateQuery } from '../middleware/validate';
import * as bedService from '../services/bed.service';
import * as paymentService from '../services/payment.service';
import {
  AllergyItem,
  ChecklistData,
  ChronicConditionItem,
  EmergencyContact,
  TriageDataJson,
  VitalsData
} from '../types';
import { generateHospitalCode } from '../utils/codes';
import {
  computeEstimatedTime,
  formatDateOnly,
  getSessionBounds,
  getTodayDateString,
  toDateOnly
} from '../utils/date';
import { badRequest, conflict, notFound } from '../utils/errors';
import { sendError, sendSuccess } from '../utils/response';

/**
 * Cổng Điều dưỡng (TV4) — `/api/nurse`, Role: NURSE.
 * Bao gồm: Tiếp đón & Walk-in (TV4-02), Đo sinh hiệu Triage & BHYT (TV4-03),
 * Thu ngân viện phí/QR (TV4-04), Cấp phát thuốc & Giường nội trú (TV4-05).
 */
const router = Router();

router.use(authenticate, requireRole('NURSE'));

const BCRYPT_SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// 1. DTO Interfaces & Prisma Includes cho Tiếp đón / Sinh hiệu
// ---------------------------------------------------------------------------

export interface PatientSummaryDto {
  id: string;
  userId: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
  nationalId: string | null;
  insuranceNumber: string | null;
  bloodType: string | null;
  allergies: AllergyItem[];
  chronicConditions: ChronicConditionItem[];
  emergencyContact: EmergencyContact | null;
}

export interface NursingProcedureDto {
  id: string;
  appointmentId: string;
  nurseId: string;
  nurseName: string;
  vitals: VitalsData;
  checklistData: ChecklistData;
  triageNotes: string | null;
  recordedAt: string;
}

export interface AppointmentDto {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientPhone: string | null;
  patientGender: Gender | null;
  patientDateOfBirth: string | null;
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  doctorTitle: string | null;
  specialty: string;
  departmentId: string;
  departmentName: string;
  roomName: string | null;
  scheduleId: string | null;
  appointmentDate: string;
  session: SessionType;
  queueNumber: number;
  estimatedTime: string;
  liveCurrentStt: number | null;
  bookingType: 'ONLINE' | 'WALK_IN' | 'FOLLOW_UP';
  bookingFlow: string | null;
  status: AppointmentStatus;
  isPriority: boolean;
  chiefComplaint: string | null;
  cancelReason: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  hasNursingProcedure: boolean;
  hasMedicalRecord: boolean;
  nursingProcedure?: NursingProcedureDto | null;
  medicalRecordId?: string | null;
}

const PATIENT_SUMMARY_INCLUDE = {
  user: {
    select: {
      fullName: true,
      email: true,
      phone: true
    }
  }
} satisfies Prisma.PatientInclude;

type PatientWithUser = Prisma.PatientGetPayload<{
  include: typeof PATIENT_SUMMARY_INCLUDE;
}>;

const APPOINTMENT_DETAIL_INCLUDE = {
  patient: {
    include: {
      user: {
        select: {
          fullName: true,
          phone: true
        }
      }
    }
  },
  doctor: {
    include: {
      user: {
        select: {
          fullName: true
        }
      },
      department: {
        select: {
          id: true,
          name: true
        }
      },
      room: {
        select: {
          name: true
        }
      }
    }
  },
  department: {
    select: {
      id: true,
      name: true
    }
  },
  medicalRecord: {
    select: {
      id: true
    }
  }
} satisfies Prisma.AppointmentInclude;

type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_DETAIL_INCLUDE;
}>;

function asJsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

export function mapPatientToSummaryDto(patient: PatientWithUser): PatientSummaryDto {
  return {
    id: patient.id,
    userId: patient.userId,
    patientCode: patient.patientCode,
    fullName: patient.user.fullName,
    email: patient.user.email,
    phone: patient.user.phone,
    dateOfBirth: patient.dateOfBirth ? formatDateOnly(patient.dateOfBirth) : null,
    gender: patient.gender,
    address: patient.address,
    nationalId: patient.nationalId,
    insuranceNumber: patient.insuranceNumber,
    bloodType: patient.bloodType,
    allergies: asJsonArray<AllergyItem>(patient.allergies),
    chronicConditions: asJsonArray<ChronicConditionItem>(patient.chronicConditions),
    emergencyContact: patient.emergencyContact
      ? (patient.emergencyContact as unknown as EmergencyContact)
      : null
  };
}

function parseTriageProcedure(
  appointmentId: string,
  triageData: Prisma.JsonValue | null
): NursingProcedureDto | null {
  if (!triageData || typeof triageData !== 'object' || Array.isArray(triageData)) {
    return null;
  }
  const raw = triageData as unknown as Partial<TriageDataJson>;
  if (!raw.vitals && !raw.checklistData) {
    return null;
  }
  return {
    id: raw.id || appointmentId,
    appointmentId,
    nurseId: raw.nurseId || '',
    nurseName: raw.nurseName || 'Điều dưỡng',
    vitals: raw.vitals || {},
    checklistData: raw.checklistData || {},
    triageNotes: raw.triageNotes ?? null,
    recordedAt: raw.recordedAt || new Date().toISOString()
  };
}

export function mapAppointmentToDto(
  apt: AppointmentWithDetails,
  liveCurrentStt: number | null = null
): AppointmentDto {
  const nursingProcedure = parseTriageProcedure(apt.id, apt.triageData);
  return {
    id: apt.id,
    appointmentCode: apt.appointmentCode,
    patientId: apt.patientId,
    patientCode: apt.patient.patientCode,
    patientName: apt.patient.user.fullName,
    patientPhone: apt.patient.user.phone,
    patientGender: apt.patient.gender,
    patientDateOfBirth: apt.patient.dateOfBirth ? formatDateOnly(apt.patient.dateOfBirth) : null,
    doctorId: apt.doctorId,
    doctorCode: apt.doctor.doctorCode,
    doctorName: apt.doctor.user.fullName,
    doctorTitle: apt.doctor.title,
    specialty: apt.doctor.specialty,
    departmentId: apt.departmentId,
    departmentName: apt.department.name,
    roomName: apt.doctor.room?.name ?? null,
    scheduleId: apt.scheduleId,
    appointmentDate: formatDateOnly(apt.appointmentDate),
    session: apt.session,
    queueNumber: apt.queueNumber,
    estimatedTime: apt.estimatedTime,
    liveCurrentStt,
    bookingType: apt.bookingType,
    bookingFlow: apt.bookingFlow,
    status: apt.status,
    isPriority: apt.isPriority,
    chiefComplaint: apt.chiefComplaint,
    cancelReason: apt.cancelReason,
    checkedInAt: apt.checkedInAt ? apt.checkedInAt.toISOString() : null,
    startedAt: apt.startedAt ? apt.startedAt.toISOString() : null,
    completedAt: apt.completedAt ? apt.completedAt.toISOString() : null,
    createdAt: apt.createdAt.toISOString(),
    hasNursingProcedure: Boolean(nursingProcedure),
    hasMedicalRecord: Boolean(apt.medicalRecord),
    nursingProcedure,
    medicalRecordId: apt.medicalRecord?.id ?? null
  };
}

async function computeLiveCurrentSttMap(
  appointments: AppointmentWithDetails[]
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  if (appointments.length === 0) {
    return result;
  }

  const uniqueKeys = new Map<
    string,
    { doctorId: string; appointmentDate: Date; session: SessionType }
  >();

  for (const apt of appointments) {
    const dateStr = formatDateOnly(apt.appointmentDate);
    const key = `${apt.doctorId}|${dateStr}|${apt.session}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, {
        doctorId: apt.doctorId,
        appointmentDate: apt.appointmentDate,
        session: apt.session
      });
    }
  }

  const doctorIds = Array.from(new Set(appointments.map((a) => a.doctorId)));
  const dates = Array.from(new Set(appointments.map((a) => a.appointmentDate)));

  const activeInSessions = await prisma.appointment.findMany({
    where: {
      doctorId: { in: doctorIds },
      appointmentDate: { in: dates },
      status: { in: ['IN_PROGRESS', 'COMPLETED'] }
    },
    select: {
      doctorId: true,
      appointmentDate: true,
      session: true,
      queueNumber: true,
      status: true
    }
  });

  for (const key of uniqueKeys.keys()) {
    result.set(key, null);
  }

  const inProgressMap = new Map<string, number>();
  const completedMaxMap = new Map<string, number>();

  for (const row of activeInSessions) {
    const key = `${row.doctorId}|${formatDateOnly(row.appointmentDate)}|${row.session}`;
    if (row.status === 'IN_PROGRESS') {
      const current = inProgressMap.get(key);
      if (current === undefined || row.queueNumber < current) {
        inProgressMap.set(key, row.queueNumber);
      }
    } else if (row.status === 'COMPLETED') {
      const currentMax = completedMaxMap.get(key) ?? 0;
      if (row.queueNumber > currentMax) {
        completedMaxMap.set(key, row.queueNumber);
      }
    }
  }

  for (const key of uniqueKeys.keys()) {
    if (inProgressMap.has(key)) {
      result.set(key, inProgressMap.get(key)!);
    } else if (completedMaxMap.has(key)) {
      result.set(key, completedMaxMap.get(key)!);
    }
  }

  return result;
}

async function getLiveCurrentSttForAppointment(
  apt: AppointmentWithDetails
): Promise<number | null> {
  const map = await computeLiveCurrentSttMap([apt]);
  const key = `${apt.doctorId}|${formatDateOnly(apt.appointmentDate)}|${apt.session}`;
  return map.get(key) ?? null;
}

// ---------------------------------------------------------------------------
// 2. Zod Validation Schemas cho Tiếp đón, Walk-in (TV4-02) & Sinh hiệu (TV4-03)
// ---------------------------------------------------------------------------

const optionalTrimmed = (maxLength = 255) =>
  z
    .string()
    .trim()
    .max(maxLength, `Tối đa ${maxLength} ký tự`)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined));

export const searchPatientsQuerySchema = z.object({
  search: z.string().trim().optional()
});

export const listReceptionAppointmentsQuerySchema = z.object({
  date: z.string().trim().optional(),
  session: z.enum(['MORNING', 'AFTERNOON', 'ALL']).optional(),
  status: z
    .enum(['BOOKED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'ALL'])
    .optional(),
  doctorId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  search: z.string().trim().optional()
});

export const checkInLookupSchema = z.object({
  appointmentId: optionalTrimmed(100),
  appointmentCode: optionalTrimmed(100),
  queueNumber: z.coerce.number().int().positive('Số thứ tự phải lớn hơn 0').optional(),
  doctorId: optionalTrimmed(100),
  date: optionalTrimmed(30),
  session: z.enum(['MORNING', 'AFTERNOON']).optional()
});

const newWalkInPatientSchema = z.object({
  fullName: z
    .string({ required_error: 'Vui lòng nhập họ và tên bệnh nhân' })
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự'),
  phone: optionalTrimmed(20),
  email: optionalTrimmed(120),
  dateOfBirth: optionalTrimmed(30),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: optionalTrimmed(255),
  nationalId: optionalTrimmed(30),
  insuranceNumber: optionalTrimmed(40)
});

export const createWalkInSchema = z.object({
  patientId: optionalTrimmed(100),
  fullName: optionalTrimmed(120),
  phone: optionalTrimmed(20),
  email: optionalTrimmed(120),
  dateOfBirth: optionalTrimmed(30),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: optionalTrimmed(255),
  nationalId: optionalTrimmed(30),
  insuranceNumber: optionalTrimmed(40),
  newPatient: newWalkInPatientSchema.optional(),
  doctorId: z
    .string({ required_error: 'Vui lòng chọn bác sĩ khám' })
    .trim()
    .min(1, 'Vui lòng chọn bác sĩ khám'),
  date: optionalTrimmed(30),
  session: z.enum(['MORNING', 'AFTERNOON']).default('MORNING'),
  isPriority: z.boolean().optional().default(false),
  chiefComplaint: optionalTrimmed(500),
  autoCheckIn: z.boolean().optional().default(true)
});

export const listProceduresQuerySchema = z.object({
  appointmentId: z.string().trim().optional(),
  date: z.string().trim().optional()
});

const vitalsSchema = z.object({
  bloodPressureSystolic: z.coerce.number().positive().optional(),
  bloodPressureDiastolic: z.coerce.number().positive().optional(),
  heartRate: z.coerce.number().positive().optional(),
  temperature: z.coerce.number().positive().optional(),
  spo2: z.coerce.number().min(0).max(100).optional(),
  respiratoryRate: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  bmi: z.coerce.number().positive().optional()
});

const checklistSchema = z.object({
  bhytVerified: z.boolean().optional(),
  identityVerified: z.boolean().optional(),
  allergyScreened: z.boolean().optional(),
  consentSigned: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        label: z.string().trim(),
        checked: z.boolean()
      })
    )
    .optional()
});

export const saveProcedureSchema = z.object({
  appointmentId: optionalTrimmed(100),
  vitals: vitalsSchema.optional(),
  // Hỗ trợ truyền phẳng các chỉ số sinh hiệu nếu gọi từ endpoint /:id/triage
  bloodPressureSystolic: z.coerce.number().positive().optional(),
  bloodPressureDiastolic: z.coerce.number().positive().optional(),
  heartRate: z.coerce.number().positive().optional(),
  temperature: z.coerce.number().positive().optional(),
  spo2: z.coerce.number().min(0).max(100).optional(),
  respiratoryRate: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  bmi: z.coerce.number().positive().optional(),
  checklistData: checklistSchema.optional(),
  triageNotes: optionalTrimmed(500)
});

function parseValidDateString(rawDate?: string, fieldLabel = 'Ngày khám'): Date {
  const dateStr = rawDate?.trim() || getTodayDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw badRequest(`${fieldLabel} phải theo định dạng YYYY-MM-DD`);
  }
  const parsed = toDateOnly(dateStr);
  if (parsed.toISOString().slice(0, 10) !== dateStr) {
    throw badRequest(`${fieldLabel} không hợp lệ`);
  }
  return parsed;
}

function parseOptionalDob(rawDob?: string): Date | null {
  if (!rawDob) return null;
  const trimmed = rawDob.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw badRequest('Ngày sinh phải theo định dạng YYYY-MM-DD');
  }
  const parsed = toDateOnly(trimmed);
  if (parsed.toISOString().slice(0, 10) !== trimmed || parsed > new Date()) {
    throw badRequest('Ngày sinh không hợp lệ');
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// 3. Nghiệp vụ Tiếp đón, Check-in & Walk-in (TV4-02)
// ---------------------------------------------------------------------------

async function handleSearchPatients(req: Request, res: Response) {
  const { search } = req.query as z.infer<typeof searchPatientsQuerySchema>;
  const keyword = search?.trim();

  const where: Prisma.PatientWhereInput = keyword
    ? {
        OR: [
          { patientCode: { contains: keyword, mode: 'insensitive' } },
          { nationalId: { contains: keyword, mode: 'insensitive' } },
          { insuranceNumber: { contains: keyword, mode: 'insensitive' } },
          { user: { fullName: { contains: keyword, mode: 'insensitive' } } },
          { user: { phone: { contains: keyword, mode: 'insensitive' } } },
          { user: { email: { contains: keyword, mode: 'insensitive' } } }
        ]
      }
    : {};

  const patients = await prisma.patient.findMany({
    where,
    include: PATIENT_SUMMARY_INCLUDE,
    orderBy: [{ createdAt: 'desc' }],
    take: 50
  });

  return sendSuccess(res, patients.map(mapPatientToSummaryDto), 200);
}

async function handleListReceptionAppointments(req: Request, res: Response) {
  const query = req.query as z.infer<typeof listReceptionAppointmentsQuerySchema>;

  const where: Prisma.AppointmentWhereInput = {};

  if (query.date && query.date.toUpperCase() !== 'ALL') {
    where.appointmentDate = parseValidDateString(query.date, 'Ngày tra cứu');
  } else if (!query.date) {
    where.appointmentDate = toDateOnly(getTodayDateString());
  }

  if (query.session && query.session !== 'ALL') {
    where.session = query.session;
  }

  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.doctorId) {
    where.doctorId = query.doctorId;
  }

  if (query.departmentId) {
    where.departmentId = query.departmentId;
  }

  const keyword = query.search?.trim();
  if (keyword) {
    const orFilters: Prisma.AppointmentWhereInput[] = [
      { appointmentCode: { contains: keyword, mode: 'insensitive' } },
      { chiefComplaint: { contains: keyword, mode: 'insensitive' } },
      { patient: { patientCode: { contains: keyword, mode: 'insensitive' } } },
      { patient: { user: { fullName: { contains: keyword, mode: 'insensitive' } } } },
      { patient: { user: { phone: { contains: keyword, mode: 'insensitive' } } } },
      { doctor: { doctorCode: { contains: keyword, mode: 'insensitive' } } },
      { doctor: { user: { fullName: { contains: keyword, mode: 'insensitive' } } } }
    ];

    const sttMatch = keyword.match(/^(?:#|stt\s*#?)?0*(\d+)$/i);
    if (sttMatch) {
      const parsedStt = Number(sttMatch[1]);
      if (Number.isInteger(parsedStt) && parsedStt > 0) {
        orFilters.push({ queueNumber: parsedStt });
      }
    }

    where.OR = orFilters;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: APPOINTMENT_DETAIL_INCLUDE,
    orderBy: [{ session: 'asc' }, { isPriority: 'desc' }, { queueNumber: 'asc' }]
  });

  const liveSttMap = await computeLiveCurrentSttMap(appointments);

  const data = appointments.map((apt) => {
    const key = `${apt.doctorId}|${formatDateOnly(apt.appointmentDate)}|${apt.session}`;
    return mapAppointmentToDto(apt, liveSttMap.get(key) ?? null);
  });

  return sendSuccess(res, data, 200);
}

async function performAppointmentCheckIn(appointmentId: string): Promise<AppointmentDto> {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      ...APPOINTMENT_DETAIL_INCLUDE,
      patient: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true
            }
          }
        }
      }
    }
  });

  if (!existing) {
    throw notFound('Không tìm thấy lịch hẹn cần check-in');
  }

  if (existing.status === 'CANCELLED' || existing.status === 'NO_SHOW') {
    throw conflict('Lịch hẹn đã bị hủy hoặc đánh dấu vắng mặt, không thể check-in');
  }

  if (existing.status === 'IN_PROGRESS' || existing.status === 'COMPLETED') {
    throw conflict('Lịch hẹn đang được khám hoặc đã hoàn thành, không thể check-in');
  }

  if (existing.status === 'CHECKED_IN') {
    throw conflict('Lịch hẹn này đã được check-in trước đó');
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const checkedIn = await tx.appointment.update({
      where: { id: existing.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now
      },
      include: APPOINTMENT_DETAIL_INCLUDE
    });

    const sttFormatted = `#${String(checkedIn.queueNumber).padStart(2, '0')}`;
    const roomPart = checkedIn.doctor.room?.name ? ` (${checkedIn.doctor.room.name})` : '';

    await tx.notification.create({
      data: {
        userId: existing.patient.userId,
        title: `Check-in thành công • STT ${sttFormatted}`,
        message: `Bạn đã check-in tại khoa ${checkedIn.department.name}${roomPart} với ${checkedIn.doctor.user.fullName}. Giờ khám dự kiến: ${checkedIn.estimatedTime}.`,
        type: 'APPOINTMENT',
        payload: {
          appointmentId: checkedIn.id,
          appointmentCode: checkedIn.appointmentCode,
          queueNumber: checkedIn.queueNumber,
          status: 'CHECKED_IN'
        }
      }
    });

    return checkedIn;
  });

  const liveCurrentStt = await getLiveCurrentSttForAppointment(updated);
  return mapAppointmentToDto(updated, liveCurrentStt);
}

async function handleCheckInLookup(req: Request, res: Response) {
  const input = req.body as z.infer<typeof checkInLookupSchema>;

  let targetAppointmentId: string | null = null;

  if (input.appointmentId) {
    targetAppointmentId = input.appointmentId;
  } else if (input.appointmentCode) {
    const foundByCode = await prisma.appointment.findFirst({
      where: {
        appointmentCode: {
          equals: input.appointmentCode.trim(),
          mode: 'insensitive'
        }
      },
      select: { id: true }
    });
    if (!foundByCode) {
      throw notFound(`Không tìm thấy lịch hẹn với mã: ${input.appointmentCode}`);
    }
    targetAppointmentId = foundByCode.id;
  } else if (input.queueNumber !== undefined) {
    const targetDate = parseValidDateString(input.date, 'Ngày khám');
    const whereLookup: Prisma.AppointmentWhereInput = {
      appointmentDate: targetDate,
      queueNumber: input.queueNumber,
      status: { not: 'CANCELLED' }
    };

    if (input.doctorId) {
      whereLookup.doctorId = input.doctorId;
    }
    if (input.session) {
      whereLookup.session = input.session;
    }

    const matches = await prisma.appointment.findMany({
      where: whereLookup,
      select: { id: true, status: true },
      orderBy: [{ createdAt: 'asc' }]
    });

    if (matches.length === 0) {
      throw notFound('Không tìm thấy lịch hẹn khớp với Số thứ tự (STT) đã chọn');
    }

    const bookedMatch = matches.find((m) => m.status === 'BOOKED') ?? matches[0];
    targetAppointmentId = bookedMatch.id;
  } else {
    throw badRequest(
      'Vui lòng nhập mã lịch hẹn (appointmentCode), ID lịch hẹn (appointmentId) hoặc Số thứ tự (queueNumber)'
    );
  }

  const dto = await performAppointmentCheckIn(targetAppointmentId);
  return sendSuccess(res, dto, 200);
}

async function handleCheckInById(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    throw badRequest('Thiếu ID lịch hẹn cần check-in');
  }
  const dto = await performAppointmentCheckIn(id);
  return sendSuccess(res, dto, 200);
}

async function handleCreateWalkIn(req: Request, res: Response) {
  const input = req.body as z.infer<typeof createWalkInSchema>;
  const appointmentDate = parseValidDateString(input.date, 'Ngày khám');
  const session: SessionType = input.session || 'MORNING';
  const shouldAutoCheckIn = input.autoCheckIn !== false;

  const newPatientPayload =
    input.newPatient ??
    (input.fullName
      ? {
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          address: input.address,
          nationalId: input.nationalId,
          insuranceNumber: input.insuranceNumber
        }
      : undefined);

  if (!input.patientId && !newPatientPayload) {
    throw badRequest(
      'Vui lòng chọn bệnh nhân đã có hồ sơ (patientId) hoặc nhập họ tên bệnh nhân mới (fullName / newPatient)'
    );
  }

  const parsedDob = parseOptionalDob(newPatientPayload?.dateOfBirth);
  const defaultPasswordHash = !input.patientId
    ? await bcrypt.hash('123456', BCRYPT_SALT_ROUNDS)
    : null;

  const createdAppointment = await prisma.$transaction(async (tx) => {
    const doctor = await tx.doctor.findUnique({
      where: { id: input.doctorId },
      include: {
        user: { select: { fullName: true, isActive: true } },
        department: { select: { id: true, name: true } },
        room: { select: { name: true } }
      }
    });

    if (!doctor || !doctor.user.isActive) {
      throw notFound('Không tìm thấy bác sĩ khám hoặc bác sĩ không còn hoạt động');
    }

    let resolvedPatientId: string;
    let resolvedPatientUserId: string;

    if (input.patientId) {
      const existingPatient = await tx.patient.findUnique({
        where: { id: input.patientId },
        select: { id: true, userId: true }
      });
      if (!existingPatient) {
        throw notFound('Không tìm thấy hồ sơ bệnh nhân đã chọn');
      }
      resolvedPatientId = existingPatient.id;
      resolvedPatientUserId = existingPatient.userId;
    } else {
      const pInfo = newPatientPayload!;
      let emailToUse = pInfo.email?.toLowerCase();

      if (emailToUse) {
        const emailExists = await tx.user.findFirst({
          where: { email: { equals: emailToUse, mode: 'insensitive' } },
          select: { id: true }
        });
        if (emailExists) {
          emailToUse = undefined;
        }
      }

      if (!emailToUse) {
        const randHex = crypto.randomBytes(3).toString('hex').toLowerCase();
        emailToUse = `walkin.${Date.now()}.${randHex}@antam.vn`;
      }

      const patientCode = generateHospitalCode('BN');
      const createdUser = await tx.user.create({
        data: {
          email: emailToUse,
          passwordHash: defaultPasswordHash!,
          fullName: pInfo.fullName,
          phone: pInfo.phone ?? null,
          role: Role.PATIENT,
          isActive: true,
          patientProfile: {
            create: {
              patientCode,
              dateOfBirth: parsedDob,
              gender: pInfo.gender ?? null,
              address: pInfo.address ?? null,
              nationalId: pInfo.nationalId ?? null,
              insuranceNumber: pInfo.insuranceNumber ?? null
            }
          }
        },
        include: { patientProfile: true }
      });

      resolvedPatientId = createdUser.patientProfile!.id;
      resolvedPatientUserId = createdUser.id;
    }

    const bounds = getSessionBounds(session);
    const ensuredSchedule = await tx.doctorSchedule.upsert({
      where: {
        doctorId_scheduleDate_session: {
          doctorId: doctor.id,
          scheduleDate: appointmentDate,
          session
        }
      },
      update: {},
      create: {
        doctorId: doctor.id,
        scheduleDate: appointmentDate,
        session,
        startTime: bounds.startTime,
        endTime: bounds.endTime,
        maxPatients: 20,
        avgMinutesPerPatient: 12,
        lastQueueNumber: 0,
        isAvailable: true
      }
    });

    // Khóa dòng lịch trực để cấp STT tuần tự không bị trùng khi nhiều quầy gọi cùng lúc
    const lockedSchedules = await tx.$queryRaw<
      Array<{
        id: string;
        max_patients: number;
        avg_minutes_per_patient: number;
        last_queue_number: number;
        is_available: boolean;
      }>
    >`
      SELECT id, max_patients, avg_minutes_per_patient, last_queue_number, is_available
      FROM doctor_schedules
      WHERE id = ${ensuredSchedule.id}
      FOR UPDATE
    `;

    const scheduleRow = lockedSchedules[0];
    if (!scheduleRow) {
      throw notFound('Không tìm thấy lịch trực của bác sĩ trong buổi đã chọn');
    }

    if (!scheduleRow.is_available) {
      throw conflict('Buổi khám của bác sĩ hiện đang tạm ngưng tiếp nhận');
    }

    const duplicateActive = await tx.appointment.findFirst({
      where: {
        patientId: resolvedPatientId,
        doctorId: doctor.id,
        appointmentDate,
        session,
        status: { not: 'CANCELLED' }
      },
      select: { id: true, appointmentCode: true, queueNumber: true }
    });

    if (duplicateActive) {
      throw conflict(
        `Bệnh nhân đã có lịch khám hiệu lực (${duplicateActive.appointmentCode} • STT #${String(
          duplicateActive.queueNumber
        ).padStart(2, '0')}) với bác sĩ này trong cùng buổi`,
        duplicateActive,
        'DUPLICATE_BOOKING'
      );
    }

    const activeBookedCount = await tx.appointment.count({
      where: {
        doctorId: doctor.id,
        appointmentDate,
        session,
        status: { not: 'CANCELLED' }
      }
    });

    if (!input.isPriority && activeBookedCount >= scheduleRow.max_patients) {
      throw conflict('Buổi khám của bác sĩ đã đầy số lượng tiếp nhận tối đa');
    }

    const maxSttAgg = await tx.appointment.aggregate({
      where: {
        doctorId: doctor.id,
        appointmentDate,
        session
      },
      _max: {
        queueNumber: true
      }
    });

    const currentMaxStt = Math.max(
      scheduleRow.last_queue_number ?? 0,
      maxSttAgg._max.queueNumber ?? 0
    );
    const nextQueueNumber = currentMaxStt + 1;

    await tx.doctorSchedule.update({
      where: { id: scheduleRow.id },
      data: { lastQueueNumber: nextQueueNumber }
    });

    const estimatedTime = computeEstimatedTime(
      session,
      nextQueueNumber,
      scheduleRow.avg_minutes_per_patient || 12
    );

    const now = new Date();
    const appointmentCode = generateHospitalCode('LH');

    const created = await tx.appointment.create({
      data: {
        appointmentCode,
        patientId: resolvedPatientId,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        scheduleId: scheduleRow.id,
        appointmentDate,
        session,
        queueNumber: nextQueueNumber,
        estimatedTime,
        bookingType: 'WALK_IN',
        bookingFlow: 'WALK_IN',
        status: shouldAutoCheckIn ? 'CHECKED_IN' : 'BOOKED',
        isPriority: Boolean(input.isPriority),
        chiefComplaint: input.chiefComplaint ?? null,
        checkedInAt: shouldAutoCheckIn ? now : null
      },
      include: APPOINTMENT_DETAIL_INCLUDE
    });

    const sttFormatted = `#${String(created.queueNumber).padStart(2, '0')}`;
    const roomPart = doctor.room?.name ? ` (${doctor.room.name})` : '';

    await tx.notification.create({
      data: {
        userId: resolvedPatientUserId,
        title: `Đăng ký khám Walk-in • STT ${sttFormatted}`,
        message: `Bạn đã được tiếp nhận khám tại khoa ${doctor.department.name}${roomPart} với ${doctor.user.fullName}. Giờ khám dự kiến: ${created.estimatedTime}.`,
        type: 'APPOINTMENT',
        payload: {
          appointmentId: created.id,
          appointmentCode: created.appointmentCode,
          queueNumber: created.queueNumber,
          isPriority: created.isPriority,
          status: created.status
        }
      }
    });

    return created;
  });

  const liveCurrentStt = await getLiveCurrentSttForAppointment(createdAppointment);
  return sendSuccess(res, mapAppointmentToDto(createdAppointment, liveCurrentStt), 201);
}

// ---------------------------------------------------------------------------
// 4. Nghiệp vụ Đo sinh hiệu Triage & Thủ thuật BHYT (TV4-03)
// ---------------------------------------------------------------------------

/** Danh sách các lượt đo sinh hiệu / thủ thuật điều dưỡng đã thực hiện. */
async function handleListProcedures(req: Request, res: Response) {
  const query = req.query as z.infer<typeof listProceduresQuerySchema>;
  const where: Prisma.AppointmentWhereInput = {
    triageData: {
      not: Prisma.DbNull
    }
  };

  if (query.appointmentId) {
    where.id = query.appointmentId;
  } else if (query.date && query.date.toUpperCase() !== 'ALL') {
    where.appointmentDate = parseValidDateString(query.date, 'Ngày tra cứu');
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ appointmentDate: 'desc' }, { queueNumber: 'asc' }]
  });

  const procedures: NursingProcedureDto[] = [];
  for (const apt of appointments) {
    const proc = parseTriageProcedure(apt.id, apt.triageData);
    if (proc) {
      procedures.push(proc);
    }
  }

  return sendSuccess(res, procedures, 200);
}

/**
 * Ghi nhận hoặc cập nhật chỉ số sinh hiệu Triage (tự tính BMI) & checklist BHYT JSONB.
 * Nếu bệnh nhân còn ở trạng thái BOOKED thì tự động chuyển sang CHECKED_IN để vào hàng đợi bác sĩ.
 */
async function handleSaveProcedure(req: Request, res: Response) {
  const input = req.body as z.infer<typeof saveProcedureSchema>;
  const appointmentId = req.params.id || input.appointmentId;

  if (!appointmentId) {
    throw badRequest('Vui lòng cung cấp ID lịch hẹn (appointmentId) cần ghi nhận sinh hiệu');
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId }
  });

  if (!existing) {
    throw notFound('Không tìm thấy lịch hẹn cần đo sinh hiệu');
  }

  if (existing.status === 'CANCELLED' || existing.status === 'NO_SHOW') {
    throw conflict('Không thể ghi nhận sinh hiệu cho lịch hẹn đã hủy hoặc vắng mặt');
  }

  const nurse = await prisma.nurse.findUnique({
    where: { userId: req.user!.userId },
    include: { user: { select: { fullName: true } } }
  });

  // Gom dữ liệu vitals từ object con `vitals` hoặc từ các trường phẳng
  const rawVitals: VitalsData = {
    ...(input.vitals || {}),
    ...(input.bloodPressureSystolic !== undefined
      ? { bloodPressureSystolic: input.bloodPressureSystolic }
      : {}),
    ...(input.bloodPressureDiastolic !== undefined
      ? { bloodPressureDiastolic: input.bloodPressureDiastolic }
      : {}),
    ...(input.heartRate !== undefined ? { heartRate: input.heartRate } : {}),
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.spo2 !== undefined ? { spo2: input.spo2 } : {}),
    ...(input.respiratoryRate !== undefined ? { respiratoryRate: input.respiratoryRate } : {}),
    ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
    ...(input.bmi !== undefined ? { bmi: input.bmi } : {})
  };

  // Tự tính lại BMI = cân nặng (kg) / (chiều cao (m))^2 nếu có đủ chiều cao & cân nặng
  if (rawVitals.heightCm && rawVitals.weightKg && rawVitals.heightCm > 0) {
    const heightM = rawVitals.heightCm / 100;
    rawVitals.bmi = Number((rawVitals.weightKg / (heightM * heightM)).toFixed(1));
  }

  const prevProcedure = parseTriageProcedure(existing.id, existing.triageData);
  const now = new Date();

  const mergedChecklist: ChecklistData = input.checklistData ??
    prevProcedure?.checklistData ?? {
      bhytVerified: true,
      identityVerified: true,
      allergyScreened: true,
      consentSigned: true
    };

  const triagePayload: TriageDataJson = {
    id: prevProcedure?.id || crypto.randomUUID(),
    nurseId: nurse?.id || req.user!.userId,
    nurseName: nurse?.user.fullName || 'Điều dưỡng',
    vitals: {
      ...(prevProcedure?.vitals || {}),
      ...rawVitals
    },
    checklistData: mergedChecklist,
    triageNotes:
      input.triageNotes !== undefined
        ? input.triageNotes || null
        : prevProcedure?.triageNotes ?? null,
    recordedAt: now.toISOString()
  };

  // Nếu lịch hẹn đang ở BOOKED mà bệnh nhân đã vào đo sinh hiệu thì chuyển sang CHECKED_IN luôn
  const shouldAutoCheckIn = existing.status === 'BOOKED';

  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      triageData: triagePayload as unknown as Prisma.InputJsonValue,
      ...(shouldAutoCheckIn
        ? {
            status: 'CHECKED_IN',
            checkedInAt: existing.checkedInAt ?? now
          }
        : {})
    }
  });

  const responseDto: NursingProcedureDto = {
    id: triagePayload.id,
    appointmentId: existing.id,
    nurseId: triagePayload.nurseId,
    nurseName: triagePayload.nurseName,
    vitals: triagePayload.vitals,
    checklistData: triagePayload.checklistData,
    triageNotes: triagePayload.triageNotes,
    recordedAt: triagePayload.recordedAt
  };

  return sendSuccess(res, responseDto, 200);
}

// ---------------------------------------------------------------------------
// 5. Đăng ký Routes Cổng Điều dưỡng (/api/nurse)
// ---------------------------------------------------------------------------

// --- [TV4-02] Tiếp đón, Tìm kiếm BN, Check-in & Đăng ký vãng lai Walk-in ---
router.get(
  '/patients',
  validateQuery(searchPatientsQuerySchema),
  asyncHandler(handleSearchPatients)
);
router.get(
  '/reception/patients/search',
  validateQuery(searchPatientsQuerySchema),
  asyncHandler(handleSearchPatients)
);

router.get(
  '/appointments',
  validateQuery(listReceptionAppointmentsQuerySchema),
  asyncHandler(handleListReceptionAppointments)
);
router.get(
  '/reception/appointments',
  validateQuery(listReceptionAppointmentsQuerySchema),
  asyncHandler(handleListReceptionAppointments)
);

router.post(
  '/appointments/check-in',
  validateBody(checkInLookupSchema),
  asyncHandler(handleCheckInLookup)
);
router.post(
  '/reception/check-in',
  validateBody(checkInLookupSchema),
  asyncHandler(handleCheckInLookup)
);

router.patch('/appointments/:id/check-in', asyncHandler(handleCheckInById));
router.post('/appointments/:id/check-in', asyncHandler(handleCheckInById));

router.post(
  '/appointments/walk-in',
  validateBody(createWalkInSchema),
  asyncHandler(handleCreateWalkIn)
);
router.post(
  '/reception/walk-in',
  validateBody(createWalkInSchema),
  asyncHandler(handleCreateWalkIn)
);

// --- [TV4-03] Đo sinh hiệu Triage & Thủ thuật BHYT ---
router.get(
  '/procedures',
  validateQuery(listProceduresQuerySchema),
  asyncHandler(handleListProcedures)
);
router.post(
  '/procedures',
  validateBody(saveProcedureSchema),
  asyncHandler(handleSaveProcedure)
);
router.post(
  '/appointments/:id/triage',
  validateBody(saveProcedureSchema),
  asyncHandler(handleSaveProcedure)
);
router.patch(
  '/appointments/:id/triage',
  validateBody(saveProcedureSchema),
  asyncHandler(handleSaveProcedure)
);

// --- [TV4-04] Thu ngân & Đối soát thanh toán nguyên tử ---
router.get(
  '/payments',
  validateQuery(paymentService.listNursePaymentsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const invoices = await paymentService.listNursePayments(
      req.query as paymentService.ListNursePaymentsQuery
    );
    return sendSuccess(res, invoices, 200);
  })
);
router.get(
  '/cashier/invoices',
  validateQuery(paymentService.listNursePaymentsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const invoices = await paymentService.listNursePayments(
      req.query as paymentService.ListNursePaymentsQuery
    );
    return sendSuccess(res, invoices, 200);
  })
);
router.post(
  '/payments/:id/confirm',
  validateBody(paymentService.confirmPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.confirmNursePayment(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, result, 200);
  })
);
router.post(
  '/payments/:id/reject',
  validateBody(paymentService.rejectPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.rejectNursePayment(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, result, 200);
  })
);

// --- [TV4-05] Cấp phát thuốc trừ kho & Điều phối giường bệnh nội trú ---
router.get(
  '/prescriptions',
  validateQuery(paymentService.listNursePrescriptionsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const prescriptions = await paymentService.listNursePrescriptions(
      req.query as paymentService.ListNursePrescriptionsQuery
    );
    return sendSuccess(res, prescriptions, 200);
  })
);
router.post(
  '/prescriptions/:id/dispense',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentService.dispenseNursePrescription(
      req.user!.userId,
      req.params.id
    );
    return sendSuccess(res, result, 200);
  })
);

router.get(
  '/beds',
  validateQuery(bedService.listBedsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bedsData = await bedService.listBedsWithStats(
      req.query as bedService.ListBedsQuery
    );
    return sendSuccess(res, bedsData, 200);
  })
);
router.post(
  '/beds/:id/admit',
  validateBody(bedService.admitBedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bed = await bedService.admitPatientToBed(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, bed, 200);
  })
);
router.post(
  '/beds/:id/assign',
  validateBody(bedService.admitBedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bed = await bedService.admitPatientToBed(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, bed, 200);
  })
);
router.post(
  '/beds/:id/transfer',
  validateBody(bedService.transferBedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bed = await bedService.transferPatientBed(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, bed, 200);
  })
);
router.post(
  '/beds/:id/discharge',
  validateBody(bedService.dischargeBedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bed = await bedService.dischargePatientFromBed(
      req.user!.userId,
      req.params.id,
      req.body
    );
    return sendSuccess(res, bed, 200);
  })
);
router.patch(
  '/beds/:id/status',
  validateBody(bedService.updateBedStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const bed = await bedService.updateBedStatus(req.params.id, req.body);
    return sendSuccess(res, bed, 200);
  })
);

// Cảnh báo đỏ 501 cho bất kỳ route nào chưa được cài đặt
router.all('*', (_req: Request, res: Response) => {
  return sendError(
    res,
    501,
    'NOT_IMPLEMENTED',
    'Chức năng này chưa được cài đặt — xem backend/API_CONTRACT.md'
  );
});

export default router;
