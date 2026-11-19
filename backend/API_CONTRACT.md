# An Tâm Hospital & Clinic Management System — REST API Contract

Base URL: `http://localhost:4000/api` (configurable via `VITE_API_URL`)

## 1. Conventions & Common Envelopes

### Authentication
All protected routes require:
```http
Authorization: Bearer <jwt_token>
```

### Standard Success Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```
(`meta` is included on paginated endpoints.)

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Thông báo lỗi tiếng Việt dễ hiểu",
    "details": {}
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401): Missing/invalid/expired JWT token
- `FORBIDDEN` (403): Insufficient role permissions
- `NOT_FOUND` (404): Resource does not exist
- `VALIDATION_ERROR` (400): Zod schema validation failure
- `CONFLICT` (409): Duplicate booking, full session, bed occupied, invalid state transition
- `ALLERGY_CONFLICT` / `INSUFFICIENT_STOCK` (400/409)
- `INTERNAL_ERROR` (500)

### Critical Domain Rules
1. **Session-Based Outpatient Booking** (no 15-min fixed slot grid):
   - `MORNING`: `07:30` – `11:30`
   - `AFTERNOON`: `13:30` – `17:00`
   - 3 booking flows supported: `BY_DEPARTMENT`, `BY_DOCTOR`, `BY_DATE`.
2. **Atomic Sequential STT (`queueNumber`)**:
   - Issued inside a PostgreSQL transaction using `SELECT ... FOR UPDATE` on `doctor_schedules`, enforced by PostgreSQL Partial Unique Indexes (`WHERE status <> 'CANCELLED'`).
   - Cancelled appointments keep their `queueNumber` intact (`last_queue_number` never decrements).
   - A patient cannot hold two active (`status <> 'CANCELLED'`) appointments for the same `(doctorId, date, session)`.
   - `estimatedTime` is computed from session start + `(queueNumber - 1) * avgMinutesPerPatient` formatted as `"HH:mm"`.

---

## 2. Shared TypeScript Interfaces

```ts
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

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
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
  scheduleDate: string; // YYYY-MM-DD
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
  appointmentDate: string; // YYYY-MM-DD
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
  occupancyRate: number; // 0-100 integer or 1 decimal
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
```

---

## 3. Endpoint Reference

### 3.1 Health & Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server & service healthcheck |
| `POST` | `/api/auth/login` | Public | Email/password login -> JWT + `AuthUserDto` |
| `POST` | `/api/auth/register` | Public | Register new `PATIENT` account -> JWT + `AuthUserDto` |
| `GET` | `/api/auth/me` | Any auth | Current authenticated user & role profile |
| `PATCH` | `/api/auth/profile` | Any auth | Update `fullName`, `phone`, `avatarUrl`, or password |

**`POST /api/auth/login`**
- Body: `{ email: string, password: string }`
- Response `200`: `{ success: true, data: { token: string, user: AuthUserDto } }`

**`POST /api/auth/register`**
- Body: `{ email: string, password: string, fullName: string, phone?: string, dateOfBirth?: string, gender?: Gender, address?: string, nationalId?: string, insuranceNumber?: string }`
- Response `201`: `{ success: true, data: { token: string, user: AuthUserDto } }`

**`GET /api/auth/me`**
- Response `200`: `{ success: true, data: { user: AuthUserDto } }`

**`PATCH /api/auth/profile`**
- Body: `{ fullName?: string, phone?: string, avatarUrl?: string, currentPassword?: string, newPassword?: string }`
- Response `200`: `{ success: true, data: { user: AuthUserDto } }`

---

### 3.2 Public & Shared Catalog Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/departments` | Public | List active clinical departments (`?includeInactive=true`) |
| `GET` | `/api/doctors` | Public | Search/filter doctors (`?departmentId=&search=&onDuty=`) |
| `GET` | `/api/schedules/availability` | Public | Query session availability for all 3 booking flows |
| `GET` | `/api/services` | Public | List medical services & lab tests (`?category=&departmentId=&search=`) |
| `GET` | `/api/medicines` | `DOCTOR, NURSE, ADMIN` | Search medicine catalog (`?search=&inStockOnly=true`) |

