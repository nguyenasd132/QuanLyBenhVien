/**
 * TV3 — Chuẩn hóa dữ liệu trả về cho Cổng Bác sĩ:
 * AppointmentDto, PatientSummaryDto, DoctorScheduleDto, MedicalRecordDto, PrescriptionDto.
 * Đối chiếu: backend/API_CONTRACT.md mục 2 (Shared TypeScript Interfaces).
 */
import { Prisma } from '@prisma/client';
import {
  AllergyWarningDto,
  EmergencyContact,
  PrescriptionItemJson,
  SpecialtyResultsData,
  TriageDataJson,
  VitalsData
} from '../types';
import { parseAllergies, parseChronicConditions } from '../utils/allergy';
import { formatDateOnly } from '../utils/date';

const toIso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// Includes chuẩn
// ---------------------------------------------------------------------------

export const APPOINTMENT_INCLUDE = {
  patient: { include: { user: { select: { fullName: true, phone: true } } } },
  doctor: {
    include: {
      user: { select: { fullName: true } },
      room: { select: { name: true } }
    }
  },
  department: { select: { name: true } },
  medicalRecord: { select: { id: true } }
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

export const PRESCRIPTION_INCLUDE = {
  patient: { include: { user: { select: { fullName: true } } } },
  doctor: {
    include: {
      user: { select: { fullName: true } },
      department: { select: { name: true } }
    }
  },
  dispensedByNurse: { include: { user: { select: { fullName: true } } } },
  invoice: { select: { id: true, status: true } },
  medicalRecord: { select: { diagnosis: true } }
} satisfies Prisma.PrescriptionInclude;

export type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: typeof PRESCRIPTION_INCLUDE;
}>;

export const RECORD_INCLUDE = {
  appointment: {
    select: {
      appointmentCode: true,
      appointmentDate: true,
      session: true,
      queueNumber: true,
      triageData: true
    }
  },
  patient: { include: { user: { select: { fullName: true } } } },
  doctor: {
    include: {
      user: { select: { fullName: true } },
      department: { select: { name: true } }
    }
  },
  prescription: { include: PRESCRIPTION_INCLUDE }
} satisfies Prisma.MedicalRecordInclude;

export type RecordWithRelations = Prisma.MedicalRecordGetPayload<{
  include: typeof RECORD_INCLUDE;
}>;

// ---------------------------------------------------------------------------
// JSONB parsers
// ---------------------------------------------------------------------------

export function parseTriageData(value: unknown): TriageDataJson | null {
  if (!isRecord(value)) return null;
  return {
    id: typeof value.id === 'string' ? value.id : '',
    nurseId: typeof value.nurseId === 'string' ? value.nurseId : '',
    nurseName: typeof value.nurseName === 'string' ? value.nurseName : '',
    vitals: isRecord(value.vitals) ? (value.vitals as VitalsData) : {},
    checklistData: isRecord(value.checklistData) ? value.checklistData : {},
    triageNotes: typeof value.triageNotes === 'string' ? value.triageNotes : null,
    recordedAt: typeof value.recordedAt === 'string' ? value.recordedAt : ''
  };
}

export function parseSpecialtyResults(value: unknown): SpecialtyResultsData {
  if (!isRecord(value)) return { labOrders: [] };
  return {
    examFindings: typeof value.examFindings === 'string' ? value.examFindings : undefined,
    imagingNotes: typeof value.imagingNotes === 'string' ? value.imagingNotes : undefined,
    labOrders: Array.isArray(value.labOrders)
      ? (value.labOrders.filter(isRecord) as unknown as SpecialtyResultsData['labOrders'])
      : []
  };
}

export function parsePrescriptionItems(value: unknown): PrescriptionItemJson[] {
  return Array.isArray(value) ? (value.filter(isRecord) as unknown as PrescriptionItemJson[]) : [];
}

