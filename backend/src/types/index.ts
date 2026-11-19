export type Role = 'PATIENT' | 'DOCTOR' | 'NURSE' | 'ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type SessionType = 'MORNING' | 'AFTERNOON';
export type BookingType = 'ONLINE' | 'WALK_IN' | 'FOLLOW_UP';
export type BookingFlow = 'BY_DEPARTMENT' | 'BY_DOCTOR' | 'BY_DATE' | 'WALK_IN' | 'FOLLOW_UP';
export type AppointmentStatus =
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type RoomType = 'EXAMINATION' | 'INPATIENT_WARD' | 'TRIAGE' | 'PHARMACY' | 'LAB';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type RecordStatus = 'DRAFT' | 'PUBLISHED';
export type ServiceCategory = 'CONSULTATION' | 'LAB_TEST' | 'IMAGING' | 'PROCEDURE';
export type PrescriptionStatus = 'PENDING_PAYMENT' | 'PAID' | 'DISPENSED' | 'CANCELLED';
export type InvoiceType = 'HOSPITAL_FEE' | 'PRESCRIPTION';
export type InvoiceStatus = 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'QR_TRANSFER' | 'COUNTER_CASH' | 'CARD';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REJECTED';
export type NotificationType =
  | 'APPOINTMENT'
  | 'QUEUE_CALL'
  | 'EXAM_RESULT'
  | 'PAYMENT'
  | 'PRESCRIPTION'
  | 'SYSTEM';

export interface AllergyItem {
  name: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  reaction?: string;
}

export interface ChronicConditionItem {
  name: string;
  diagnosedYear?: number;
  notes?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface VitalsData {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  spo2?: number;
  respiratoryRate?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
}

export interface ChecklistData {
  bhytVerified?: boolean;
  identityVerified?: boolean;
  allergyScreened?: boolean;
  consentSigned?: boolean;
  notes?: string;
  items?: { label: string; checked: boolean }[];
}

export interface LabOrderItem {
  serviceId?: string;
  testName: string;
  category?: string;
  status: 'ORDERED' | 'COMPLETED';
  result?: string;
  normalRange?: string;
  unit?: string;
  notes?: string;
}

export interface SpecialtyResultsData {
  examFindings?: string;
  imagingNotes?: string;
  labOrders?: LabOrderItem[];
}

export interface MedicineContraindications {
  allergens?: string[];
  conditions?: string[];
  warningText?: string;
}

export interface AllergyWarningDto {
  medicineId: string;
  medicineName: string;
  matchedAllergens: string[];
  matchedConditions: string[];
  severity: 'MODERATE' | 'HIGH';
  message: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface TriageDataJson {
  id: string;
  nurseId: string;
  nurseName: string;
  vitals: VitalsData;
  checklistData: ChecklistData;
  triageNotes: string | null;
  recordedAt: string;
}

export interface PrescriptionItemJson {
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

export interface InvoiceItemJson {
  id: string;
  serviceId: string | null;
  medicineId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BedAssignmentHistoryJson {
  id: string;
  patientId: string;
  assignedByNurseId: string | null;
  action: 'ADMIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DISCHARGE';
  admittedAt: string | null;
  dischargedAt: string | null;
  notes: string | null;
}
