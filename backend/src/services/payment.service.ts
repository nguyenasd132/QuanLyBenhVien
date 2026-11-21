import {
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  PrescriptionStatus,
  Prisma
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import {
  AllergyWarningDto,
  InvoiceItemJson,
  PrescriptionItemJson
} from '../types';
import { badRequest, notFound } from '../utils/errors';

// ============================================================================
// 1. DTO Interfaces (Bám sát backend/API_CONTRACT.md)
// ============================================================================

export interface InvoiceItemDto {
  id: string;
  serviceId: string | null;
  medicineId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PaymentDto {
  id: string;
  paymentCode: string;
  invoiceId: string;
  invoiceCode?: string;
  patientId: string;
  patientCode?: string;
  patientName?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  qrReference: string | null;
  confirmedByNurseName: string | null;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  appointmentId: string | null;
  appointmentCode: string | null;
  prescriptionId: string | null;
  prescriptionCode: string | null;
  invoiceType: InvoiceType;
  subtotal: number;
  insuranceDiscount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paidAt: string | null;
  createdAt: string;
  items: InvoiceItemDto[];
  payments: PaymentDto[];
}

export interface QrInfoDto {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
  qrDataString: string;
}

export interface PrescriptionItemDto {
  id: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  genericName: string | null;
  unit: string;
  quantity: number;
  dosage: string;
  frequency: string | null;
  durationDays: number | null;
  instructions: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface PrescriptionDto {
  id: string;
  prescriptionCode: string;
  medicalRecordId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  departmentName?: string;
  diagnosis?: string;
  notes: string | null;
  allergyWarnings: AllergyWarningDto[];
  totalAmount: number;
  status: PrescriptionStatus;
  dispensedByNurseName: string | null;
  dispensedAt: string | null;
  createdAt: string;
  items: PrescriptionItemDto[];
  invoiceId?: string | null;
  invoiceStatus?: InvoiceStatus | null;
}

// ============================================================================
// 2. Zod Validation Schemas (TV4-01 Framework)
// ============================================================================

export const listNursePaymentsQuerySchema = z.object({
  status: z.string().trim().optional(),
  search: z.string().trim().optional()
});

export const confirmPaymentSchema = z.object({
  method: z.enum(['QR_TRANSFER', 'COUNTER_CASH', 'CARD']).optional(),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export const rejectPaymentSchema = z.object({
  reason: z.string().trim().max(500, 'Lý do từ chối tối đa 500 ký tự').optional()
});

export const listNursePrescriptionsQuerySchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'DISPENSED', 'CANCELLED']).optional(),
  search: z.string().trim().optional()
});

export const createPatientPaymentSchema = z.object({
  invoiceId: z.string({ required_error: 'Vui lòng chọn hóa đơn cần thanh toán' }).uuid('ID hóa đơn không hợp lệ'),
  method: z.enum(['QR_TRANSFER', 'COUNTER_CASH'], {
    required_error: 'Vui lòng chọn phương thức thanh toán'
  }),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

export type ListNursePaymentsQuery = z.infer<typeof listNursePaymentsQuerySchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type ListNursePrescriptionsQuery = z.infer<typeof listNursePrescriptionsQuerySchema>;
export type CreatePatientPaymentInput = z.infer<typeof createPatientPaymentSchema>;

// ============================================================================
// 3. Prisma Includes & DTO Mappers (Kiểm tra bảng invoices / payments / prescriptions)
// ============================================================================

export const INVOICE_DETAIL_INCLUDE = {
  patient: {
    include: {
      user: { select: { fullName: true } }
    }
  },
  appointment: {
    select: { appointmentCode: true }
  },
  prescription: {
    select: { prescriptionCode: true }
  },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      confirmedByNurse: {
        include: {
          user: { select: { fullName: true } }
        }
      }
    }
  }
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_DETAIL_INCLUDE;
}>;

export const PRESCRIPTION_DETAIL_INCLUDE = {
  patient: {
    include: {
      user: { select: { fullName: true } }
    }
  },
  doctor: {
    include: {
      user: { select: { fullName: true } },
      department: { select: { name: true } }
    }
  },
  medicalRecord: {
    select: { diagnosis: true }
  },
  dispensedByNurse: {
    include: {
      user: { select: { fullName: true } }
    }
  },
  invoice: {
    select: { id: true, status: true }
  }
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionWithDetails = Prisma.PrescriptionGetPayload<{
  include: typeof PRESCRIPTION_DETAIL_INCLUDE;
}>;

function asJsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

export function buildQrInfoForInvoice(invoice: {
  invoiceCode: string;
  totalAmount: number;
}): QrInfoDto {
  return {
    bankName: 'Vietcombank - CN TP.HCM',
    accountNumber: '1029384756',
    accountName: 'BENH VIEN DA KHOA AN TAM',
    amount: invoice.totalAmount,
    transferContent: `ANTAM ${invoice.invoiceCode}`,
    qrDataString: `ANTAM|VCB|1029384756|${invoice.totalAmount}|${invoice.invoiceCode}`
  };
}

export function mapInvoiceToDto(inv: InvoiceWithDetails): InvoiceDto {
  const rawItems = asJsonArray<InvoiceItemJson>(inv.items);
  return {
    id: inv.id,
    invoiceCode: inv.invoiceCode,
    patientId: inv.patientId,
    patientCode: inv.patient.patientCode,
    patientName: inv.patient.user.fullName,
    appointmentId: inv.appointmentId,
    appointmentCode: inv.appointment?.appointmentCode ?? null,
    prescriptionId: inv.prescriptionId,
    prescriptionCode: inv.prescription?.prescriptionCode ?? null,
    invoiceType: inv.invoiceType,
    subtotal: inv.subtotal,
    insuranceDiscount: inv.insuranceDiscount,
    totalAmount: inv.totalAmount,
    status: inv.status,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
    items: rawItems.map((item, idx) => ({
      id: item.id || `${inv.id}-item-${idx + 1}`,
      serviceId: item.serviceId ?? null,
      medicineId: item.medicineId ?? null,
      description: item.description,
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0)
    })),
    payments: inv.payments.map((p) => ({
      id: p.id,
      paymentCode: p.paymentCode,
      invoiceId: p.invoiceId,
      invoiceCode: inv.invoiceCode,
      patientId: p.patientId,
      patientCode: inv.patient.patientCode,
      patientName: inv.patient.user.fullName,
      amount: p.amount,
      method: p.method,
      status: p.status,
      qrReference: p.qrReference,
      confirmedByNurseName: p.confirmedByNurse?.user.fullName ?? null,
      confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
      notes: p.notes,
      createdAt: p.createdAt.toISOString()
    }))
  };
}

export function mapPrescriptionToDto(rx: PrescriptionWithDetails): PrescriptionDto {
  const rawItems = asJsonArray<PrescriptionItemJson>(rx.items);
  const rawWarnings = asJsonArray<AllergyWarningDto>(rx.allergyWarnings);

  return {
    id: rx.id,
    prescriptionCode: rx.prescriptionCode,
    medicalRecordId: rx.medicalRecordId,
    patientId: rx.patientId,
    patientCode: rx.patient.patientCode,
    patientName: rx.patient.user.fullName,
    doctorId: rx.doctorId,
    doctorName: rx.doctor.user.fullName,
    departmentName: rx.doctor.department.name,
    diagnosis: rx.medicalRecord.diagnosis,
    notes: rx.notes,
    allergyWarnings: rawWarnings,
    totalAmount: rx.totalAmount,
    status: rx.status,
    dispensedByNurseName: rx.dispensedByNurse?.user.fullName ?? null,
    dispensedAt: rx.dispensedAt ? rx.dispensedAt.toISOString() : null,
    createdAt: rx.createdAt.toISOString(),
    items: rawItems.map((item, idx) => ({
      id: item.id || `${rx.id}-rx-item-${idx + 1}`,
      medicineId: item.medicineId,
      medicineCode: item.medicineCode,
      medicineName: item.medicineName,
      genericName: item.genericName ?? null,
      unit: item.unit,
      quantity: Number(item.quantity ?? 1),
      dosage: item.dosage,
      frequency: item.frequency ?? null,
      durationDays: item.durationDays ?? null,
      instructions: item.instructions ?? null,
      unitPrice: Number(item.unitPrice ?? 0),
      lineTotal: Number(item.lineTotal ?? 0)
    })),
    invoiceId: rx.invoice?.id ?? null,
    invoiceStatus: rx.invoice?.status ?? null
  };
}

// ============================================================================
// 4. Service Functions (Khung truy vấn & xử lý cho Thu ngân / Đơn thuốc)
// ============================================================================

/**
 * Tra cứu danh sách hóa đơn & giao dịch tại quầy Thu ngân Điều dưỡng.
 * Hỗ trợ lọc theo trạng thái (`PENDING` = `UNPAID` + `PENDING_VERIFICATION`, hoặc trạng thái cụ thể) và từ khóa.
 */
export async function listNursePayments(query: ListNursePaymentsQuery): Promise<InvoiceDto[]> {
  const where: Prisma.InvoiceWhereInput = {};

  const statusFilter = query.status?.trim().toUpperCase();
  if (statusFilter && statusFilter !== 'ALL') {
    if (statusFilter === 'PENDING') {
      where.status = { in: ['UNPAID', 'PENDING_VERIFICATION'] };
    } else if (
      statusFilter === 'UNPAID' ||
      statusFilter === 'PENDING_VERIFICATION' ||
      statusFilter === 'PAID' ||
      statusFilter === 'CANCELLED'
    ) {
      where.status = statusFilter as InvoiceStatus;
    } else {
      throw badRequest(`Trạng thái hóa đơn không hợp lệ: ${query.status}`);
    }
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { invoiceCode: { contains: search, mode: 'insensitive' } },
      { patient: { patientCode: { contains: search, mode: 'insensitive' } } },
      { patient: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
      { patient: { user: { phone: { contains: search, mode: 'insensitive' } } } },
      { appointment: { appointmentCode: { contains: search, mode: 'insensitive' } } },
      { prescription: { prescriptionCode: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: INVOICE_DETAIL_INCLUDE,
    orderBy: [{ createdAt: 'desc' }]
  });

  return invoices.map(mapInvoiceToDto);
}

/**
 * Tra cứu danh sách đơn thuốc tại quầy Dược Điều dưỡng.
 */
export async function listNursePrescriptions(
  query: ListNursePrescriptionsQuery
): Promise<PrescriptionDto[]> {
  const where: Prisma.PrescriptionWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { prescriptionCode: { contains: search, mode: 'insensitive' } },
      { patient: { patientCode: { contains: search, mode: 'insensitive' } } },
      { patient: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
      { doctor: { user: { fullName: { contains: search, mode: 'insensitive' } } } }
    ];
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: PRESCRIPTION_DETAIL_INCLUDE,
    orderBy: [{ createdAt: 'desc' }]
  });

  return prescriptions.map(mapPrescriptionToDto);
}

/**
 * Lấy chi tiết hóa đơn theo ID hoặc theo Payment ID (phục vụ đối soát thu ngân).
 */
export async function findInvoiceByIdOrPaymentId(idOrPaymentId: string): Promise<InvoiceWithDetails> {
  const byInvoice = await prisma.invoice.findUnique({
    where: { id: idOrPaymentId },
    include: INVOICE_DETAIL_INCLUDE
  });
  if (byInvoice) {
    return byInvoice;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: idOrPaymentId },
    select: { invoiceId: true }
  });
  if (payment) {
    const inv = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: INVOICE_DETAIL_INCLUDE
    });
    if (inv) return inv;
  }

  throw notFound('Không tìm thấy hóa đơn hoặc giao dịch thanh toán');
}
