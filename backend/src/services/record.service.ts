/**
 * TV3 — Nghiệp vụ Cổng Bác sĩ: hàng đợi theo buổi/STT, gọi số, tiền sử & sinh hiệu bệnh nhân,
 * bệnh án (specialty_results JSONB), kê đơn có cảnh báo dị ứng, tái khám, lịch trực.
 * Đối chiếu: backend/API_CONTRACT.md mục 3.5.
 *
 * Đã cài đặt: hàng đợi, gọi số tiếp theo (+ thông báo), cập nhật trạng thái lượt khám,
 * tiền sử bệnh nhân, đối chiếu dị ứng, xem/lưu/cập nhật bệnh án nháp + đơn thuốc.
 * Còn TODO (501): công bố kết quả + sinh hóa đơn, tái khám, lịch trực.
 */
import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  AppointmentStatusInput,
  CallNextInput,
  CheckAllergiesInput,
  CreateRecordInput,
  FollowUpInput,
  PrescriptionInput,
  QueueQuery,
  ScheduleQuery,
  UpdateRecordInput,
  UpdateScheduleInput,
  UpsertScheduleInput
} from '../schemas/doctor.schema';
import {
  AllergyWarningDto,
  LabOrderItem,
  PrescriptionItemJson,
  SessionType,
  SpecialtyResultsData
} from '../types';
import { checkPrescriptionAllergies } from '../utils/allergy';
import { generateHospitalCode } from '../utils/codes';
import { getTodayDateString, toDateOnly } from '../utils/date';
import { AppError, badRequest, conflict, forbidden, notFound } from '../utils/errors';
import {
  APPOINTMENT_INCLUDE,
  AppointmentWithRelations,
  formatAppointment,
  formatMedicalRecord,
  formatPatientSummary,
  formatSchedule,
  parseAllergyWarnings,
  parseSpecialtyResults,
  RECORD_INCLUDE
} from './record.formatter';

type Tx = Prisma.TransactionClient;

function notImplemented(feature: string): never {
  throw new AppError(501, 'NOT_IMPLEMENTED', `${feature} (TV3) chưa được cài đặt`);
}

const WAITING_STATUSES: AppointmentStatus[] = ['BOOKED', 'CHECKED_IN'];
const SESSIONS: SessionType[] = ['MORNING', 'AFTERNOON'];
const formatStt = (n: number) => String(n).padStart(3, '0');

/** '' / chuỗi trắng → null; undefined giữ nguyên (không cập nhật). */
function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value && value.trim() ? value.trim() : null;
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

/** Khóa dòng bác sĩ để các thao tác gọi số/đổi trạng thái không chạy chồng nhau. */
async function lockDoctorQueue(tx: Tx, doctorId: string) {
  await tx.$queryRaw`SELECT id FROM doctors WHERE id = ${doctorId} FOR UPDATE`;
}

/**
 * Chọn bệnh nhân kế tiếp: ưu tiên người đã tiếp đón (CHECKED_IN); nếu chưa ai tiếp đón thì
 * lấy BOOKED. Trong cùng nhóm: bệnh nhân ưu tiên trước, sau đó STT tăng dần.
 */
function pickNextWaiting<T extends { status: AppointmentStatus; isPriority: boolean; queueNumber: number }>(
  appointments: T[]
): T | null {
  const checkedIn = appointments.filter((a) => a.status === 'CHECKED_IN');
  const pool = checkedIn.length > 0 ? checkedIn : appointments.filter((a) => a.status === 'BOOKED');
  const sorted = [...pool].sort(
    (a, b) => Number(b.isPriority) - Number(a.isPriority) || a.queueNumber - b.queueNumber
  );
  return sorted[0] ?? null;
}

