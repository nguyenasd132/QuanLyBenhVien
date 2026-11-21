import { z } from 'zod';

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const codeField = z
  .string()
  .trim()
  .min(2, 'Mã phải có ít nhất 2 ký tự')
  .max(30, 'Mã tối đa 30 ký tự')
  .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ gồm chữ, số, gạch ngang (-) hoặc gạch dưới (_)')
  .transform((v) => v.toUpperCase());

const nameField = z.string().trim().min(1, 'Tên không được để trống').max(200);

const moneyField = z.number().int('Giá phải là số nguyên (VNĐ)').min(0, 'Giá không được âm').max(1_000_000_000);

const uuidField = z.string().uuid('ID không hợp lệ');

const boolQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const ROOM_TYPES = ['EXAMINATION', 'INPATIENT_WARD', 'TRIAGE', 'PHARMACY', 'LAB'] as const;
export const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const;
export const SERVICE_CATEGORIES = ['CONSULTATION', 'LAB_TEST', 'IMAGING', 'PROCEDURE'] as const;

export const roomTypeSchema = z.enum(ROOM_TYPES);
export const bedStatusSchema = z.enum(BED_STATUSES);
export const serviceCategorySchema = z.enum(SERVICE_CATEGORIES);

export const idParamSchema = z.object({ id: uuidField });


export const createDepartmentSchema = z.object({
  code: codeField,
  name: nameField,
  description: nullableText(1000),
  location: nullableText(200),
  consultationFee: moneyField.optional()
});

export const updateDepartmentSchema = z.object({
  code: codeField.optional(),
  name: nameField.optional(),
  description: nullableText(1000),
  location: nullableText(200),
  consultationFee: moneyField.optional(),
  isActive: z.boolean().optional()
});

export const listRoomsQuerySchema = z.object({
  departmentId: uuidField.optional(),
  roomType: roomTypeSchema.optional()
});

export const createRoomSchema = z.object({
  code: codeField,
  name: nameField,
  roomType: roomTypeSchema,
  floor: nullableText(50),
  departmentId: uuidField
});

export const updateRoomSchema = z.object({
  code: codeField.optional(),
  name: nameField.optional(),
  roomType: roomTypeSchema.optional(),
  floor: nullableText(50),
  departmentId: uuidField.optional(),
  isActive: z.boolean().optional()
});

export const listBedsQuerySchema = z.object({
  departmentId: uuidField.optional(),
  status: bedStatusSchema.optional()
});

const bedNumberField = z
  .string()
  .trim()
  .min(1, 'Số giường không được để trống')
  .max(30, 'Số giường tối đa 30 ký tự');

const adminBedStatusSchema = z.enum(['AVAILABLE', 'MAINTENANCE']);

export const createBedSchema = z.object({
  bedNumber: bedNumberField,
  roomId: uuidField,
  departmentId: uuidField.optional(),
  status: adminBedStatusSchema.optional(),
  notes: nullableText(500)
});

export const updateBedSchema = z.object({
  bedNumber: bedNumberField.optional(),
  roomId: uuidField.optional(),
  status: adminBedStatusSchema.optional(),
  notes: nullableText(500)
});

const stringList = z
  .array(z.string().trim().min(1, 'Không được có phần tử rỗng').max(100))
  .max(50, 'Tối đa 50 phần tử')
  .transform((list) => {
    const seen = new Map<string, string>();
    for (const item of list) {
      const key = item.toLowerCase();
      if (!seen.has(key)) seen.set(key, item);
    }
    return Array.from(seen.values());
  });

export const contraindicationsSchema = z
  .object({
    allergens: stringList.optional(),
    conditions: stringList.optional(),
    warningText: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional())
  })
  .strict()
  .transform((v) => {
    const out: { allergens?: string[]; conditions?: string[]; warningText?: string } = {};
    if (v.allergens && v.allergens.length > 0) out.allergens = v.allergens;
    if (v.conditions && v.conditions.length > 0) out.conditions = v.conditions;
    if (v.warningText) out.warningText = v.warningText;
    return out;
  });

export const listMedicinesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  includeInactive: boolQuery
});

export const createMedicineSchema = z.object({
  code: codeField,
  name: nameField,
  genericName: nullableText(200),
  unit: z.string().trim().min(1, 'Đơn vị tính không được để trống').max(30),
  unitPrice: moneyField,
  stockQuantity: z.number().int().min(0, 'Tồn kho không được âm').max(10_000_000).optional(),
  dosageForm: nullableText(100),
  contraindications: contraindicationsSchema.optional(),
  manufacturer: nullableText(200)
});

export const updateMedicineSchema = z.object({
  code: codeField.optional(),
  name: nameField.optional(),
  genericName: nullableText(200),
  unit: z.string().trim().min(1).max(30).optional(),
  unitPrice: moneyField.optional(),
  stockQuantity: z.number().int().min(0).max(10_000_000).optional(),
  dosageForm: nullableText(100),
  contraindications: contraindicationsSchema.optional(),
  manufacturer: nullableText(200),
  isActive: z.boolean().optional()
});

export const listServicesQuerySchema = z.object({
  category: serviceCategorySchema.optional(),
  search: z.string().trim().max(100).optional(),
  includeInactive: boolQuery
});

export const createServiceSchema = z.object({
  code: codeField,
  name: nameField,
  category: serviceCategorySchema,
  departmentId: uuidField.nullable().optional(),
  unitPrice: moneyField,
  description: nullableText(1000)
});

export const updateServiceSchema = z.object({
  code: codeField.optional(),
  name: nameField.optional(),
  category: serviceCategorySchema.optional(),
  departmentId: uuidField.nullable().optional(),
  unitPrice: moneyField.optional(),
  description: nullableText(1000),
  isActive: z.boolean().optional()
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type CreateBedInput = z.infer<typeof createBedSchema>;
export type UpdateBedInput = z.infer<typeof updateBedSchema>;
export type ListBedsQuery = z.infer<typeof listBedsQuerySchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type ListMedicinesQuery = z.infer<typeof listMedicinesQuerySchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;