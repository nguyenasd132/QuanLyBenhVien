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

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

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

export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  patientProfile?: {
    id: string;
    patientCode: string;
    dateOfBirth: string | null;
    gender: Gender | null;
    address: string | null;
    nationalId: string | null;
    insuranceNumber: string | null;
    bloodType: string | null;
    allergies: AllergyItem[];
    chronicConditions: ChronicConditionItem[];
    emergencyContact: EmergencyContact | null;
  } | null;
  doctorProfile?: {
    id: string;
    doctorCode: string;
    departmentId: string;
    departmentName: string;
    roomId: string | null;
    roomName: string | null;
    specialty: string;
    title: string | null;
    consultationFee: number;
    isOnDuty: boolean;
  } | null;
  nurseProfile?: {
    id: string;
    nurseCode: string;
    departmentId: string;
    departmentName: string;
    shift: string | null;
  } | null;
}

export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  location: string | null;
  consultationFee: number;
  isActive: boolean;
  doctorCount?: number;
}

export interface RoomDto {
  id: string;
  code: string;
  name: string;
  roomType: RoomType;
  floor: string | null;
  departmentId: string;
  departmentName?: string;
  isActive: boolean;
}

export interface DoctorDto {
  id: string;
  userId: string;
  doctorCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  title: string | null;
  specialty: string;
  bio: string | null;
  yearsOfExperience: number;
  consultationFee: number;
  isOnDuty: boolean;
  isActive: boolean;
  department: {
    id: string;
    code: string;
    name: string;
  };
  room: {
    id: string;
    code: string;
    name: string;
    floor: string | null;
  } | null;
}

export interface NurseDto {
  id: string;
  userId: string;
  nurseCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  shift: string | null;
  isActive: boolean;
  department: {
    id: string;
    code: string;
    name: string;
  };
}

export interface ScheduleAvailabilityDto {
  scheduleId: string;
  doctorId: string;
  doctorName: string;
  doctorTitle: string | null;
  doctorCode: string;
  specialty: string;
  consultationFee: number;
  departmentId: string;
  departmentName: string;
  roomName: string | null;
  scheduleDate: string;
  session: SessionType;
  sessionLabel: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  bookedCount: number;
  remainingSlots: number;
  nextQueueNumber: number;
  estimatedTime: string;
  avgMinutesPerPatient: number;
  isAvailable: boolean;
}

export interface DoctorScheduleDto {
  id: string;
  doctorId: string;
  doctorName?: string;
  departmentName?: string;
  scheduleDate: string;
  session: SessionType;
  startTime: string;
  endTime: string;
  maxPatients: number;
  avgMinutesPerPatient: number;
  lastQueueNumber: number;
  bookedCount: number;
  isAvailable: boolean;
  notes: string | null;
}

export interface PatientSummaryDto {
  id: string;
  userId: string;
  patientCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  address: string | null;
  nationalId: string | null;
  insuranceNumber: string | null;
  bloodType: string | null;
  allergies: AllergyItem[];
  chronicConditions: ChronicConditionItem[];
  emergencyContact: EmergencyContact | null;
}

export interface NursingProcedureDto {
  id: string;
  appointmentId: string;
  nurseId: string;
  nurseName: string;
  vitals: VitalsData;
  checklistData: ChecklistData;
  triageNotes: string | null;
  recordedAt: string;
}

export interface AppointmentDto {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientPhone: string | null;
  patientGender: Gender | null;
  patientDateOfBirth: string | null;
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  doctorTitle: string | null;
  specialty: string;
  departmentId: string;
  departmentName: string;
  roomName: string | null;
  scheduleId: string | null;
  appointmentDate: string;
  session: SessionType;
  queueNumber: number;
  estimatedTime: string;
  liveCurrentStt: number | null;
  bookingType: BookingType;
  bookingFlow: string | null;
  status: AppointmentStatus;
  isPriority: boolean;
  chiefComplaint: string | null;
  cancelReason: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  hasNursingProcedure: boolean;
  hasMedicalRecord: boolean;
  nursingProcedure?: NursingProcedureDto | null;
  medicalRecordId?: string | null;
}

export interface MedicineDto {
  id: string;
  code: string;
  name: string;
  genericName: string | null;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  dosageForm: string | null;
  contraindications: MedicineContraindications;
  manufacturer: string | null;
  isActive: boolean;
}

export interface ServiceDto {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  departmentId: string | null;
  departmentName?: string | null;
  unitPrice: number;
  description: string | null;
  isActive: boolean;
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

export interface MedicalRecordDto {
  id: string;
  recordCode: string;
  appointmentId: string;
  appointmentCode: string;
  appointmentDate: string;
  session: SessionType;
  queueNumber: number;
  patientId: string;
  patientCode: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorTitle: string | null;
  departmentName: string;
  symptoms: string | null;
  diagnosis: string;
  icdCode: string | null;
  clinicalNotes: string | null;
  treatmentPlan: string | null;
  specialtyResults: SpecialtyResultsData;
  status: RecordStatus;
  publishedAt: string | null;
  createdAt: string;
  vitals?: VitalsData | null;
  prescription?: PrescriptionDto | null;
}

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

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface DoctorQueueSessionDto {
  schedule: DoctorScheduleDto | null;
  currentServing: AppointmentDto | null;
  nextWaiting: AppointmentDto | null;
  stats: {
    total: number;
    waiting: number;
    inProgress: number;
    completed: number;
  };
  appointments: AppointmentDto[];
}

export interface DoctorQueueResponseDto {
  date: string;
  morning: DoctorQueueSessionDto;
  afternoon: DoctorQueueSessionDto;
}

export interface NurseBedsResponseDto {
  summary: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    occupancyRate: number;
  };
  byDepartment: DepartmentBedStatsDto[];
  beds: BedDto[];
}

export interface AdminDashboardDto {
  date: string;
  kpis: {
    todayVisits: {
      count: number;
      yesterdayCount: number;
      percentChange: number;
    };
    todayAppointments: {
      total: number;
      upcoming: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
    onDutyDoctors: {
      count: number;
      totalDoctors: number;
      byDepartment: { departmentName: string; count: number }[];
    };
    bedOccupancy: {
      occupied: number;
      available: number;
      maintenance: number;
      total: number;
      occupancyRate: number;
    };
  };
  visitsComparison7Days: {
    date: string;
    label: string;
    currentWeekCount: number;
    previousWeekCount: number;
  }[];
  onDutyDoctorsList: {
    id: string;
    fullName: string;
    title: string | null;
    specialty: string;
    departmentName: string;
    roomName: string | null;
    isOnDuty: boolean;
    todayQueueCount: number;
  }[];
  todayAppointmentsList: AppointmentDto[];
  bedOccupancyByDepartment: DepartmentBedStatsDto[];
  revenueSummary: {
    totalPaid: number;
    totalUnpaid: number;
    hospitalFeesPaid: number;
    prescriptionsPaid: number;
    todayRevenue: number;
    monthRevenue: number;
  };
}