/** Thông báo QUEUE_CALL "đến lượt khám" cho bệnh nhân. */
async function notifyQueueCall(tx: Tx, apt: AppointmentWithRelations) {
  const room = apt.doctor.room?.name;
  await tx.notification.create({
    data: {
      userId: apt.patient.userId,
      type: 'QUEUE_CALL',
      title: `Đến lượt khám — STT ${formatStt(apt.queueNumber)}`,
      message:
        `Mời bệnh nhân ${apt.patient.user.fullName} (STT ${formatStt(apt.queueNumber)}) ` +
        `vào ${room ?? 'phòng khám'} gặp ${apt.doctor.user.fullName}.`,
      payload: {
        appointmentId: apt.id,
        appointmentCode: apt.appointmentCode,
        queueNumber: apt.queueNumber,
        session: apt.session,
        roomName: room ?? null,
        doctorName: apt.doctor.user.fullName
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Hàng đợi & lượt khám
// ---------------------------------------------------------------------------

/** GET /api/doctor/queue — hàng đợi theo buổi Sáng/Chiều, sắp theo STT tăng dần. */
export async function getQueue(doctorUserId: string, query: QueueQuery) {
  const doctor = await getDoctorByUserId(doctorUserId);
  const dateStr = query.date ?? getTodayDateString();
  const date = toDateOnly(dateStr);
  const sessions = query.session ? [query.session] : SESSIONS;

  const [schedules, appointments] = await Promise.all([
    prisma.doctorSchedule.findMany({ where: { doctorId: doctor.id, scheduleDate: date } }),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: date,
        session: { in: sessions },
        status: { not: 'CANCELLED' }
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ queueNumber: 'asc' }]
    })
  ]);

  const buildSession = (session: SessionType) => {
    const schedule = schedules.find((s) => s.session === session) ?? null;
    const list = sessions.includes(session) ? appointments.filter((a) => a.session === session) : [];
    const current = list.find((a) => a.status === 'IN_PROGRESS') ?? null;
    const next = pickNextWaiting(list);
    const live = current?.queueNumber ?? null;
    const fmt = (a: AppointmentWithRelations) => formatAppointment(a, { liveCurrentStt: live });

    return {
      schedule: schedule ? formatSchedule(schedule, list.length) : null,
      currentServing: current ? fmt(current) : null,
      nextWaiting: next ? fmt(next) : null,
      stats: {
        total: list.length,
        waiting: list.filter((a) => WAITING_STATUSES.includes(a.status)).length,
        inProgress: list.filter((a) => a.status === 'IN_PROGRESS').length,
        completed: list.filter((a) => a.status === 'COMPLETED').length
      },
      appointments: list.map(fmt)
    };
  };

  return { date: dateStr, morning: buildSession('MORNING'), afternoon: buildSession('AFTERNOON') };
}

/**
 * POST /api/doctor/queue/call-next — gọi số tiếp theo trong buổi & gửi thông báo cho bệnh nhân.
 * Nếu đang có người khám: cần `completeCurrent: true` để hoàn tất lượt đó trước, nếu không → 409.
 * Trả `null` khi không còn ai chờ.
 */
export async function callNext(doctorUserId: string, input: CallNextInput) {
  const doctor = await getDoctorByUserId(doctorUserId);
  const date = toDateOnly(input.date ?? getTodayDateString());

  return prisma.$transaction(async (tx) => {
    await lockDoctorQueue(tx, doctor.id);

    const active = await tx.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: date,
        session: input.session,
        status: { in: [...WAITING_STATUSES, 'IN_PROGRESS'] }
      },
      orderBy: { queueNumber: 'asc' }
    });

    const inProgress = active.filter((a) => a.status === 'IN_PROGRESS');
    if (inProgress.length > 0) {
      if (!input.completeCurrent) {
        throw conflict(
          `Đang khám STT ${formatStt(inProgress[0].queueNumber)}. Hãy hoàn tất lượt hiện tại trước khi gọi số tiếp theo.`,
          { currentAppointmentId: inProgress[0].id }
        );
      }
      await tx.appointment.updateMany({
        where: { id: { in: inProgress.map((a) => a.id) } },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
    }

    const next = pickNextWaiting(active);
    if (!next) return null;

    const called = await tx.appointment.update({
      where: { id: next.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: APPOINTMENT_INCLUDE
    });
    await notifyQueueCall(tx, called);
    return formatAppointment(called, { liveCurrentStt: called.queueNumber });
  });
}

const STATUS_TO_ACTION = {
  IN_PROGRESS: 'START',
  COMPLETED: 'COMPLETE',
  NO_SHOW: 'NO_SHOW'
} as const;

const TRANSITIONS: Record<
  'START' | 'COMPLETE' | 'NO_SHOW' | 'CALL_NEXT',
  { from: AppointmentStatus[]; to: AppointmentStatus }
> = {
  START: { from: WAITING_STATUSES, to: 'IN_PROGRESS' },
  CALL_NEXT: { from: WAITING_STATUSES, to: 'IN_PROGRESS' },
  COMPLETE: { from: ['IN_PROGRESS'], to: 'COMPLETED' },
  NO_SHOW: { from: WAITING_STATUSES, to: 'NO_SHOW' }
};

/** PATCH /api/doctor/appointments/:id/status */
export async function updateAppointmentStatus(
  doctorUserId: string,
  appointmentId: string,
  input: AppointmentStatusInput
) {
  const doctor = await getDoctorByUserId(doctorUserId);
  const action = input.action ?? STATUS_TO_ACTION[input.status!];
  const transition = TRANSITIONS[action];

  return prisma.$transaction(async (tx) => {
    await lockDoctorQueue(tx, doctor.id);

    const apt = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!apt) throw notFound('Không tìm thấy lượt khám');
    if (apt.doctorId !== doctor.id) throw forbidden('Lượt khám không thuộc bác sĩ này');
    if (!transition.from.includes(apt.status)) {
      throw conflict(`Không thể chuyển lượt khám từ trạng thái ${apt.status} sang ${transition.to}`);
    }

    if (transition.to === 'IN_PROGRESS') {
      const busy = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          appointmentDate: apt.appointmentDate,
          session: apt.session,
          status: 'IN_PROGRESS',
          id: { not: apt.id }
        }
      });
      if (busy) {
        throw conflict(
          `Đang khám STT ${formatStt(busy.queueNumber)}. Hãy hoàn tất lượt hiện tại trước.`,
          { currentAppointmentId: busy.id }
        );
      }
    }

    const now = new Date();
    const updated = await tx.appointment.update({
      where: { id: apt.id },
      data: {
        status: transition.to,
        ...(transition.to === 'IN_PROGRESS' ? { startedAt: now } : {}),
        ...(transition.to === 'COMPLETED' ? { completedAt: now } : {})
      },
      include: APPOINTMENT_INCLUDE
    });

    if (transition.to === 'IN_PROGRESS') {
      await notifyQueueCall(tx, updated);
    }
    const live = transition.to === 'IN_PROGRESS' ? updated.queueNumber : null;
    return formatAppointment(updated, { liveCurrentStt: live });
  });
}

