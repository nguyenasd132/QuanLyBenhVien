import crypto from 'crypto';
import { BedStatus, Gender, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { BedAssignmentHistoryJson } from '../types';
import { formatDateOnly } from '../utils/date';
import { badRequest, conflict, notFound } from '../utils/errors';

// ---------------------------------------------------------------------------
// 1. DTO Interfaces (Theo đặc tả backend/API_CONTRACT.md)
// ---------------------------------------------------------------------------

export interface BedDto {
  id: string;
  bedNumber: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  floor: string | null;
  departmentId: string;
  departmentName: string;
  status: BedStatus;
  admittedAt: string | null;
  notes: string | null;
  currentPatient: {
    id: string;
    patientCode: string;
    fullName: string;
    gender: Gender | null;
    dateOfBirth: string | null;
    phone: string | null;
  } | null;
}

export interface DepartmentBedStatsDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
}

export interface BedSummaryStatsDto {
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
}

export interface NurseBedsResponseDto {
  summary: BedSummaryStatsDto;
  byDepartment: DepartmentBedStatsDto[];
  beds: BedDto[];
}

// ---------------------------------------------------------------------------
// 2. Zod Schemas
// ---------------------------------------------------------------------------

export const listBedsQuerySchema = z.object({
  departmentId: z.string().trim().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).optional(),
  search: z.string().trim().optional()
});