**`GET /api/schedules/availability`**
- Query params:
  - `flow`: `'BY_DEPARTMENT' | 'BY_DOCTOR' | 'BY_DATE'` (optional)
  - `departmentId`: filter by department UUID
  - `doctorId`: filter by doctor UUID
  - `date`: exact date `YYYY-MM-DD`
  - `fromDate` / `toDate`: date range `YYYY-MM-DD` (defaults to today through +7 days when `date` omitted)
  - `session`: `'MORNING' | 'AFTERNOON'`
- Response `200`: `ApiSuccessResponse<ScheduleAvailabilityDto[]>`

---

### 3.3 Notifications (All Authenticated Users)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Any auth | List user's notifications (`?unreadOnly=true&limit=20`) |
| `PATCH` | `/api/notifications/:id/read` | Any auth | Mark one notification read |
| `PATCH` | `/api/notifications/read-all` | Any auth | Mark all notifications read |

**`GET /api/notifications`**
- Response `200`: `{ success: true, data: { items: NotificationDto[], unreadCount: number } }`

---

### 3.4 Patient Portal (`/api/patient`, Role: `PATIENT`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/patient/profile` | Get full patient health profile |
| `PUT` | `/api/patient/profile` | Update personal info, allergies, chronic conditions, BHYT, emergency contact |
| `PATCH` | `/api/patient/profile` | Partial update of patient health profile |
| `GET` | `/api/patient/appointments` | List patient appointments (`?status=&upcoming=true`) |
| `POST` | `/api/patient/appointments` | Book appointment by session (atomic STT issuance) |
| `GET` | `/api/patient/appointments/:id` | Detailed appointment view incl. live STT, vitals, record |
| `PATCH` | `/api/patient/appointments/:id/reschedule` | Reschedule to new date/session/doctor (issues new STT) |
| `PATCH` | `/api/patient/appointments/:id/cancel` | Cancel appointment (keeps existing STTs intact) |
| `GET` | `/api/patient/records` | List published medical records |
| `GET` | `/api/patient/records/:id` | Detailed medical record with vitals, labOrders & prescription |
| `GET` | `/api/patient/prescriptions` | List patient prescriptions |
| `GET` | `/api/patient/prescriptions/:id` | Detailed prescription |
| `GET` | `/api/patient/invoices` | List invoices (`?type=HOSPITAL_FEE|PRESCRIPTION&status=`) |
| `GET` | `/api/patient/invoices/:id` | Invoice details with items & payments |
| `GET` | `/api/patient/payments` | List patient payment receipts |
| `POST` | `/api/patient/payments` | Initiate simulated QR transfer or pay-at-counter request |

**`POST /api/patient/appointments`**
- Body:
  ```json
  {
    "doctorId": "uuid",
    "date": "2026-11-18",
    "session": "MORNING",
    "bookingFlow": "BY_DEPARTMENT",
    "chiefComplaint": "Đau đầu, chóng mặt nhẹ 2 ngày nay"
  }
  ```
- Response `201`: `ApiSuccessResponse<AppointmentDto>`

**`PATCH /api/patient/appointments/:id/reschedule`**
- Body: `{ date: string, session: SessionType, doctorId?: string }`
- Response `200`: `ApiSuccessResponse<AppointmentDto>`

**`PATCH /api/patient/appointments/:id/cancel`**
- Body: `{ reason?: string }`
- Response `200`: `ApiSuccessResponse<AppointmentDto>`

