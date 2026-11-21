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

const router = Router();

router.use(authenticate, requireRole('NURSE'));

const BCRYPT_SALT_ROUNDS = 10;

// ============================================================================
// 1. DTO Interfaces & Prisma Includes cho Tiếp đón / Lịch hẹn (TV4-01 & TV4-02)
// ============================================================================

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

  // Ưu tiên STT đang IN_PROGRESS; nếu không có thì lấy STT COMPLETED lớn nhất
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

// ============================================================================
// 2. Zod Validation Schemas cho Tiếp đón & Walk-in (TV4-02)
// ============================================================================

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
  // Hỗ trợ truyền phẳng hoặc truyền qua object newPatient theo API_CONTRACT.md
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

// ============================================================================
// 3. Xử lý nghiệp vụ Tiếp đón, Check-in & Walk-in (TV4-02)
// ============================================================================

/**
 * Tìm kiếm hồ sơ bệnh nhân nhanh tại quầy tiếp đón hoặc khi xếp giường nội trú.
 */
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

/**
 * Danh sách tiếp đón trong ngày (tìm theo mã hẹn / mã BN / họ tên / SĐT / STT).
 */
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

    // Hỗ trợ tìm theo STT dạng "3", "03", "#03", "STT 3"
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

/**
 * Thực hiện chuyển trạng thái lịch hẹn sang CHECKED_IN và tạo thông báo cho bệnh nhân.
 */
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

/**
 * Check-in nhanh theo appointmentId, appointmentCode, hoặc tổ hợp (queueNumber + doctorId + date + session).
 */
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

    // Ưu tiên bản ghi đang ở trạng thái BOOKED nếu có
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

/**
 * Check-in lịch hẹn trực tiếp theo ID trên dòng danh sách.
 */
async function handleCheckInById(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    throw badRequest('Thiếu ID lịch hẹn cần check-in');
  }
  const dto = await performAppointmentCheckIn(id);
  return sendSuccess(res, dto, 200);
}

/**
 * Đăng ký khám vãng lai tại quầy (Walk-in):
 * - Hỗ trợ bệnh nhân đã có hồ sơ (patientId) hoặc tạo mới bệnh nhân ngay tại quầy (newPatient / flat fields)
 * - Khóa dòng lịch trực bác sĩ (SELECT ... FOR UPDATE) để cấp STT tuần tự chống trùng
 * - Hỗ trợ cờ ưu tiên (isPriority) và tự động check-in đưa vào hàng đợi bác sĩ
 */
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
    // 1. Kiểm tra bác sĩ tồn tại
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

    // 2. Xác định hoặc tạo mới hồ sơ bệnh nhân
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

    // 3. Đảm bảo có bản ghi lịch trực (doctor_schedules) cho (doctorId, appointmentDate, session)
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

    // 4. Khóa dòng lịch trực bằng SELECT ... FOR UPDATE để cấp STT nguyên tử chống trùng
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

    // 5. Chặn đặt trùng cùng bệnh nhân + cùng bác sĩ + cùng ngày + cùng buổi (còn hiệu lực)
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

    // 6. Kiểm tra giới hạn số lượng bệnh nhân trong buổi (trừ trường hợp cấp cứu/ưu tiên nếu cần)
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

    // 7. Tính STT tiếp theo (không giảm khi có lịch hủy)
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

// ============================================================================
// 4. Đăng ký Routes cho Cổng Điều dưỡng (/api/nurse)
// ============================================================================

function notImplementedYet(taskCode: string, description: string) {
  return (_req: Request, res: Response) =>
    sendError(
      res,
      501,
      'NOT_IMPLEMENTED',
      `Chức năng ${description} (${taskCode}) thuộc Giai đoạn 2 — xem backend/API_CONTRACT.md`
    );
}

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

// --- [TV4-01 Framework -> TV4-03] Đo sinh hiệu Triage & Thủ thuật BHYT ---
router.get(
  '/procedures',
  notImplementedYet('TV4-03', 'Danh sách thủ thuật & sinh hiệu Triage')
);
router.post(
  '/procedures',
  notImplementedYet('TV4-03', 'Ghi nhận chỉ số sinh hiệu Triage & checklist BHYT')
);
router.post(
  '/appointments/:id/triage',
  notImplementedYet('TV4-03', 'Ghi nhận chỉ số sinh hiệu Triage & checklist BHYT')
);

// --- [TV4-01 Framework -> TV4-04] Thu ngân & Đối soát thanh toán ---
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
  notImplementedYet('TV4-04', 'Thu ngân xác nhận thanh toán nguyên tử')
);
router.post(
  '/payments/:id/reject',
  validateBody(paymentService.rejectPaymentSchema),
  notImplementedYet('TV4-04', 'Thu ngân từ chối yêu cầu thanh toán QR')
);

// --- [TV4-01 Framework -> TV4-05] Cấp phát thuốc & Điều phối giường bệnh ---
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
  notImplementedYet('TV4-05', 'Cấp phát đơn thuốc & trừ tồn kho')
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
  notImplementedYet('TV4-05', 'Tiếp nhận bệnh nhân vào giường nội trú')
);
router.post(
  '/beds/:id/assign',
  validateBody(bedService.admitBedSchema),
  notImplementedYet('TV4-05', 'Tiếp nhận bệnh nhân vào giường nội trú')
);
router.post(
  '/beds/:id/transfer',
  validateBody(bedService.transferBedSchema),
  notImplementedYet('TV4-05', 'Chuyển giường nội trú cho bệnh nhân')
);
router.post(
  '/beds/:id/discharge',
  validateBody(bedService.dischargeBedSchema),
  notImplementedYet('TV4-05', 'Làm thủ tục xuất viện & trả giường')
);
router.patch(
  '/beds/:id/status',
  validateBody(bedService.updateBedStatusSchema),
  notImplementedYet('TV4-05', 'Cập nhật trạng thái giường trống / bảo trì')
);

export default router;
