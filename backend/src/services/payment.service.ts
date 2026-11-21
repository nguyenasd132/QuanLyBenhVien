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
import { generateHospitalCode } from '../utils/codes';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

// ---------------------------------------------------------------------------
// 1. DTO Interfaces (Theo đặc tả backend/API_CONTRACT.md)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 2. Zod Schemas
// ---------------------------------------------------------------------------

export const listPatientInvoicesQuerySchema = z.object({
  type: z.enum(['HOSPITAL_FEE', 'PRESCRIPTION']).optional(),
  status: z.enum(['UNPAID', 'PENDING_VERIFICATION', 'PAID', 'CANCELLED']).optional()
});

export const createPatientPaymentSchema = z.object({
  invoiceId: z
    .string({ required_error: 'Vui lòng chọn hóa đơn cần thanh toán' })
    .trim()
    .min(1, 'Thiếu mã hóa đơn'),
  method: z.enum(['QR_TRANSFER', 'COUNTER_CASH'], {
    required_error: 'Vui lòng chọn phương thức thanh toán'
  }),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional()
});

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

export type ListPatientInvoicesQuery = z.infer<typeof listPatientInvoicesQuerySchema>;
export type CreatePatientPaymentInput = z.infer<typeof createPatientPaymentSchema>;
export type ListNursePaymentsQuery = z.infer<typeof listNursePaymentsQuerySchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type ListNursePrescriptionsQuery = z.infer<typeof listNursePrescriptionsQuerySchema>;

// ---------------------------------------------------------------------------
// 3. Prisma Includes & Mappers
// ---------------------------------------------------------------------------

export const INVOICE_DETAIL_INCLUDE = {
  patient: {
    include: {
      user: { select: { id: true, fullName: true } }
    }
  },
  appointment: {
    select: { appointmentCode: true }
  },
  prescription: {
    select: { id: true, prescriptionCode: true, status: true }
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
      user: { select: { id: true, fullName: true } }
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

/** Tạo thông tin QR mô phỏng Vietcombank theo chuẩn API_CONTRACT. */
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

// ---------------------------------------------------------------------------
// 4. Nghiệp vụ Thanh toán phía Bệnh nhân (TV4-04 - /api/patient)
// ---------------------------------------------------------------------------

async function getPatientByUserId(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: { user: { select: { fullName: true } } }
  });
  if (!patient) {
    throw forbidden('Tài khoản hiện tại không có hồ sơ bệnh nhân');
  }
  return patient;
}

/** Danh sách hóa đơn của bệnh nhân (hỗ trợ lọc theo loại Viện phí / Đơn thuốc và trạng thái). */
export async function listPatientInvoices(
  patientUserId: string,
  query: ListPatientInvoicesQuery
): Promise<InvoiceDto[]> {
  const patient = await getPatientByUserId(patientUserId);

  const where: Prisma.InvoiceWhereInput = {
    patientId: patient.id
  };
  if (query.type) {
    where.invoiceType = query.type;
  }
  if (query.status) {
    where.status = query.status;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: INVOICE_DETAIL_INCLUDE,
    orderBy: { createdAt: 'desc' }
  });

  return invoices.map(mapInvoiceToDto);
}

/** Xem chi tiết 1 hóa đơn của bệnh nhân. */
export async function getPatientInvoiceDetail(
  patientUserId: string,
  invoiceId: string
): Promise<InvoiceDto> {
  const patient = await getPatientByUserId(patientUserId);

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      patientId: patient.id
    },
    include: INVOICE_DETAIL_INCLUDE
  });

  if (!invoice) {
    throw notFound('Không tìm thấy hóa đơn yêu cầu');
  }

  return mapInvoiceToDto(invoice);
}

