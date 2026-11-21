/**
 * TV3 — Nghiệp vụ Cổng Bác sĩ: hàng đợi theo buổi/STT, bệnh án, kê đơn có cảnh báo dị ứng,
 * công bố kết quả sinh 2 hóa đơn tách biệt, tái khám, lịch trực.
 * Đối chiếu: backend/API_CONTRACT.md mục 3.5.
 *
 * Trạng thái: KHUNG (skeleton). Các hàm đánh dấu `TODO` hiện ném lỗi 501 NOT_IMPLEMENTED,
 * riêng `checkAllergies` đã hoạt động (dùng utils/allergy.ts).
 */
import { prisma } from '../config/prisma';
import {
  AppointmentStatusInput,
  CallNextInput,
  CheckAllergiesInput,
  CreateRecordInput,
  FollowUpInput,
  QueueQuery,
  ScheduleQuery,
  UpdateRecordInput,
  UpdateScheduleInput,
  UpsertScheduleInput
} from '../schemas/doctor.schema';
import { AllergyWarningDto } from '../types';
import { checkPrescriptionAllergies } from '../utils/allergy';
import { AppError, badRequest, forbidden, notFound } from '../utils/errors';

function notImplemented(feature: string): never {
  throw new AppError(501, 'NOT_IMPLEMENTED', `${feature} (TV3) chưa được cài đặt`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lấy hồ sơ bác sĩ từ userId trong JWT. */
export async function getDoctorByUserId(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: { select: { fullName: true } },
      department: { select: { id: true, name: true } },
      room: { select: { id: true, name: true } }
    }
  });
  if (!doctor) throw forbidden('Tài khoản không có hồ sơ bác sĩ');
  return doctor;
}

// ---------------------------------------------------------------------------
// Hàng đợi & lượt khám
// ---------------------------------------------------------------------------

/**
 * GET /api/doctor/queue
 * TODO:
 * - date mặc định = getTodayDateString(); lấy lịch trực (doctor_schedules) MORNING & AFTERNOON
 * - Lấy appointments theo (doctorId, date) sắp theo isPriority desc, queueNumber asc
 * - Mỗi buổi trả { schedule, currentServing (IN_PROGRESS), nextWaiting (CHECKED_IN/BOOKED nhỏ nhất),
 *   stats { total, waiting, inProgress, completed }, appointments }
 */
export async function getQueue(doctorUserId: string, query: QueueQuery): Promise<unknown> {
  void doctorUserId;
  void query;
  return notImplemented('Hàng đợi bệnh nhân');
}

/**
 * POST /api/doctor/queue/call-next
 * TODO (trong transaction):
 * - Nếu completeCurrent: chuyển lượt IN_PROGRESS hiện tại → COMPLETED (completedAt)
 * - Chọn lượt CHECKED_IN (ưu tiên isPriority) có STT nhỏ nhất → IN_PROGRESS (startedAt)
 * - Tạo notification QUEUE_CALL cho bệnh nhân; trả AppointmentDto | null nếu hết hàng đợi
 */
export async function callNext(doctorUserId: string, input: CallNextInput): Promise<unknown> {
  void doctorUserId;
  void input;
  return notImplemented('Gọi số tiếp theo');
}

/**
 * PATCH /api/doctor/appointments/:id/status
 * TODO:
 * - Kiểm tra lượt khám thuộc bác sĩ
 * - Chuyển trạng thái hợp lệ: CHECKED_IN/BOOKED → IN_PROGRESS (START),
 *   IN_PROGRESS → COMPLETED (COMPLETE), BOOKED/CHECKED_IN → NO_SHOW; sai → 409 CONFLICT
 */
export async function updateAppointmentStatus(
  doctorUserId: string,
  appointmentId: string,
  input: AppointmentStatusInput
): Promise<unknown> {
  void doctorUserId;
  void appointmentId;
  void input;
  return notImplemented('Cập nhật trạng thái lượt khám');
}

/**
 * GET /api/doctor/patients/:id
 * TODO: trả { patient: PatientSummaryDto, appointments, records, medicalRecords }
 *       (records = medicalRecords, chỉ hồ sơ của bệnh nhân, mới nhất trước)
 */
export async function getPatientHistory(doctorUserId: string, patientId: string): Promise<unknown> {
  void doctorUserId;
  void patientId;
  return notImplemented('Tiền sử bệnh nhân');
}

// ---------------------------------------------------------------------------
// Đối chiếu dị ứng
// ---------------------------------------------------------------------------