/**
 * GET /api/doctor/patients/:id — hồ sơ, dị ứng, bệnh nền, lịch sử lượt khám (kèm sinh hiệu
 * điều dưỡng đo) và bệnh án cũ. Bác sĩ chỉ xem được bệnh nhân đã/đang khám với mình;
 * bệnh án nháp của bác sĩ khác bị ẩn.
 */
export async function getPatientHistory(doctorUserId: string, patientId: string) {
  const doctor = await getDoctorByUserId(doctorUserId);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: true }
  });
  if (!patient) throw notFound('Không tìm thấy bệnh nhân');

  const linked = await prisma.appointment.count({ where: { patientId, doctorId: doctor.id } });
  if (linked === 0) throw forbidden('Bệnh nhân không có lượt khám với bác sĩ này');

  const [appointments, records] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ appointmentDate: 'desc' }, { queueNumber: 'desc' }]
    }),
    prisma.medicalRecord.findMany({
      where: { patientId, OR: [{ status: 'PUBLISHED' }, { doctorId: doctor.id }] },
      include: RECORD_INCLUDE,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const medicalRecords = records.map(formatMedicalRecord);
  return {
    patient: formatPatientSummary(patient),
    appointments: appointments.map((a) => formatAppointment(a)),
    records: medicalRecords,
    medicalRecords
  };
}

// ---------------------------------------------------------------------------
// Đối chiếu dị ứng
// ---------------------------------------------------------------------------

/** POST /api/doctor/prescriptions/check-allergies — gọi ngay khi bác sĩ thêm/bớt thuốc. */
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
// Bệnh án & đơn thuốc
// ---------------------------------------------------------------------------

/**
 * Dựng specialty_results JSONB: kiểm tra dịch vụ CLS tồn tại, và bổ sung các dịch vụ trong
 * `orderedServiceIds` chưa có trong `labOrders` thành chỉ định mới (ORDERED).
 */
async function buildSpecialtyResults(
  tx: Tx,
  base: SpecialtyResultsData,
  orderedServiceIds: string[]
): Promise<SpecialtyResultsData> {
  const labOrders: LabOrderItem[] = [...(base.labOrders ?? [])];
  const ids = [
    ...new Set([
      ...orderedServiceIds,
      ...labOrders.map((o) => o.serviceId).filter((id): id is string => Boolean(id))
    ])
  ];

  if (ids.length > 0) {
    const services = await tx.service.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, name: true, category: true }
    });
    const byId = new Map(services.map((s) => [s.id, s]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw badRequest('Có dịch vụ cận lâm sàng không tồn tại hoặc đã ngưng', {
        missingServiceIds: missing
      });
    }
    const inLabOrders = new Set(labOrders.map((o) => o.serviceId));
    for (const id of orderedServiceIds) {
      if (inLabOrders.has(id)) continue;
      const s = byId.get(id)!;
      labOrders.push({ serviceId: s.id, testName: s.name, category: s.category, status: 'ORDERED' });
      inLabOrders.add(id);
    }
  }

  return {
    ...(base.examFindings ? { examFindings: base.examFindings } : {}),
    ...(base.imagingNotes ? { imagingNotes: base.imagingNotes } : {}),
    labOrders
  };
}