/** Lịch sử các biên lai / giao dịch thanh toán của bệnh nhân. */
export async function listPatientPayments(patientUserId: string): Promise<PaymentDto[]> {
  const patient = await getPatientByUserId(patientUserId);

  const payments = await prisma.payment.findMany({
    where: { patientId: patient.id },
    include: {
      invoice: { select: { invoiceCode: true } },
      confirmedByNurse: {
        include: { user: { select: { fullName: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return payments.map((p) => ({
    id: p.id,
    paymentCode: p.paymentCode,
    invoiceId: p.invoiceId,
    invoiceCode: p.invoice.invoiceCode,
    patientId: p.patientId,
    patientCode: patient.patientCode,
    patientName: patient.user.fullName,
    amount: p.amount,
    method: p.method,
    status: p.status,
    qrReference: p.qrReference,
    confirmedByNurseName: p.confirmedByNurse?.user.fullName ?? null,
    confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
    notes: p.notes,
    createdAt: p.createdAt.toISOString()
  }));
}

/**
 * Bệnh nhân gửi yêu cầu thanh toán QR hoặc đăng ký nộp tiền mặt tại quầy.
 * Chuyển hóa đơn sang trạng thái PENDING_VERIFICATION chờ điều dưỡng xác nhận.
 */
export async function createPatientPayment(
  patientUserId: string,
  input: CreatePatientPaymentInput
): Promise<{ payment: PaymentDto; invoice: InvoiceDto; qrInfo: QrInfoDto }> {
  const patient = await getPatientByUserId(patientUserId);

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: input.invoiceId,
        patientId: patient.id
      },
      include: INVOICE_DETAIL_INCLUDE
    });

    if (!invoice) {
      throw notFound('Không tìm thấy hóa đơn cần thanh toán');
    }

    if (invoice.status === 'PAID') {
      throw conflict('Hóa đơn này đã được thanh toán hoàn tất');
    }

    if (invoice.status === 'CANCELLED') {
      throw conflict('Hóa đơn đã bị hủy, không thể tạo giao dịch thanh toán');
    }

    const qrInfo = buildQrInfoForInvoice(invoice);
    const qrReference = input.method === 'QR_TRANSFER' ? qrInfo.qrDataString : null;

    // Nếu đã có giao dịch PENDING trước đó thì cập nhật lại phương thức, tránh sinh trùng nhiều dòng chờ
    const existingPending = invoice.payments.find((p) => p.status === 'PENDING');
    let savedPaymentId: string;

    if (existingPending) {
      const updatedPay = await tx.payment.update({
        where: { id: existingPending.id },
        data: {
          method: input.method,
          qrReference,
          notes: input.notes ?? existingPending.notes
        }
      });
      savedPaymentId = updatedPay.id;
    } else {
      const createdPay = await tx.payment.create({
        data: {
          paymentCode: generateHospitalCode('TT'),
          invoiceId: invoice.id,
          patientId: patient.id,
          amount: invoice.totalAmount,
          method: input.method,
          status: 'PENDING',
          qrReference,
          notes:
            input.notes ??
            (input.method === 'QR_TRANSFER'
              ? `Chuyển khoản QR cho hóa đơn ${invoice.invoiceCode}`
              : 'Đăng ký thanh toán tiền mặt tại quầy thu ngân')
        }
      });
      savedPaymentId = createdPay.id;
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PENDING_VERIFICATION'
      },
      include: INVOICE_DETAIL_INCLUDE
    });

    const mappedInv = mapInvoiceToDto(updatedInvoice);
    const mappedPay = mappedInv.payments.find((p) => p.id === savedPaymentId) ?? mappedInv.payments[0];

    return {
      payment: mappedPay,
      invoice: mappedInv,
      qrInfo
    };
  });

  return result;
}

// ---------------------------------------------------------------------------
// 5. Nghiệp vụ Thu ngân & Cấp phát thuốc phía Điều dưỡng (TV4-04 & TV4-05)
// ---------------------------------------------------------------------------

/** Danh sách hóa đơn tại quầy Thu ngân Điều dưỡng. */
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
 * Thu ngân xác nhận đã thu tiền (giao dịch nguyên tử):
 * - Chấp nhận :id là invoiceId hoặc paymentId
 * - Cập nhật Payment -> CONFIRMED, Invoice -> PAID
 * - Nếu là hóa đơn thuốc (có prescriptionId) thì mở khóa luôn Prescription -> PAID để quầy dược cấp phát
 * - Ghi nhận thông báo cho bệnh nhân và nhật ký hệ thống (AuditLog)
 */