**`POST /api/patient/payments`**
- Body: `{ invoiceId: string, method: 'QR_TRANSFER' | 'COUNTER_CASH', notes?: string }`
- Behavior: Moves invoice `status` -> `PENDING_VERIFICATION` and creates a `PENDING` `Payment` awaiting nurse confirmation.
- Response `201`:
  ```json
  {
    "success": true,
    "data": {
      "payment": { ... },
      "invoice": { ... },
      "qrInfo": {
        "bankName": "Vietcombank - CN TP.HCM",
        "accountNumber": "1029384756",
        "accountName": "BENH VIEN DA KHOA AN TAM",
        "amount": 150000,
        "transferContent": "ANTAM HD-20261117-001",
        "qrDataString": "ANTAM|VCB|1029384756|150000|HD-20261117-001"
      }
    }
  }
  ```

---

### 3.5 Doctor Portal (`/api/doctor`, Role: `DOCTOR`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/doctor/queue` | Doctor's queue grouped by `morning` and `afternoon` ordered by STT (`?date=YYYY-MM-DD&session=`) |
| `POST` | `/api/doctor/queue/call-next` | Call next waiting patient in session (`{ date?, session, completeCurrent?: boolean }`) |
| `PATCH` | `/api/doctor/appointments/:id/status` | Transition appointment status (`START`, `COMPLETE`, `NO_SHOW`, `CALL_NEXT`) |
| `GET` | `/api/doctor/patients/:id` | Patient profile, allergies, chronic conditions, full visit/record history (`{ patient, appointments, records, medicalRecords }`) |
| `POST` | `/api/doctor/prescriptions/check-allergies` | Real-time allergy check (`{ patientId, medicineIds }`) -> `{ warnings, hasWarnings }` |
| `GET` | `/api/doctor/records/:id` | Load single medical record (draft or published) for editing |
| `POST` | `/api/doctor/records` | Create/save (and optionally publish) medical record + labOrders + prescription |
| `PUT` | `/api/doctor/records/:id` | Update medical record + prescription |
| `POST` | `/api/doctor/records/:id/publish` | Publish record, auto-create/update invoices, notify patient, complete appointment |
| `POST` | `/api/doctor/follow-up` | Book follow-up/referral appointment by date + session issuing STT |
| `GET` | `/api/doctor/schedules` | List doctor's own schedules (`?from=&to=`) |
| `POST` | `/api/doctor/schedules` | Create or update session schedule (`{ date, session, maxPatients, avgMinutesPerPatient, isAvailable, notes }`) |
| `PATCH` | `/api/doctor/schedules/:id` | Toggle `isAvailable` or adjust `maxPatients` / `avgMinutesPerPatient` |

**`GET /api/doctor/queue`**
- Query: `?date=YYYY-MM-DD&session=MORNING|AFTERNOON` (date defaults to today)
- Response `200`:
  ```ts
  {
    success: true,
    data: {
      date: string;
      morning: {
        schedule: DoctorScheduleDto | null;
        currentServing: AppointmentDto | null;
        nextWaiting: AppointmentDto | null;
        stats: { total: number; waiting: number; inProgress: number; completed: number };
        appointments: AppointmentDto[];
      };
      afternoon: { ... };
    }
  }
  ```

**`PATCH /api/doctor/appointments/:id/status`**
- Body: `{ status?: 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW', action?: 'START' | 'COMPLETE' | 'NO_SHOW' | 'CALL_NEXT' }`
- Response `200`: `ApiSuccessResponse<AppointmentDto>`

**`POST /api/doctor/records`** & **`PUT /api/doctor/records/:id`**
- Body:
  ```json
  {
    "appointmentId": "uuid",
    "symptoms": "Sốt nhẹ 38.2°C, ho khan",
    "diagnosis": "Viêm họng cấp",
    "icdCode": "J02.9",
    "clinicalNotes": "Họng đỏ, amidan không sưng mủ",
    "treatmentPlan": "Uống thuốc 5 ngày, nghỉ ngơi, tái khám nếu sốt cao",
    "specialtyResults": {
      "examFindings": "Tim đều, phổi trong",
      "imagingNotes": "",
      "labOrders": [
        { "serviceId": "uuid", "testName": "Công thức máu", "status": "ORDERED" }
      ]
    },
    "orderedServiceIds": ["uuid"],
    "prescription": {
      "notes": "Uống đủ nước ấm",
      "items": [
        {
          "medicineId": "uuid",
          "quantity": 10,
          "dosage": "1 viên x 2 lần/ngày",
          "frequency": "Sáng - Tối",
          "durationDays": 5,
          "instructions": "Uống sau ăn"
        }
      ]
    },
    "publish": true
  }
  ```