/**
 * Tạo/thay thế đơn thuốc của bệnh án: lấy giá hiện hành, kiểm tra tồn kho,
 * đối chiếu dị ứng & bệnh nền và lưu cảnh báo vào `allergy_warnings` JSONB.
 */
async function savePrescription(
  tx: Tx,
  record: { id: string; patientId: string; doctorId: string },
  input: PrescriptionInput
): Promise<AllergyWarningDto[]> {
  const ids = input.items.map((i) => i.medicineId);
  const [patient, medicines] = await Promise.all([
    tx.patient.findUniqueOrThrow({
      where: { id: record.patientId },
      select: { allergies: true, chronicConditions: true }
    }),
    tx.medicine.findMany({ where: { id: { in: ids }, isActive: true } })
  ]);
  const byId = new Map(medicines.map((m) => [m.id, m]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw badRequest('Có thuốc không tồn tại hoặc đã ngưng kinh doanh', { missingMedicineIds: missing });
  }

  const shortages = input.items
    .filter((i) => i.quantity > byId.get(i.medicineId)!.stockQuantity)
    .map((i) => {
      const m = byId.get(i.medicineId)!;
      return { medicineId: m.id, medicineName: m.name, requested: i.quantity, inStock: m.stockQuantity };
    });
  if (shortages.length > 0) {
    throw conflict('Số lượng kê vượt tồn kho nhà thuốc', shortages, 'INSUFFICIENT_STOCK');
  }

  const items: PrescriptionItemJson[] = input.items.map((i, index) => {
    const m = byId.get(i.medicineId)!;
    return {
      id: `${record.id}-${index + 1}`,
      medicineId: m.id,
      medicineCode: m.code,
      medicineName: m.name,
      genericName: m.genericName,
      unit: m.unit,
      quantity: i.quantity,
      dosage: i.dosage,
      frequency: i.frequency ?? null,
      durationDays: i.durationDays ?? null,
      instructions: i.instructions ?? null,
      unitPrice: m.unitPrice,
      lineTotal: m.unitPrice * i.quantity
    };
  });
  const totalAmount = items.reduce((sum, it) => sum + it.lineTotal, 0);
  const warnings = checkPrescriptionAllergies(patient, medicines);

  const data = {
    notes: emptyToNull(input.notes) ?? null,
    items: items as unknown as Prisma.InputJsonValue,
    allergyWarnings: warnings as unknown as Prisma.InputJsonValue,
    totalAmount
  };
  await tx.prescription.upsert({
    where: { medicalRecordId: record.id },
    create: {
      ...data,
      prescriptionCode: generateHospitalCode('DT'),
      medicalRecordId: record.id,
      patientId: record.patientId,
      doctorId: record.doctorId
    },
    update: data
  });
  return warnings;
}

async function buildSaveResponse(tx: Tx, recordId: string, allergyWarnings: AllergyWarningDto[]) {
  const record = await tx.medicalRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: RECORD_INCLUDE
  });
  const medicalRecord = formatMedicalRecord(record);
  return {
    medicalRecord,
    prescription: medicalRecord.prescription,
    invoices: [] as unknown[],
    allergyWarnings
  };
}