export async function confirmNursePayment(
  nurseUserId: string,
  idOrPaymentId: string,
  input: ConfirmPaymentInput = {}
): Promise<{ invoice: InvoiceDto; payment: PaymentDto }> {
  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    // Cho phép truyền invoiceId hoặc paymentId trên URL
    let targetInvoiceId = idOrPaymentId;
    let specificPaymentId: string | null = null;

    const directInvoice = await tx.invoice.findUnique({
      where: { id: idOrPaymentId },
      select: { id: true }
    });

    if (!directInvoice) {
      const paymentLookup = await tx.payment.findUnique({
        where: { id: idOrPaymentId },
        select: { id: true, invoiceId: true }
      });
      if (!paymentLookup) {
        throw notFound('Không tìm thấy hóa đơn hoặc giao dịch cần xác nhận');
      }
      targetInvoiceId = paymentLookup.invoiceId;
      specificPaymentId = paymentLookup.id;
    }

    // Khóa dòng hóa đơn tránh 2 điều dưỡng bấm xác nhận cùng lúc
    await tx.$queryRaw`
      SELECT id FROM invoices WHERE id = ${targetInvoiceId} FOR UPDATE
    `;

    const invoice = await tx.invoice.findUnique({
      where: { id: targetInvoiceId },
      include: INVOICE_DETAIL_INCLUDE
    });

    if (!invoice) {
      throw notFound('Không tìm thấy hóa đơn cần xác nhận');
    }

    if (invoice.status === 'PAID') {
      throw conflict('Hóa đơn này đã được thanh toán trước đó');
    }

    if (invoice.status === 'CANCELLED') {
      throw conflict('Hóa đơn đã bị hủy, không thể xác nhận thu tiền');
    }

    const now = new Date();
    const pendingPayment =
      (specificPaymentId
        ? invoice.payments.find((p) => p.id === specificPaymentId)
        : undefined) ?? invoice.payments.find((p) => p.status === 'PENDING');

    let confirmedPaymentId: string;

    if (pendingPayment) {
      const updatedPay = await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: 'CONFIRMED',
          method: input.method ?? pendingPayment.method,
          confirmedByNurseId: nurse?.id ?? null,
          confirmedAt: now,
          notes: input.notes ?? pendingPayment.notes
        }
      });
      confirmedPaymentId = updatedPay.id;
    } else {
      const createdPay = await tx.payment.create({
        data: {
          paymentCode: generateHospitalCode('TT'),
          invoiceId: invoice.id,
          patientId: invoice.patientId,
          amount: invoice.totalAmount,
          method: input.method ?? 'COUNTER_CASH',
          status: 'CONFIRMED',
          confirmedByNurseId: nurse?.id ?? null,
          confirmedAt: now,
          notes: input.notes ?? 'Thu tiền trực tiếp tại quầy thu ngân'
        }
      });
      confirmedPaymentId = createdPay.id;
    }

    // Cập nhật hóa đơn sang PAID
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: now
      }
    });

    // Mở khóa đơn thuốc nếu đây là hóa đơn thuốc và đơn đang chờ thanh toán
    if (invoice.prescriptionId) {
      await tx.prescription.updateMany({
        where: {
          id: invoice.prescriptionId,
          status: 'PENDING_PAYMENT'
        },
        data: {
          status: 'PAID'
        }
      });
    }

    // Gửi thông báo cho bệnh nhân
    await tx.notification.create({
      data: {
        userId: invoice.patient.user.id,
        title: `Thanh toán thành công • ${invoice.invoiceCode}`,
        message: `Hóa đơn ${
          invoice.invoiceType === 'PRESCRIPTION' ? 'đơn thuốc' : 'viện phí'
        } (${invoice.totalAmount.toLocaleString('vi-VN')}đ) đã được thu ngân xác nhận.${
          invoice.prescriptionId ? ' Bạn có thể nhận thuốc tại quầy dược.' : ''
        }`,
        type: 'PAYMENT',
        payload: {
          invoiceId: invoice.id,
          invoiceCode: invoice.invoiceCode,
          amount: invoice.totalAmount,
          prescriptionId: invoice.prescriptionId
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: nurseUserId,
        action: 'CONFIRM_PAYMENT',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: {
          invoiceCode: invoice.invoiceCode,
          paymentId: confirmedPaymentId,
          amount: invoice.totalAmount
        }
      }
    });

    const refreshed = await tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: INVOICE_DETAIL_INCLUDE
    });

    const mappedInvoice = mapInvoiceToDto(refreshed);
    const mappedPayment =
      mappedInvoice.payments.find((p) => p.id === confirmedPaymentId) ?? mappedInvoice.payments[0];

    return {
      invoice: mappedInvoice,
      payment: mappedPayment
    };
  });
}