export function parseAllergyWarnings(value: unknown): AllergyWarningDto[] {
  return Array.isArray(value) ? (value.filter(isRecord) as unknown as AllergyWarningDto[]) : [];
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatAppointment(
  apt: AppointmentWithRelations,
  options: { liveCurrentStt?: number | null } = {}
) {
  const triage = parseTriageData(apt.triageData);
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
    liveCurrentStt: options.liveCurrentStt ?? null,
    bookingType: apt.bookingType,
    bookingFlow: apt.bookingFlow,
    status: apt.status,
    isPriority: apt.isPriority,
    chiefComplaint: apt.chiefComplaint,
    cancelReason: apt.cancelReason,
    checkedInAt: toIso(apt.checkedInAt),
    startedAt: toIso(apt.startedAt),
    completedAt: toIso(apt.completedAt),
    createdAt: apt.createdAt.toISOString(),
    hasNursingProcedure: triage !== null,
    hasMedicalRecord: apt.medicalRecord !== null,
    nursingProcedure: triage
      ? {
          id: triage.id,
          appointmentId: apt.id,
          nurseId: triage.nurseId,
          nurseName: triage.nurseName,
          vitals: triage.vitals,
          checklistData: triage.checklistData,
          triageNotes: triage.triageNotes,
          recordedAt: triage.recordedAt
        }
      : null,
    medicalRecordId: apt.medicalRecord?.id ?? null
  };
}

export type AppointmentDto = ReturnType<typeof formatAppointment>;

export function formatPatientSummary(
  patient: Prisma.PatientGetPayload<{ include: { user: true } }>
) {
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
    allergies: parseAllergies(patient.allergies),
    chronicConditions: parseChronicConditions(patient.chronicConditions),
    emergencyContact: isRecord(patient.emergencyContact)
      ? (patient.emergencyContact as unknown as EmergencyContact)
      : null
  };
}

export function formatSchedule(
  schedule: Prisma.DoctorScheduleGetPayload<object>,
  bookedCount: number
) {
  return {
    id: schedule.id,
    doctorId: schedule.doctorId,
    scheduleDate: formatDateOnly(schedule.scheduleDate),
    session: schedule.session,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    maxPatients: schedule.maxPatients,
    avgMinutesPerPatient: schedule.avgMinutesPerPatient,
    lastQueueNumber: schedule.lastQueueNumber,
    bookedCount,
    isAvailable: schedule.isAvailable,
    notes: schedule.notes
  };
}

export function formatPrescription(p: PrescriptionWithRelations) {
  return {
    id: p.id,
    prescriptionCode: p.prescriptionCode,
    medicalRecordId: p.medicalRecordId,
    patientId: p.patientId,
    patientCode: p.patient.patientCode,
    patientName: p.patient.user.fullName,
    doctorId: p.doctorId,
    doctorName: p.doctor.user.fullName,
    departmentName: p.doctor.department.name,
    diagnosis: p.medicalRecord.diagnosis,
    notes: p.notes,
    allergyWarnings: parseAllergyWarnings(p.allergyWarnings),
    totalAmount: p.totalAmount,
    status: p.status,
    dispensedByNurseName: p.dispensedByNurse?.user.fullName ?? null,
    dispensedAt: toIso(p.dispensedAt),
    createdAt: p.createdAt.toISOString(),
    items: parsePrescriptionItems(p.items),
    invoiceId: p.invoice?.id ?? null,
    invoiceStatus: p.invoice?.status ?? null
  };
}

export type PrescriptionDto = ReturnType<typeof formatPrescription>;

export function formatMedicalRecord(r: RecordWithRelations) {
  const triage = parseTriageData(r.appointment.triageData);
  return {
    id: r.id,
    recordCode: r.recordCode,
    appointmentId: r.appointmentId,
    appointmentCode: r.appointment.appointmentCode,
    appointmentDate: formatDateOnly(r.appointment.appointmentDate),
    session: r.appointment.session,
    queueNumber: r.appointment.queueNumber,
    patientId: r.patientId,
    patientCode: r.patient.patientCode,
    patientName: r.patient.user.fullName,
    doctorId: r.doctorId,
    doctorName: r.doctor.user.fullName,
    doctorTitle: r.doctor.title,
    departmentName: r.doctor.department.name,
    symptoms: r.symptoms,
    diagnosis: r.diagnosis,
    icdCode: r.icdCode,
    clinicalNotes: r.clinicalNotes,
    treatmentPlan: r.treatmentPlan,
    specialtyResults: parseSpecialtyResults(r.specialtyResults),
    status: r.status,
    publishedAt: toIso(r.publishedAt),
    createdAt: r.createdAt.toISOString(),
    vitals: triage?.vitals ?? null,
    prescription: r.prescription ? formatPrescription(r.prescription) : null
  };
}

export type MedicalRecordDto = ReturnType<typeof formatMedicalRecord>;
