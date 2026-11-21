/**
 * TV3 — Chuẩn hóa dữ liệu hóa đơn trả về cho Front-end (InvoiceDto / PaymentDto)
 * và các hàm dựng dòng hóa đơn cho 2 loại hóa đơn tách biệt:
 *   - HOSPITAL_FEE : phí khám + dịch vụ cận lâm sàng
 *   - PRESCRIPTION : tiền thuốc theo đơn
 * Đối chiếu: backend/API_CONTRACT.md (InvoiceDto, InvoiceItemDto, PaymentDto).
 */
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { InvoiceItemJson, PrescriptionItemJson } from '../types';

/** Include chuẩn khi truy vấn hóa đơn để format đầy đủ. */
export const INVOICE_INCLUDE = {
  patient: { include: { user: { select: { fullName: true } } } },
  appointment: { select: { appointmentCode: true } },
  prescription: { select: { prescriptionCode: true } },
  payments: {
    orderBy: { createdAt: 'desc' },
    include: {
      confirmedByNurse: { include: { user: { select: { fullName: true } } } }
    }
  }
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>;
type PaymentWithNurse = InvoiceWithRelations['payments'][number];

export interface InvoiceItemDto extends InvoiceItemJson {}

export interface PaymentDto {
  id: string;
  paymentCode: string;
  invoiceId: string;
  invoiceCode?: string;
  patientId: string;
  patientCode?: string;
  patientName?: string;
  amount: number;
  method: PaymentWithNurse['method'];
  status: PaymentWithNurse['status'];
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
  invoiceType: InvoiceWithRelations['invoiceType'];
  subtotal: number;
  insuranceDiscount: number;
  totalAmount: number;
  status: InvoiceWithRelations['status'];
  paidAt: string | null;
  createdAt: string;
  items: InvoiceItemDto[];
  payments: PaymentDto[];
}

const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Đọc an toàn cột JSONB `invoices.items`. */
export function parseInvoiceItems(value: unknown): InvoiceItemDto[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => {
      const quantity = Number(x.quantity) || 0;
      const unitPrice = Number(x.unitPrice) || 0;
      return {
        id: typeof x.id === 'string' ? x.id : crypto.randomUUID(),
        serviceId: typeof x.serviceId === 'string' ? x.serviceId : null,
        medicineId: typeof x.medicineId === 'string' ? x.medicineId : null,
        description: typeof x.description === 'string' ? x.description : '',
        quantity,
        unitPrice,
        lineTotal: typeof x.lineTotal === 'number' ? x.lineTotal : quantity * unitPrice
      };
    });
}

export function formatPayment(
  payment: PaymentWithNurse,
  extra?: { invoiceCode?: string; patientCode?: string; patientName?: string }
): PaymentDto {
  return {
    id: payment.id,
    paymentCode: payment.paymentCode,
    invoiceId: payment.invoiceId,
    invoiceCode: extra?.invoiceCode,
    patientId: payment.patientId,
    patientCode: extra?.patientCode,
    patientName: extra?.patientName,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    qrReference: payment.qrReference,
    confirmedByNurseName: payment.confirmedByNurse?.user.fullName ?? null,
    confirmedAt: toIso(payment.confirmedAt),
    notes: payment.notes,
    createdAt: payment.createdAt.toISOString()
  };
}

export function formatInvoice(invoice: InvoiceWithRelations): InvoiceDto {
  const patientCode = invoice.patient.patientCode;
  const patientName = invoice.patient.user.fullName;
  return {
    id: invoice.id,
    invoiceCode: invoice.invoiceCode,
    patientId: invoice.patientId,
    patientCode,
    patientName,
    appointmentId: invoice.appointmentId,
    appointmentCode: invoice.appointment?.appointmentCode ?? null,
    prescriptionId: invoice.prescriptionId,
    prescriptionCode: invoice.prescription?.prescriptionCode ?? null,
    invoiceType: invoice.invoiceType,
    subtotal: invoice.subtotal,
    insuranceDiscount: invoice.insuranceDiscount,
    totalAmount: invoice.totalAmount,
    status: invoice.status,
    paidAt: toIso(invoice.paidAt),
    createdAt: invoice.createdAt.toISOString(),
    items: parseInvoiceItems(invoice.items),
    payments: invoice.payments.map((p) =>
      formatPayment(p, { invoiceCode: invoice.invoiceCode, patientCode, patientName })
    )
  };
}

// ---------------------------------------------------------------------------
// Dựng dòng hóa đơn
// ---------------------------------------------------------------------------

export interface BillableService {
  id: string;
  name: string;
  unitPrice: number;
}

/** Hóa đơn viện phí: 1 dòng phí khám + các dịch vụ cận lâm sàng đã chỉ định. */
export function buildHospitalFeeItems(
  consultation: { description: string; fee: number },
  services: BillableService[]
): InvoiceItemJson[] {
  const items: InvoiceItemJson[] = [
    {
      id: crypto.randomUUID(),
      serviceId: null,
      medicineId: null,
      description: consultation.description,
      quantity: 1,
      unitPrice: consultation.fee,
      lineTotal: consultation.fee
    }
  ];
  for (const s of services) {
    items.push({
      id: crypto.randomUUID(),
      serviceId: s.id,
      medicineId: null,
      description: s.name,
      quantity: 1,
      unitPrice: s.unitPrice,
      lineTotal: s.unitPrice
    });
  }
  return items;
}

/** Hóa đơn tiền thuốc: mỗi dòng thuốc trong đơn thành 1 dòng hóa đơn. */
export function buildPrescriptionInvoiceItems(items: PrescriptionItemJson[]): InvoiceItemJson[] {
  return items.map((it) => ({
    id: crypto.randomUUID(),
    serviceId: null,
    medicineId: it.medicineId,
    description: `${it.medicineName} (${it.unit})`,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal
  }));
}

/** Tính tổng hóa đơn; giảm trừ BHYT không vượt quá tạm tính. */
export function computeInvoiceTotals(items: InvoiceItemJson[], insuranceDiscount = 0) {
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const discount = Math.min(Math.max(0, Math.round(insuranceDiscount)), subtotal);
  return { subtotal, insuranceDiscount: discount, totalAmount: subtotal - discount };
}
