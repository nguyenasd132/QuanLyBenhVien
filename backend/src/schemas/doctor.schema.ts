/**
 * TV3 — Zod schema validate dữ liệu Cổng Bác sĩ (khám bệnh, bệnh án, đơn thuốc, lịch trực).
 * Đối chiếu: backend/API_CONTRACT.md mục 3.5 & frontend/src/lib/api.ts (doctorApi).
 */
import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dateStringSchema = z
  .string()
  .regex(DATE_REGEX, 'Ngày phải có định dạng YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), 'Ngày không hợp lệ');

export const sessionSchema = z.enum(['MORNING', 'AFTERNOON']);
export const uuidSchema = z.string().uuid('ID không hợp lệ');

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------
export const idParamSchema = z.object({ id: uuidSchema });

// ---------------------------------------------------------------------------
// Hàng đợi & lượt khám
// ---------------------------------------------------------------------------
export const queueQuerySchema = z.object({
  date: dateStringSchema.optional(),
  session: sessionSchema.optional()
});

export const callNextSchema = z.object({
  date: dateStringSchema.optional(),
  session: sessionSchema,
  completeCurrent: z.boolean().optional().default(false)
});

export const appointmentStatusSchema = z
  .object({
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'NO_SHOW']).optional(),
    action: z.enum(['START', 'COMPLETE', 'NO_SHOW', 'CALL_NEXT']).optional()
  })
  .refine((v) => v.status !== undefined || v.action !== undefined, {
    message: 'Cần truyền status hoặc action'
  });

// ---------------------------------------------------------------------------
// Bệnh án & đơn thuốc
// ---------------------------------------------------------------------------
export const labOrderSchema = z.object({
  serviceId: uuidSchema.optional(),
  testName: z.string().trim().min(1, 'Tên xét nghiệm không được để trống').max(200),
  category: z.string().trim().max(100).optional(),
  status: z.enum(['ORDERED', 'COMPLETED']).default('ORDERED'),
  result: z.string().trim().max(2000).optional(),
  normalRange: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const specialtyResultsSchema = z.object({
  examFindings: z.string().trim().max(5000).optional(),
  imagingNotes: z.string().trim().max(5000).optional(),
  labOrders: z.array(labOrderSchema).max(50).optional().default([])
});

export const prescriptionItemSchema = z.object({
  medicineId: uuidSchema,
  quantity: z.number().int('Số lượng phải là số nguyên').positive('Số lượng phải > 0').max(1000),
  dosage: z.string().trim().min(1, 'Liều dùng không được để trống').max(200),
  frequency: optionalText(200),
  durationDays: z.number().int().positive().max(365).optional().nullable(),
  instructions: optionalText(500)
});

export const prescriptionSchema = z
  .object({
    notes: optionalText(1000),
    items: z.array(prescriptionItemSchema).max(30)
  })
  .refine(
    (p) => new Set(p.items.map((i) => i.medicineId)).size === p.items.length,
    { message: 'Mỗi thuốc chỉ được kê một dòng trong đơn', path: ['items'] }
  );

const recordFields = {
  symptoms: optionalText(2000),
  diagnosis: z.string().trim().min(1, 'Chẩn đoán không được để trống').max(1000),
  icdCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/, 'Mã ICD-10 không hợp lệ (vd. J02.9)')
    .optional()
    .nullable()
    .or(z.literal('')),
  clinicalNotes: optionalText(5000),
  treatmentPlan: optionalText(5000),
  specialtyResults: specialtyResultsSchema.optional(),
  orderedServiceIds: z.array(uuidSchema).max(50).optional().default([]),
  prescription: prescriptionSchema.optional().nullable(),
  publish: z.boolean().optional().default(false)
};

export const createRecordSchema = z.object({
  appointmentId: uuidSchema,
  ...recordFields
});

export const updateRecordSchema = z
  .object(recordFields)
  .partial()
  .extend({ appointmentId: uuidSchema.optional() });

export const checkAllergiesSchema = z.object({
  patientId: uuidSchema,
  medicineIds: z.array(uuidSchema).min(1, 'Cần ít nhất 1 thuốc để đối chiếu').max(30)
});

// ---------------------------------------------------------------------------
// Tái khám / chuyển khoa
// ---------------------------------------------------------------------------
export const followUpSchema = z.object({
  patientId: uuidSchema,
  date: dateStringSchema,
  session: sessionSchema,
  doctorId: uuidSchema.optional(),
  chiefComplaint: optionalText(1000)
});

// ---------------------------------------------------------------------------
// Lịch trực
// ---------------------------------------------------------------------------
export const scheduleQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional()
});

const scheduleFields = {
  maxPatients: z.number().int().min(1).max(100).optional(),
  avgMinutesPerPatient: z.number().int().min(5).max(60).optional(),
  isAvailable: z.boolean().optional(),
  notes: optionalText(500)
};

export const upsertScheduleSchema = z.object({
  date: dateStringSchema,
  session: sessionSchema,
  ...scheduleFields
});

export const updateScheduleSchema = z
  .object(scheduleFields)
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Cần ít nhất 1 trường để cập nhật'
  });

export type QueueQuery = z.infer<typeof queueQuerySchema>;
export type CallNextInput = z.infer<typeof callNextSchema>;
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;
export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;
export type CheckAllergiesInput = z.infer<typeof checkAllergiesSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type ScheduleQuery = z.infer<typeof scheduleQuerySchema>;
export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