/** GET /api/doctor/records/:id — bác sĩ xem bệnh án của mình, hoặc bệnh án đã công bố. */
export async function getRecordById(doctorUserId: string, recordId: string) {
  const doctor = await getDoctorByUserId(doctorUserId);
  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: RECORD_INCLUDE
  });
  if (!record) throw notFound('Không tìm thấy hồ sơ khám');
  if (record.doctorId !== doctor.id && record.status !== 'PUBLISHED') {
    throw forbidden('Bạn không có quyền xem bệnh án nháp của bác sĩ khác');
  }
  return formatMedicalRecord(record);
}

/**
 * POST /api/doctor/records — lưu bệnh án nháp (triệu chứng, chẩn đoán ICD-10, kết quả chuyên khoa
 * & CLS JSONB) kèm đơn thuốc có cảnh báo dị ứng. Lượt khám đang chờ sẽ chuyển sang IN_PROGRESS.
 */
export async function createRecord(doctorUserId: string, input: CreateRecordInput) {
  if (input.publish) notImplemented('Công bố kết quả khám & sinh hóa đơn');
  const doctor = await getDoctorByUserId(doctorUserId);

  return prisma.$transaction(async (tx) => {
    const apt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { medicalRecord: { select: { id: true } } }
    });
    if (!apt) throw notFound('Không tìm thấy lượt khám');
    if (apt.doctorId !== doctor.id) throw forbidden('Lượt khám không thuộc bác sĩ này');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') {
      throw conflict(`Không thể lập bệnh án cho lượt khám ở trạng thái ${apt.status}`);
    }
    if (apt.medicalRecord) {
      throw conflict('Lượt khám đã có bệnh án, hãy cập nhật bằng PUT /api/doctor/records/:id', {
        medicalRecordId: apt.medicalRecord.id
      });
    }

    const specialtyResults = await buildSpecialtyResults(
      tx,
      input.specialtyResults ?? {},
      input.orderedServiceIds ?? []
    );

    const record = await tx.medicalRecord.create({
      data: {
        recordCode: generateHospitalCode('HS'),
        appointmentId: apt.id,
        patientId: apt.patientId,
        doctorId: doctor.id,
        symptoms: emptyToNull(input.symptoms) ?? null,
        diagnosis: input.diagnosis,
        icdCode: emptyToNull(input.icdCode) ?? null,
        clinicalNotes: emptyToNull(input.clinicalNotes) ?? null,
        treatmentPlan: emptyToNull(input.treatmentPlan) ?? null,
        specialtyResults: specialtyResults as unknown as Prisma.InputJsonValue
      }
    });

    if (WAITING_STATUSES.includes(apt.status)) {
      await tx.appointment.update({
        where: { id: apt.id },
        data: { status: 'IN_PROGRESS', startedAt: apt.startedAt ?? new Date() }
      });
    }

    const warnings =
      input.prescription && input.prescription.items.length > 0
        ? await savePrescription(tx, record, input.prescription)
        : [];

    return buildSaveResponse(tx, record.id, warnings);
  });
}

