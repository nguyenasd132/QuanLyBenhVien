import { BedStatus, Gender, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { formatDateOnly } from '../utils/date';

// ============================================================================
// 1. DTO Interfaces (Bám sát backend/API_CONTRACT.md)
// ============================================================================

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

// ============================================================================
// 2. Zod Validation Schemas (TV4-01 Framework)
// ============================================================================

export const listBedsQuerySchema = z.object({
  departmentId: z.string().trim().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).optional(),
  search: z.string().trim().optional()
});

export const admitBedSchema = z.object({
  patientId: z
    .string({ required_error: 'Vui lòng chọn bệnh nhân nhập viện' })
    .uuid('ID bệnh nhân không hợp lệ'),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export const transferBedSchema = z.object({
  targetBedId: z
    .string({ required_error: 'Vui lòng chọn giường đích cần chuyển đến' })
    .uuid('ID giường đích không hợp lệ'),
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

// ============================================================================
// 3. Prisma Includes & DTO Mappers (Kiểm tra bảng beds / rooms / departments)
// ============================================================================

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

// ============================================================================
// 4. Service Functions (Khung truy vấn & thống kê công suất giường)
// ============================================================================

/**
 * Lấy danh sách giường bệnh kèm thống kê tổng quan và thống kê công suất theo từng khoa.
 */
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