/**
 * Thu ngân từ chối yêu cầu xác nhận thanh toán QR chưa hợp lệ:
 * - Chuyển giao dịch PENDING sang REJECTED
 * - Trả hóa đơn về lại trạng thái UNPAID để bệnh nhân thanh toán lại
 */
export async function rejectNursePayment(
  nurseUserId: string,
  idOrPaymentId: string,
  input: RejectPaymentInput = {}
): Promise<{ invoice: InvoiceDto; payment?: PaymentDto }> {
  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    let targetInvoiceId = idOrPaymentId;
    let specificPaymentId: string | null = null;

    const directInvoice = await tx.invoice.findUnique({
      where: { id: idOrPaymentId },
      select: { id: true }
    });

    if (!directInvoice) {
      const paymentLookup = await tx.payment.findUnique({
        where: { id: idOrPaymentId },
        select: { id: true, invoiceId: true }
      });
      if (!paymentLookup) {
        throw notFound('Không tìm thấy hóa đơn hoặc giao dịch cần từ chối');
      }
      targetInvoiceId = paymentLookup.invoiceId;
      specificPaymentId = paymentLookup.id;
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: targetInvoiceId },
      include: INVOICE_DETAIL_INCLUDE
    });

    if (!invoice) {
      throw notFound('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'PAID') {
      throw conflict('Hóa đơn đã được xác nhận thanh toán, không thể từ chối');
    }

    const now = new Date();
    const reasonText = input.reason?.trim() || 'Chưa nhận được giao dịch chuyển khoản hợp lệ';

    const pendingPayment =
      (specificPaymentId
        ? invoice.payments.find((p) => p.id === specificPaymentId)
        : undefined) ?? invoice.payments.find((p) => p.status === 'PENDING');

    let rejectedPaymentId: string | null = null;
    if (pendingPayment) {
      await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: 'REJECTED',
          confirmedByNurseId: nurse?.id ?? null,
          confirmedAt: now,
          notes: reasonText
        }
      });
      rejectedPaymentId = pendingPayment.id;
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'UNPAID'
      }
    });

    await tx.notification.create({
      data: {
        userId: invoice.patient.user.id,
        title: `Chưa xác nhận được thanh toán • ${invoice.invoiceCode}`,
        message: `Yêu cầu đối soát hóa đơn ${invoice.invoiceCode} bị từ chối: ${reasonText}. Vui lòng kiểm tra lại hoặc liên hệ quầy thu ngân.`,
        type: 'PAYMENT',
        payload: {
          invoiceId: invoice.id,
          invoiceCode: invoice.invoiceCode,
          reason: reasonText
        }
      }
    });

    const refreshed = await tx.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: INVOICE_DETAIL_INCLUDE
    });

    const mappedInvoice = mapInvoiceToDto(refreshed);
    const mappedPayment = rejectedPaymentId
      ? mappedInvoice.payments.find((p) => p.id === rejectedPaymentId)
      : undefined;

    return {
      invoice: mappedInvoice,
      payment: mappedPayment
    };
  });
}