/**
 * PUT /api/doctor/records/:id — cập nhật bệnh án nháp (chỉ các trường được gửi).
 * `prescription`: bỏ qua = giữ nguyên; `null` hoặc `items: []` = xóa đơn; có items = thay thế đơn.
 */
export async function updateRecord(doctorUserId: string, recordId: string, input: UpdateRecordInput) {
  if (input.publish) notImplemented('Công bố kết quả khám & sinh hóa đơn');
  const doctor = await getDoctorByUserId(doctorUserId);

  return prisma.$transaction(async (tx) => {
    const record = await tx.medicalRecord.findUnique({
      where: { id: recordId },
      include: { prescription: { include: { invoice: { select: { id: true } } } } }
    });
    if (!record) throw notFound('Không tìm thấy hồ sơ khám');
    if (record.doctorId !== doctor.id) throw forbidden('Bệnh án không thuộc bác sĩ này');
    if (record.status === 'PUBLISHED') throw conflict('Bệnh án đã công bố, không thể chỉnh sửa');
    if (input.appointmentId && input.appointmentId !== record.appointmentId) {
      throw badRequest('appointmentId không khớp với bệnh án');
    }

    const data: Prisma.MedicalRecordUpdateInput = {};
    if (input.symptoms !== undefined) data.symptoms = emptyToNull(input.symptoms);
    if (input.diagnosis !== undefined) data.diagnosis = input.diagnosis;
    if (input.icdCode !== undefined) data.icdCode = emptyToNull(input.icdCode);
    if (input.clinicalNotes !== undefined) data.clinicalNotes = emptyToNull(input.clinicalNotes);
    if (input.treatmentPlan !== undefined) data.treatmentPlan = emptyToNull(input.treatmentPlan);
    if (input.specialtyResults !== undefined || (input.orderedServiceIds?.length ?? 0) > 0) {
      const base = input.specialtyResults ?? parseSpecialtyResults(record.specialtyResults);
      data.specialtyResults = (await buildSpecialtyResults(
        tx,
        base,
        input.orderedServiceIds ?? []
      )) as unknown as Prisma.InputJsonValue;
    }
    if (Object.keys(data).length > 0) {
      await tx.medicalRecord.update({ where: { id: record.id }, data });
    }

    let warnings: AllergyWarningDto[];
    const existingRx = record.prescription;
    if (input.prescription === undefined) {
      warnings = parseAllergyWarnings(existingRx?.allergyWarnings);
    } else {
      if (existingRx && (existingRx.invoice || existingRx.status !== 'PENDING_PAYMENT')) {
        throw conflict('Đơn thuốc đã lập hóa đơn hoặc đã thanh toán, không thể sửa');
      }
      if (input.prescription === null || input.prescription.items.length === 0) {
        if (existingRx) await tx.prescription.delete({ where: { id: existingRx.id } });
        warnings = [];
      } else {
        warnings = await savePrescription(tx, record, input.prescription);
      }
    }

    return buildSaveResponse(tx, record.id, warnings);
  });
}

/**
 * POST /api/doctor/records/:id/publish
 * TODO (transaction):
 * - record.status → PUBLISHED, publishedAt = now
 * - Hóa đơn HOSPITAL_FEE: buildHospitalFeeItems(phí khám bác sĩ, dịch vụ trong specialtyResults.labOrders)
 * - Hóa đơn PRESCRIPTION (nếu có đơn): buildPrescriptionInvoiceItems(prescription.items)
 * - Tổng tiền: computeInvoiceTotals; trả về bằng formatInvoice (invoice.formatter.ts)
 * - appointment.status → COMPLETED; notification EXAM_RESULT cho bệnh nhân
 */
export async function publishRecord(doctorUserId: string, recordId: string): Promise<unknown> {
  void doctorUserId;
  void recordId;
  return notImplemented('Công bố kết quả khám & sinh hóa đơn');
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