- Response `201` / `200`:
  ```json
  {
    "success": true,
    "data": {
      "medicalRecord": { ... },
      "prescription": { ... },
      "invoices": [ ... ],
      "allergyWarnings": [ ... ]
    }
  }
  ```

**`POST /api/doctor/follow-up`**
- Body: `{ patientId: string, date: string, session: SessionType, doctorId?: string, chiefComplaint?: string }`
- Response `201`: `ApiSuccessResponse<AppointmentDto>`

---

### 3.6 Nurse Portal (`/api/nurse`, Role: `NURSE`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/nurse/patients` | Search patients (`?search=`) for walk-in or bed admission |
| `GET` | `/api/nurse/appointments` | List appointments (`?date=&session=&status=&search=`) |
| `POST` | `/api/nurse/appointments/check-in` | Check in by `{ appointmentId }` or `{ appointmentCode }` or `{ queueNumber, doctorId, date, session }` |
| `PATCH` | `/api/nurse/appointments/:id/check-in` | Check in appointment by ID |
| `POST` | `/api/nurse/appointments/walk-in` | Register walk-in appointment issuing next STT + optional priority flag (accepts flat patient fields or `newPatient` object) |
| `GET` | `/api/nurse/procedures` | List triage/nursing procedures (`?appointmentId=&date=`) |
| `POST` | `/api/nurse/procedures` | Save/upsert triage vitals JSONB & procedure checklist JSONB |
| `GET` | `/api/nurse/payments` | List invoices & payments (`?status=PENDING\|UNPAID\|PENDING_VERIFICATION\|PAID&search=`) |
| `POST` | `/api/nurse/payments/:id/confirm` | Atomic payment confirmation (`:id` accepts `invoiceId` or `paymentId`) |
| `POST` | `/api/nurse/payments/:id/reject` | Reject pending QR payment (`:id` accepts `invoiceId` or `paymentId`) |
| `GET` | `/api/nurse/prescriptions` | List prescriptions for dispensing (`?status=PAID\|DISPENSED\|PENDING_PAYMENT&search=`) |
| `POST` | `/api/nurse/prescriptions/:id/dispense` | Dispense PAID prescription & decrement medicine stock |
| `GET` | `/api/nurse/beds` | List beds & occupancy stats (`?departmentId=&status=&search=`) |
| `POST` | `/api/nurse/beds/:id/admit` | Admit patient (`{ patientId, notes? }`) |
| `POST` | `/api/nurse/beds/:id/transfer` | Transfer patient to another available bed (`{ targetBedId, notes? }`) |
| `POST` | `/api/nurse/beds/:id/discharge` | Discharge patient (`{ notes? }`) |
| `PATCH` | `/api/nurse/beds/:id/status` | Set bed to `AVAILABLE` or `MAINTENANCE` (`{ status, notes? }`) |

**`GET /api/nurse/beds`**
- Response `200`:
  ```ts
  {
    success: true,
    data: {
      summary: { total: number, occupied: number, available: number, maintenance: number, occupancyRate: number },
      byDepartment: DepartmentBedStatsDto[],
      beds: BedDto[]
    }
  }
  ```

---