/** Danh sách đơn thuốc tại quầy Dược Điều dưỡng. */
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
 * Cấp phát thuốc tại quầy Dược (TV4-05):
 * - Chặn nếu đơn thuốc chưa ở trạng thái PAID (chưa thanh toán hoặc đã phát rồi)
 * - Kiểm tra tồn kho từng thuốc (SELECT ... FOR UPDATE), nếu thiếu báo lỗi 409 INSUFFICIENT_STOCK
 * - Trừ tồn kho từng thuốc và cập nhật đơn sang DISPENSED
 */
export async function dispenseNursePrescription(
  nurseUserId: string,
  prescriptionId: string
): Promise<PrescriptionDto> {
  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUserId },
    select: { id: true }
  });

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM prescriptions WHERE id = ${prescriptionId} FOR UPDATE
    `;

    const prescription = await tx.prescription.findUnique({
      where: { id: prescriptionId },
      include: PRESCRIPTION_DETAIL_INCLUDE
    });

    if (!prescription) {
      throw notFound('Không tìm thấy đơn thuốc cần cấp phát');
    }

    if (prescription.status === 'DISPENSED') {
      throw conflict('Đơn thuốc này đã được cấp phát trước đó');
    }

    if (prescription.status === 'CANCELLED') {
      throw conflict('Đơn thuốc đã bị hủy, không thể cấp phát');
    }

    if (prescription.status !== 'PAID') {
      throw conflict(
        'Đơn thuốc chưa được thanh toán, vui lòng hướng dẫn bệnh nhân hoàn tất thanh toán tại quầy thu ngân trước khi phát thuốc'
      );
    }

    const items = asJsonArray<PrescriptionItemJson>(prescription.items);

    // Kiểm tra và trừ tồn kho cho từng loại thuốc trong đơn
    for (const item of items) {
      const qty = Number(item.quantity ?? 0);
      if (qty <= 0) continue;

      const lockedMeds = await tx.$queryRaw<
        Array<{ id: string; name: string; stock_quantity: number }>
      >`
        SELECT id, name, stock_quantity
        FROM medicines
        WHERE id = ${item.medicineId}
        FOR UPDATE
      `;

      const med = lockedMeds[0];
      if (!med) {
        throw notFound(`Không tìm thấy thuốc ${item.medicineName} trong danh mục kho`);
      }

      if (med.stock_quantity < qty) {
        throw conflict(
          `Thuốc "${med.name}" không đủ số lượng tồn kho để cấp phát (Cần: ${qty}, Tồn kho: ${med.stock_quantity})`,
          { medicineId: med.id, required: qty, available: med.stock_quantity },
          'INSUFFICIENT_STOCK'
        );
      }

      await tx.medicine.update({
        where: { id: med.id },
        data: {
          stockQuantity: {
            decrement: qty
          }
        }
      });
    }

    const now = new Date();
    const updatedRx = await tx.prescription.update({
      where: { id: prescription.id },
      data: {
        status: 'DISPENSED',
        dispensedByNurseId: nurse?.id ?? null,
        dispensedAt: now
      },
      include: PRESCRIPTION_DETAIL_INCLUDE
    });

    await tx.notification.create({
      data: {
        userId: prescription.patient.user.id,
        title: `Đã cấp phát thuốc • ${prescription.prescriptionCode}`,
        message: `Đơn thuốc ${prescription.prescriptionCode} đã được cấp phát tại quầy dược. Chúc bạn mau khỏe!`,
        type: 'PRESCRIPTION',
        payload: {
          prescriptionId: prescription.id,
          prescriptionCode: prescription.prescriptionCode
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: nurseUserId,
        action: 'DISPENSE_PRESCRIPTION',
        entityType: 'Prescription',
        entityId: prescription.id,
        metadata: {
          prescriptionCode: prescription.prescriptionCode,
          itemCount: items.length
        }
      }
    });

    return mapPrescriptionToDto(updatedRx);
  });
}