/** POST /api/doctor/prescriptions/check-allergies */
export async function checkAllergies(
  input: CheckAllergiesInput
): Promise<{ warnings: AllergyWarningDto[]; hasWarnings: boolean }> {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { allergies: true, chronicConditions: true }
  });
  if (!patient) throw notFound('Không tìm thấy bệnh nhân');

  const uniqueIds = [...new Set(input.medicineIds)];
  const medicines = await prisma.medicine.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, genericName: true, contraindications: true }
  });
  if (medicines.length !== uniqueIds.length) {
    const found = new Set(medicines.map((m) => m.id));
    throw badRequest('Có thuốc không tồn tại trong danh mục', {
      missingMedicineIds: uniqueIds.filter((id) => !found.has(id))
    });
  }

  const warnings = checkPrescriptionAllergies(patient, medicines);
  return { warnings, hasWarnings: warnings.length > 0 };
}

// ---------------------------------------------------------------------------
// Bệnh án, đơn thuốc, hóa đơn
// ---------------------------------------------------------------------------

/** GET /api/doctor/records/:id — TODO: trả MedicalRecordDto (kèm vitals từ triageData, prescription). */
export async function getRecordById(doctorUserId: string, recordId: string): Promise<unknown> {
  void doctorUserId;
  void recordId;
  return notImplemented('Xem hồ sơ khám');
}

/**
 * POST /api/doctor/records
 * TODO (transaction):
 * - Kiểm tra appointment thuộc bác sĩ, chưa có bệnh án, không ở trạng thái CANCELLED/NO_SHOW
 * - Tạo medical_records (recordCode, specialtyResults JSONB)
 * - Nếu có prescription: lấy giá thuốc, chạy checkPrescriptionAllergies, lưu items + allergyWarnings JSONB
 * - Nếu publish = true → gọi publishRecord trong cùng transaction
 * - Trả { medicalRecord, prescription, invoices, allergyWarnings }
 */
export async function createRecord(doctorUserId: string, input: CreateRecordInput): Promise<unknown> {
  void doctorUserId;
  void input;
  return notImplemented('Lưu bệnh án');
}

/**
 * PUT /api/doctor/records/:id
 * TODO: chỉ cho sửa khi status = DRAFT; cập nhật bệnh án + thay thế đơn thuốc; publish nếu yêu cầu.
 */
export async function updateRecord(
  doctorUserId: string,
  recordId: string,
  input: UpdateRecordInput
): Promise<unknown> {
  void doctorUserId;
  void recordId;
  void input;
  return notImplemented('Cập nhật bệnh án');
}

/**
 * POST /api/doctor/records/:id/publish
 * TODO (transaction):
 * - record.status → PUBLISHED, publishedAt = now
 * - Hóa đơn HOSPITAL_FEE: buildHospitalFeeItems(phí khám bác sĩ, dịch vụ orderedServiceIds/labOrders)
 * - Hóa đơn PRESCRIPTION (nếu có đơn): buildPrescriptionInvoiceItems(prescription.items)
 * - Tổng tiền: computeInvoiceTotals; trả về bằng formatInvoice (invoice.formatter.ts)
 * - appointment.status → COMPLETED; notification EXAM_RESULT cho bệnh nhân
 */
export async function publishRecord(doctorUserId: string, recordId: string): Promise<unknown> {
  void doctorUserId;
  void recordId;
  return notImplemented('Công bố kết quả khám');
}

// ---------------------------------------------------------------------------
// Tái khám & lịch trực
// ---------------------------------------------------------------------------

/**
 * POST /api/doctor/follow-up
 * TODO: cấp STT mới bằng SELECT ... FOR UPDATE trên doctor_schedules (bookingType FOLLOW_UP),
 *       computeEstimatedTime; doctorId mặc định = bác sĩ hiện tại (chuyển khoa nếu khác).
 */
export async function bookFollowUp(doctorUserId: string, input: FollowUpInput): Promise<unknown> {
  void doctorUserId;
  void input;
  return notImplemented('Đặt lịch tái khám');
}

/** GET /api/doctor/schedules — TODO: trả DoctorScheduleDto[] trong khoảng from..to. */
export async function listSchedules(doctorUserId: string, query: ScheduleQuery): Promise<unknown> {
  void doctorUserId;
  void query;
  return notImplemented('Xem lịch trực');
}

/** POST /api/doctor/schedules — TODO: upsert theo (doctorId, date, session). */
export async function upsertSchedule(
  doctorUserId: string,
  input: UpsertScheduleInput
): Promise<unknown> {
  void doctorUserId;
  void input;
  return notImplemented('Tạo/cập nhật lịch trực');
}

/** PATCH /api/doctor/schedules/:id — TODO: không cho maxPatients < lastQueueNumber đã cấp. */
export async function updateSchedule(
  doctorUserId: string,
  scheduleId: string,
  input: UpdateScheduleInput
): Promise<unknown> {
  void doctorUserId;
  void scheduleId;
  void input;
  return notImplemented('Cập nhật lịch trực');
}