### 3.7 Admin / Hospital Director Portal (`/api/admin`, Role: `ADMIN`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/dashboard` | KPIs, 7-day visits comparison, on-duty doctors, today appointments, bed occupancy, revenue |
| `GET` | `/api/admin/appointments` | Global filterable appointments (`?date=&from=&to=&status=&departmentId=&doctorId=&search=&page=&limit=`) |
| `GET` | `/api/admin/patients` | Global searchable patient directory (`?search=&page=&limit=`) |
| `GET` | `/api/admin/patients/:id` | Detailed patient profile & history |
| `GET` | `/api/admin/medical-records` | Global medical records search (`?search=&doctorId=&departmentId=&status=&from=&to=&page=&limit=`) |
| `GET` | `/api/admin/departments` | List all departments |
| `POST` | `/api/admin/departments` | Create department |
| `PATCH` | `/api/admin/departments/:id` | Update department |
| `DELETE` | `/api/admin/departments/:id` | Deactivate/delete department |
| `GET` | `/api/admin/rooms` | List all rooms (`?departmentId=&roomType=`) |
| `POST` | `/api/admin/rooms` | Create room |
| `PATCH` | `/api/admin/rooms/:id` | Update room |
| `DELETE` | `/api/admin/rooms/:id` | Deactivate/delete room |
| `GET` | `/api/admin/beds` | List all beds (`?departmentId=&status=`) |
| `POST` | `/api/admin/beds` | Create bed |
| `PATCH` | `/api/admin/beds/:id` | Update bed (`bedNumber`, `roomId`, `status`, `notes`) |
| `DELETE` | `/api/admin/beds/:id` | Delete unoccupied bed |
| `GET` | `/api/admin/doctors` | List all doctors (`?departmentId=&search=`) |
| `POST` | `/api/admin/doctors` | Create doctor account + profile |
| `PATCH` | `/api/admin/doctors/:id` | Update doctor profile, room, `isOnDuty`, `isActive` |
| `DELETE` | `/api/admin/doctors/:id` | Deactivate doctor |
| `GET` | `/api/admin/nurses` | List all nurses (`?departmentId=&search=`) |
| `POST` | `/api/admin/nurses` | Create nurse account + profile |
| `PATCH` | `/api/admin/nurses/:id` | Update nurse profile, shift, `isActive` |
| `DELETE` | `/api/admin/nurses/:id` | Deactivate nurse |
| `GET` | `/api/admin/schedules` | List schedules (`?doctorId=&departmentId=&from=&to=`) |
| `POST` | `/api/admin/schedules` | Create single or bulk schedules (`{ doctorId, date?, fromDate?, toDate?, sessions?: SessionType[], maxPatients?, avgMinutesPerPatient?, isAvailable? }`) |
| `PATCH` | `/api/admin/schedules/:id` | Update schedule |
| `GET` | `/api/admin/medicines` | List all medicines (`?search=&includeInactive=true`) |
| `POST` | `/api/admin/medicines` | Create medicine |
| `PATCH` | `/api/admin/medicines/:id` | Update medicine & stock |
| `DELETE` | `/api/admin/medicines/:id` | Deactivate medicine |
| `GET` | `/api/admin/services` | List all services (`?category=&search=&includeInactive=true`) |
| `POST` | `/api/admin/services` | Create service |
| `PATCH` | `/api/admin/services/:id` | Update service |
| `DELETE` | `/api/admin/services/:id` | Deactivate service |
| `GET` | `/api/admin/reports/export` | Download CSV report (`?type=appointments\|revenue\|beds\|patients&from=&to=`) |

---

## 4. Seed Demo Accounts (Password: `123456` for all demo users)

| Role | Name | Email | Code / Notes |
|---|---|---|---|
| `PATIENT` | Lê Minh Anh | `minhanh.patient@antam.vn` | `BN-08250` |
| `DOCTOR` | BS. Hoàng Minh Long | `long.doctor@antam.vn` | `BS-001` • Nội tổng quát • Phòng 201 |
| `DOCTOR` | BS. Trần Thảo Nguyên | `nguyen.doctor@antam.vn` | `BS-002` • Tim mạch • Phòng 305 |
| `DOCTOR` | BS. Nguyễn Quốc Huy | `huy.doctor@antam.vn` | `BS-003` • Nhi khoa • Phòng 102 |
| `NURSE` | ĐD. Phạm Thị Mai | `mai.nurse@antam.vn` | `DD-001` • Nội tổng quát |
| `ADMIN` | Minh Anh (Giám đốc) | `admin@antam.vn` | Hospital Director |