export const admitBedSchema = z.object({
  patientId: z
    .string({ required_error: 'Vui lòng chọn bệnh nhân nhập viện' })
    .trim()
    .min(1, 'Vui lòng chọn bệnh nhân nhập viện'),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export const transferBedSchema = z.object({
  targetBedId: z
    .string({ required_error: 'Vui lòng chọn giường đích cần chuyển đến' })
    .trim()
    .min(1, 'Vui lòng chọn giường đích cần chuyển đến'),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export const dischargeBedSchema = z.object({
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export const updateBedStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'MAINTENANCE'], {
    required_error: 'Trạng thái giường phải là AVAILABLE hoặc MAINTENANCE'
  }),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export type ListBedsQuery = z.infer<typeof listBedsQuerySchema>;
export type AdmitBedInput = z.infer<typeof admitBedSchema>;
export type TransferBedInput = z.infer<typeof transferBedSchema>;
export type DischargeBedInput = z.infer<typeof dischargeBedSchema>;
export type UpdateBedStatusInput = z.infer<typeof updateBedStatusSchema>;

// ---------------------------------------------------------------------------
// 3. Prisma Includes & Mappers
// ---------------------------------------------------------------------------

export const BED_DETAIL_INCLUDE = {
  room: {
    select: {
      id: true,
      code: true,
      name: true,
      floor: true
    }
  },
  department: {
    select: {
      id: true,
      code: true,
      name: true
    }
  },
  currentPatient: {
    include: {
      user: {
        select: {
          fullName: true,
          phone: true
        }
      }
    }
  }
} satisfies Prisma.BedInclude;

export type BedWithDetails = Prisma.BedGetPayload<{
  include: typeof BED_DETAIL_INCLUDE;
}>;

export function mapBedToDto(bed: BedWithDetails): BedDto {
  return {
    id: bed.id,
    bedNumber: bed.bedNumber,
    roomId: bed.roomId,
    roomCode: bed.room.code,
    roomName: bed.room.name,
    floor: bed.room.floor,
    departmentId: bed.departmentId,
    departmentName: bed.department.name,
    status: bed.status,
    admittedAt: bed.admittedAt ? bed.admittedAt.toISOString() : null,
    notes: bed.notes,
    currentPatient: bed.currentPatient
      ? {
          id: bed.currentPatient.id,
          patientCode: bed.currentPatient.patientCode,
          fullName: bed.currentPatient.user.fullName,
          gender: bed.currentPatient.gender,
          dateOfBirth: bed.currentPatient.dateOfBirth
            ? formatDateOnly(bed.currentPatient.dateOfBirth)
            : null,
          phone: bed.currentPatient.user.phone
        }
      : null
  };
}

function calcOccupancyRate(occupied: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((occupied / total) * 100);
}

function parseAssignmentHistory(raw: Prisma.JsonValue | null | undefined): BedAssignmentHistoryJson[] {
  return Array.isArray(raw) ? (raw as unknown as BedAssignmentHistoryJson[]) : [];
}

// ---------------------------------------------------------------------------
// 4. Nghiệp vụ Quản lý & Điều phối Giường bệnh Nội trú (TV4-01 & TV4-05)
// ---------------------------------------------------------------------------

/** Lấy sơ đồ giường bệnh kèm thống kê tổng quan và tỷ lệ lấp đầy theo từng khoa. */
export async function listBedsWithStats(query: ListBedsQuery): Promise<NurseBedsResponseDto> {
  const allBeds = await prisma.bed.findMany({
    include: BED_DETAIL_INCLUDE,
    orderBy: [{ bedNumber: 'asc' }]
  });

  const total = allBeds.length;
  const occupied = allBeds.filter((b) => b.status === 'OCCUPIED').length;
  const available = allBeds.filter((b) => b.status === 'AVAILABLE').length;
  const maintenance = allBeds.filter((b) => b.status === 'MAINTENANCE').length;

  const summary: BedSummaryStatsDto = {
    total,
    occupied,
    available,
    maintenance,
    occupancyRate: calcOccupancyRate(occupied, total)
  };

  const deptStatsMap = new Map<string, DepartmentBedStatsDto>();
  for (const bed of allBeds) {
    let entry = deptStatsMap.get(bed.departmentId);
    if (!entry) {
      entry = {
        departmentId: bed.department.id,
        departmentCode: bed.department.code,
        departmentName: bed.department.name,
        total: 0,
        occupied: 0,
        available: 0,
        maintenance: 0,
        occupancyRate: 0
      };
      deptStatsMap.set(bed.departmentId, entry);
    }
    entry.total += 1;
    if (bed.status === 'OCCUPIED') entry.occupied += 1;
    else if (bed.status === 'AVAILABLE') entry.available += 1;
    else if (bed.status === 'MAINTENANCE') entry.maintenance += 1;
  }

  const byDepartment = Array.from(deptStatsMap.values()).map((dept) => ({
    ...dept,
    occupancyRate: calcOccupancyRate(dept.occupied, dept.total)
  }));

  let filtered = allBeds;

  if (query.departmentId && query.departmentId !== 'ALL') {
    filtered = filtered.filter((b) => b.departmentId === query.departmentId);
  }

  if (query.status) {
    filtered = filtered.filter((b) => b.status === query.status);
  }

  const search = query.search?.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((b) => {
      const patientName = b.currentPatient?.user.fullName.toLowerCase() ?? '';
      const patientCode = b.currentPatient?.patientCode.toLowerCase() ?? '';
      const patientPhone = b.currentPatient?.user.phone?.toLowerCase() ?? '';
      return (
        b.bedNumber.toLowerCase().includes(search) ||
        b.room.name.toLowerCase().includes(search) ||
        b.room.code.toLowerCase().includes(search) ||
        b.department.name.toLowerCase().includes(search) ||
        patientName.includes(search) ||
        patientCode.includes(search) ||
        patientPhone.includes(search)
      );
    });
  }

  return {
    summary,
    byDepartment,
    beds: filtered.map(mapBedToDto)
  };
}

/**
 * Tiếp nhận bệnh nhân vào giường nội trú (Admit):
 * - Chặn nếu giường đang OCCUPIED hoặc MAINTENANCE
 * - Chặn nếu bệnh nhân đã nằm ở một giường khác
 * - Ghi lịch sử ADMIT vào cột assignment_history JSONB
 */
export async function admitPatientToBed(
  nurseUserId: string,
  bedId: string,
  input: AdmitBedInput
): Promise<BedDto> {
  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM beds WHERE id = ${bedId} FOR UPDATE
    `;

    const bed = await tx.bed.findUnique({
      where: { id: bedId }
    });

    if (!bed) {
      throw notFound('Không tìm thấy giường bệnh');
    }

    if (bed.status !== 'AVAILABLE' || bed.currentPatientId !== null) {
      throw conflict('Giường bệnh hiện đang có người nằm hoặc đang bảo trì, không thể xếp bệnh nhân');
    }

    const patient = await tx.patient.findUnique({
      where: { id: input.patientId },
      select: { id: true, patientCode: true }
    });

    if (!patient) {
      throw notFound('Không tìm thấy hồ sơ bệnh nhân cần nhập viện');
    }

    // Kiểm tra xem bệnh nhân có đang nằm ở giường nào khác không
    const occupiedBed = await tx.bed.findFirst({
      where: { currentPatientId: patient.id },
      select: { id: true, bedNumber: true }
    });

    if (occupiedBed) {
      throw conflict(
        `Bệnh nhân hiện đang nằm tại giường ${occupiedBed.bedNumber}, vui lòng sử dụng chức năng Chuyển giường`
      );
    }

    const now = new Date();
    const history = parseAssignmentHistory(bed.assignmentHistory);
    history.push({
      id: crypto.randomUUID(),
      patientId: patient.id,
      assignedByNurseId: nurse?.id ?? null,
      action: 'ADMIT',
      admittedAt: now.toISOString(),
      dischargedAt: null,
      notes: input.notes ?? null
    });

    const updated = await tx.bed.update({
      where: { id: bed.id },
      data: {
        status: 'OCCUPIED',
        currentPatientId: patient.id,
        admittedAt: now,
        notes: input.notes ?? null,
        assignmentHistory: history as unknown as Prisma.InputJsonValue
      },
      include: BED_DETAIL_INCLUDE
    });

    return mapBedToDto(updated);
  });
}

/**
 * Chuyển bệnh nhân từ giường đang nằm sang giường trống khác (Transfer):
 * - Giải phóng giường cũ về AVAILABLE (ghi lịch sử TRANSFER_OUT)
 * - Chuyển bệnh nhân sang giường đích OCCUPIED (ghi lịch sử TRANSFER_IN)
 */
export async function transferPatientBed(
  nurseUserId: string,
  sourceBedId: string,
  input: TransferBedInput
): Promise<BedDto> {
  if (sourceBedId === input.targetBedId) {
    throw badRequest('Giường chuyển đến phải khác giường hiện tại');
  }

  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    const sourceBed = await tx.bed.findUnique({
      where: { id: sourceBedId }
    });

    if (!sourceBed) {
      throw notFound('Không tìm thấy giường nguồn');
    }

    if (sourceBed.status !== 'OCCUPIED' || !sourceBed.currentPatientId) {
      throw conflict('Giường nguồn hiện không có bệnh nhân để chuyển');
    }

    const targetBed = await tx.bed.findUnique({
      where: { id: input.targetBedId }
    });

    if (!targetBed) {
      throw notFound('Không tìm thấy giường đích');
    }

    if (targetBed.status !== 'AVAILABLE' || targetBed.currentPatientId !== null) {
      throw conflict('Giường đích không còn trống, không thể chuyển bệnh nhân đến');
    }

    const patientId = sourceBed.currentPatientId;
    const now = new Date();
    const nowIso = now.toISOString();

    // Cập nhật lịch sử giường cũ và giải phóng currentPatientId trước (do cột current_patient_id là UNIQUE)
    const sourceHistory = parseAssignmentHistory(sourceBed.assignmentHistory).map((item) =>
      item.patientId === patientId && !item.dischargedAt
        ? { ...item, dischargedAt: nowIso }
        : item
    );
    sourceHistory.push({
      id: crypto.randomUUID(),
      patientId,
      assignedByNurseId: nurse?.id ?? null,
      action: 'TRANSFER_OUT',
      admittedAt: sourceBed.admittedAt ? sourceBed.admittedAt.toISOString() : null,
      dischargedAt: nowIso,
      notes: input.notes ?? `Chuyển sang giường ${targetBed.bedNumber}`
    });

    await tx.bed.update({
      where: { id: sourceBed.id },
      data: {
        status: 'AVAILABLE',
        currentPatientId: null,
        admittedAt: null,
        notes: null,
        assignmentHistory: sourceHistory as unknown as Prisma.InputJsonValue
      }
    });

    // Cập nhật lịch sử giường mới và gán bệnh nhân vào
    const targetHistory = parseAssignmentHistory(targetBed.assignmentHistory);
    targetHistory.push({
      id: crypto.randomUUID(),
      patientId,
      assignedByNurseId: nurse?.id ?? null,
      action: 'TRANSFER_IN',
      admittedAt: nowIso,
      dischargedAt: null,
      notes: input.notes ?? `Chuyển từ giường ${sourceBed.bedNumber}`
    });

    const updatedTarget = await tx.bed.update({
      where: { id: targetBed.id },
      data: {
        status: 'OCCUPIED',
        currentPatientId: patientId,
        admittedAt: sourceBed.admittedAt ?? now,
        notes: input.notes ?? sourceBed.notes,
        assignmentHistory: targetHistory as unknown as Prisma.InputJsonValue
      },
      include: BED_DETAIL_INCLUDE
    });

    return mapBedToDto(updatedTarget);
  });
}

/**
 * Làm thủ tục xuất viện & trả lại giường trống (Discharge):
 * - Đóng lịch sử nằm viện trong assignment_history JSONB
 * - Chuyển trạng thái giường về AVAILABLE
 */
export async function dischargePatientFromBed(
  nurseUserId: string,
  bedId: string,
  input: DischargeBedInput = {}
): Promise<BedDto> {
  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    const bed = await tx.bed.findUnique({
      where: { id: bedId }
    });

    if (!bed) {
      throw notFound('Không tìm thấy giường bệnh');
    }

    if (bed.status !== 'OCCUPIED' || !bed.currentPatientId) {
      throw conflict('Giường bệnh hiện không có bệnh nhân đang nằm để làm thủ tục xuất viện');
    }

    const patientId = bed.currentPatientId;
    const nowIso = new Date().toISOString();

    const history = parseAssignmentHistory(bed.assignmentHistory).map((item) =>
      item.patientId === patientId && !item.dischargedAt
        ? { ...item, dischargedAt: nowIso }
        : item
    );
    history.push({
      id: crypto.randomUUID(),
      patientId,
      assignedByNurseId: nurse?.id ?? null,
      action: 'DISCHARGE',
      admittedAt: bed.admittedAt ? bed.admittedAt.toISOString() : null,
      dischargedAt: nowIso,
      notes: input.notes ?? 'Hoàn tất thủ tục xuất viện'
    });

    const updated = await tx.bed.update({
      where: { id: bed.id },
      data: {
        status: 'AVAILABLE',
        currentPatientId: null,
        admittedAt: null,
        notes: null,
        assignmentHistory: history as unknown as Prisma.InputJsonValue
      },
      include: BED_DETAIL_INCLUDE
    });

    return mapBedToDto(updated);
  });
}

/**
 * Đổi trạng thái giường trống <-> bảo trì (AVAILABLE / MAINTENANCE):
 * - Chặn nếu giường đang có bệnh nhân nằm (OCCUPIED)
 */
export async function updateBedStatus(
  bedId: string,
  input: UpdateBedStatusInput
): Promise<BedDto> {
  const bed = await prisma.bed.findUnique({
    where: { id: bedId }
  });

  if (!bed) {
    throw notFound('Không tìm thấy giường bệnh');
  }

  if (bed.status === 'OCCUPIED' || bed.currentPatientId !== null) {
    throw conflict('Không thể chuyển trạng thái khi giường đang có bệnh nhân nằm');
  }

  const updated = await prisma.bed.update({
    where: { id: bed.id },
    data: {
      status: input.status,
      notes:
        input.status === 'MAINTENANCE'
          ? input.notes ?? 'Đang bảo trì / vệ sinh giường'
          : input.notes ?? null
    },
    include: BED_DETAIL_INCLUDE
  });

  return mapBedToDto(updated);
}
