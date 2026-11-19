import type {
  AdminDashboardDto,
  AllergyItem,
  AllergyWarningDto,
  ApiErrorResponse,
  ApiSuccessResponse,
  AppointmentDto,
  AppointmentStatus,
  AuthUserDto,
  BedDto,
  BedStatus,
  BookingFlow,
  ChecklistData,
  ChronicConditionItem,
  DepartmentDto,
  DoctorDto,
  DoctorQueueResponseDto,
  DoctorScheduleDto,
  EmergencyContact,
  Gender,
  InvoiceDto,
  InvoiceStatus,
  InvoiceType,
  MedicalRecordDto,
  MedicineContraindications,
  MedicineDto,
  NotificationDto,
  NurseBedsResponseDto,
  NurseDto,
  NursingProcedureDto,
  PaginationMeta,
  PatientSummaryDto,
  PaymentDto,
  PaymentMethod,
  PrescriptionDto,
  PrescriptionStatus,
  QrInfoDto,
  RoomDto,
  RoomType,
  ScheduleAvailabilityDto,
  ServiceCategory,
  ServiceDto,
  SessionType,
  SpecialtyResultsData,
  VitalsData,
} from '@/types';

const TOKEN_STORAGE_KEY = 'antam_token';
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  returnMeta = false
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && unauthorizedHandler && !path.startsWith('/auth/login')) {
    unauthorizedHandler();
  }

  const text = await response.text();
  let json: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(response.status, 'HTTP_ERROR', text || 'Lỗi kết nối máy chủ');
      }
      return text as unknown as T;
    }
  }

  if (!response.ok || (json && !json.success)) {
    const errPayload = json && !json.success ? json.error : null;
    throw new ApiError(
      response.status,
      errPayload?.code || 'REQUEST_FAILED',
      errPayload?.message || `Yêu cầu thất bại (${response.status})`,
      errPayload?.details
    );
  }

  if (returnMeta) {
    return json as unknown as T;
  }

  return (json as ApiSuccessResponse<T>).data;
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(`${path}${buildQuery(params)}`, { method: 'GET' }),
  getWithMeta: <T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ) =>
    request<{ data: T; meta?: PaginationMeta }>(
      `${path}${buildQuery(params)}`,
      { method: 'GET' },
      true
    ),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined }),
  async downloadCsv(path: string, filename: string, params?: Record<string, string | undefined>) {
    const token = getStoredToken();
    const url = `${API_BASE_URL}${path}${buildQuery(params)}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'EXPORT_FAILED', 'Không thể xuất báo cáo CSV');
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  },
};

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  nationalId?: string;
  insuranceNumber?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: AuthUserDto }>('/auth/login', { email, password }),
  register: (payload: RegisterPayload) =>
    apiClient.post<{ token: string; user: AuthUserDto }>('/auth/register', payload),
  me: () => apiClient.get<{ user: AuthUserDto }>('/auth/me'),
  updateProfile: (payload: {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => apiClient.patch<{ user: AuthUserDto }>('/auth/profile', payload),
};

export const publicApi = {
  health: () => apiClient.get<{ status: string }>('/health'),
  getDepartments: (includeInactive?: boolean) =>
    apiClient.get<DepartmentDto[]>('/departments', { includeInactive }),
  getDoctors: (params?: { departmentId?: string; search?: string; onDuty?: boolean }) =>
    apiClient.get<DoctorDto[]>('/doctors', params),
  getAvailability: (params?: {
    flow?: BookingFlow;
    departmentId?: string;
    doctorId?: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    session?: SessionType;
  }) => apiClient.get<ScheduleAvailabilityDto[]>('/schedules/availability', params),
  getServices: (params?: { category?: ServiceCategory; departmentId?: string; search?: string }) =>
    apiClient.get<ServiceDto[]>('/services', params),
  getMedicines: (params?: { search?: string; inStockOnly?: boolean }) =>
    apiClient.get<MedicineDto[]>('/medicines', params),
};

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    apiClient.get<{ items: NotificationDto[]; unreadCount: number }>('/notifications', params),
  markRead: (id: string) => apiClient.patch<NotificationDto>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch<{ updatedCount?: number }>('/notifications/read-all'),
};

export interface UpdatePatientProfilePayload {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  address?: string | null;
  nationalId?: string | null;
  insuranceNumber?: string | null;
  bloodType?: string | null;
  allergies?: AllergyItem[];
  chronicConditions?: ChronicConditionItem[];
  emergencyContact?: EmergencyContact | null;
}

export const patientApi = {
  getProfile: () => apiClient.get<PatientSummaryDto>('/patient/profile'),
  updateProfile: (payload: UpdatePatientProfilePayload) =>
    apiClient.put<PatientSummaryDto>('/patient/profile', payload),
  patchProfile: (payload: UpdatePatientProfilePayload) =>
    apiClient.patch<PatientSummaryDto>('/patient/profile', payload),
  getAppointments: (params?: { status?: AppointmentStatus; upcoming?: boolean }) =>
    apiClient.get<AppointmentDto[]>('/patient/appointments', params),
  bookAppointment: (payload: {
    doctorId: string;
    date: string;
    session: SessionType;
    bookingFlow?: BookingFlow;
    chiefComplaint?: string;
  }) => apiClient.post<AppointmentDto>('/patient/appointments', payload),
  getAppointmentDetail: (id: string) =>
    apiClient.get<AppointmentDto & { medicalRecord?: MedicalRecordDto | null }>(
      `/patient/appointments/${id}`
    ),
  rescheduleAppointment: (
    id: string,
    payload: { date: string; session: SessionType; doctorId?: string }
  ) => apiClient.patch<AppointmentDto>(`/patient/appointments/${id}/reschedule`, payload),
  cancelAppointment: (id: string, reason?: string) =>
    apiClient.patch<AppointmentDto>(`/patient/appointments/${id}/cancel`, { reason }),
  getRecords: () => apiClient.get<MedicalRecordDto[]>('/patient/records'),
  getRecordDetail: (id: string) => apiClient.get<MedicalRecordDto>(`/patient/records/${id}`),
  getPrescriptions: () => apiClient.get<PrescriptionDto[]>('/patient/prescriptions'),
  getPrescriptionDetail: (id: string) =>
    apiClient.get<PrescriptionDto>(`/patient/prescriptions/${id}`),
  getInvoices: (params?: { type?: InvoiceType; status?: InvoiceStatus }) =>
    apiClient.get<InvoiceDto[]>('/patient/invoices', params),
  getInvoiceDetail: (id: string) => apiClient.get<InvoiceDto>(`/patient/invoices/${id}`),
  getPayments: () => apiClient.get<PaymentDto[]>('/patient/payments'),
  createPayment: (payload: {
    invoiceId: string;
    method: Extract<PaymentMethod, 'QR_TRANSFER' | 'COUNTER_CASH'>;
    notes?: string;
  }) =>
    apiClient.post<{
      payment: PaymentDto;
      invoice: InvoiceDto;
      qrInfo?: QrInfoDto;
    }>('/patient/payments', payload),
};

export interface SaveRecordPayload {
  appointmentId: string;
  symptoms?: string;
  diagnosis: string;
  icdCode?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  specialtyResults?: SpecialtyResultsData;
  orderedServiceIds?: string[];
  prescription?: {
    notes?: string;
    items: {
      medicineId: string;
      quantity: number;
      dosage: string;
      frequency?: string;
      durationDays?: number;
      instructions?: string;
    }[];
  };
  publish?: boolean;
}

export interface SaveRecordResponse {
  medicalRecord: MedicalRecordDto;
  prescription: PrescriptionDto | null;
  invoices: InvoiceDto[];
  allergyWarnings: AllergyWarningDto[];
}

export const doctorApi = {
  getQueue: (params?: { date?: string; session?: SessionType }) =>
    apiClient.get<DoctorQueueResponseDto>('/doctor/queue', params),
  callNext: (payload: { date?: string; session: SessionType; completeCurrent?: boolean }) =>
    apiClient.post<AppointmentDto | null>('/doctor/queue/call-next', payload),
  updateAppointmentStatus: (
    id: string,
    payload: {
      status?: 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
      action?: 'START' | 'COMPLETE' | 'NO_SHOW' | 'CALL_NEXT';
    }
  ) => apiClient.patch<AppointmentDto>(`/doctor/appointments/${id}/status`, payload),
  getPatientHistory: (patientId: string) =>
    apiClient.get<{
      patient: PatientSummaryDto;
      appointments: AppointmentDto[];
      records: MedicalRecordDto[];
      medicalRecords?: MedicalRecordDto[];
    }>(`/doctor/patients/${patientId}`),
  checkAllergies: (payload: { patientId: string; medicineIds: string[] }) =>
    apiClient.post<{ warnings: AllergyWarningDto[]; hasWarnings: boolean }>(
      '/doctor/prescriptions/check-allergies',
      payload
    ),
  createRecord: (payload: SaveRecordPayload) =>
    apiClient.post<SaveRecordResponse>('/doctor/records', payload),
  updateRecord: (id: string, payload: Partial<SaveRecordPayload>) =>
    apiClient.put<SaveRecordResponse>(`/doctor/records/${id}`, payload),
  publishRecord: (id: string) =>
    apiClient.post<SaveRecordResponse>(`/doctor/records/${id}/publish`),
  bookFollowUp: (payload: {
    patientId: string;
    date: string;
    session: SessionType;
    doctorId?: string;
    chiefComplaint?: string;
  }) => apiClient.post<AppointmentDto>('/doctor/follow-up', payload),
  getSchedules: (params?: { from?: string; to?: string }) =>
    apiClient.get<DoctorScheduleDto[]>('/doctor/schedules', params),
  upsertSchedule: (payload: {
    date: string;
    session: SessionType;
    maxPatients?: number;
    avgMinutesPerPatient?: number;
    isAvailable?: boolean;
    notes?: string;
  }) => apiClient.post<DoctorScheduleDto>('/doctor/schedules', payload),
  updateSchedule: (
    id: string,
    payload: {
      maxPatients?: number;
      avgMinutesPerPatient?: number;
      isAvailable?: boolean;
      notes?: string;
    }
  ) => apiClient.patch<DoctorScheduleDto>(`/doctor/schedules/${id}`, payload),
};

export const nurseApi = {
  getPatients: (search?: string) =>
    apiClient.get<PatientSummaryDto[]>('/nurse/patients', { search }),
  getAppointments: (params?: {
    date?: string;
    session?: SessionType;
    status?: AppointmentStatus;
    search?: string;
  }) => apiClient.get<AppointmentDto[]>('/nurse/appointments', params),
  checkInLookup: (payload: {
    appointmentId?: string;
    appointmentCode?: string;
    queueNumber?: number;
    doctorId?: string;
    date?: string;
    session?: SessionType;
  }) => apiClient.post<AppointmentDto>('/nurse/appointments/check-in', payload),
  checkInById: (id: string) =>
    apiClient.patch<AppointmentDto>(`/nurse/appointments/${id}/check-in`),
  createWalkIn: (payload: {
    patientId?: string;
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: Gender;
    newPatient?: {
      fullName: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: Gender;
    };
    doctorId: string;
    date?: string;
    session: SessionType;
    isPriority?: boolean;
    chiefComplaint?: string;
  }) => apiClient.post<AppointmentDto>('/nurse/appointments/walk-in', payload),
  getProcedures: (params?: { appointmentId?: string; date?: string }) =>
    apiClient.get<NursingProcedureDto[]>('/nurse/procedures', params),
  saveProcedure: (payload: {
    appointmentId: string;
    vitals: VitalsData;
    checklistData: ChecklistData;
    triageNotes?: string;
  }) => apiClient.post<NursingProcedureDto>('/nurse/procedures', payload),
  getPayments: (params?: { status?: string; search?: string }) =>
    apiClient.get<InvoiceDto[]>('/nurse/payments', params),
  confirmPayment: (id: string, payload?: { method?: PaymentMethod; notes?: string }) =>
    apiClient.post<{ invoice: InvoiceDto; payment?: PaymentDto }>(
      `/nurse/payments/${id}/confirm`,
      payload
    ),
  rejectPayment: (id: string, payload?: { reason?: string }) =>
    apiClient.post<{ invoice: InvoiceDto; payment?: PaymentDto }>(
      `/nurse/payments/${id}/reject`,
      payload
    ),
  getPrescriptions: (params?: { status?: PrescriptionStatus; search?: string }) =>
    apiClient.get<PrescriptionDto[]>('/nurse/prescriptions', params),
  dispensePrescription: (id: string) =>
    apiClient.post<PrescriptionDto>(`/nurse/prescriptions/${id}/dispense`),
  getBeds: (params?: { departmentId?: string; status?: BedStatus; search?: string }) =>
    apiClient.get<NurseBedsResponseDto>('/nurse/beds', params),
  admitBed: (bedId: string, payload: { patientId: string; notes?: string }) =>
    apiClient.post<BedDto>(`/nurse/beds/${bedId}/admit`, payload),
  transferBed: (bedId: string, payload: { targetBedId: string; notes?: string }) =>
    apiClient.post<BedDto>(`/nurse/beds/${bedId}/transfer`, payload),
  dischargeBed: (bedId: string, payload?: { notes?: string }) =>
    apiClient.post<BedDto>(`/nurse/beds/${bedId}/discharge`, payload),
  updateBedStatus: (
    bedId: string,
    payload: { status: Extract<BedStatus, 'AVAILABLE' | 'MAINTENANCE'>; notes?: string }
  ) => apiClient.patch<BedDto>(`/nurse/beds/${bedId}/status`, payload),
};

export const adminApi = {
  getDashboard: (date?: string) => apiClient.get<AdminDashboardDto>('/admin/dashboard', { date }),
  getAppointments: (params?: {
    date?: string;
    from?: string;
    to?: string;
    status?: AppointmentStatus;
    departmentId?: string;
    doctorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => apiClient.getWithMeta<AppointmentDto[]>('/admin/appointments', params),
  getPatients: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.getWithMeta<PatientSummaryDto[]>('/admin/patients', params),
  getPatientDetail: (id: string) =>
    apiClient.get<{
      patient: PatientSummaryDto;
      appointments: AppointmentDto[];
      records: MedicalRecordDto[];
      medicalRecords?: MedicalRecordDto[];
      invoices: InvoiceDto[];
    }>(`/admin/patients/${id}`),
  getMedicalRecords: (params?: {
    search?: string;
    doctorId?: string;
    departmentId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => apiClient.getWithMeta<MedicalRecordDto[]>('/admin/medical-records', params),
  getDepartments: () => apiClient.get<DepartmentDto[]>('/admin/departments'),
  createDepartment: (payload: {
    code: string;
    name: string;
    description?: string;
    location?: string;
    consultationFee?: number;
  }) => apiClient.post<DepartmentDto>('/admin/departments', payload),
  updateDepartment: (id: string, payload: Partial<DepartmentDto>) =>
    apiClient.patch<DepartmentDto>(`/admin/departments/${id}`, payload),
  deleteDepartment: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/departments/${id}`),
  getRooms: (params?: { departmentId?: string; roomType?: RoomType }) =>
    apiClient.get<RoomDto[]>('/admin/rooms', params),
  createRoom: (payload: {
    code: string;
    name: string;
    roomType: RoomType;
    floor?: string;
    departmentId: string;
  }) => apiClient.post<RoomDto>('/admin/rooms', payload),
  updateRoom: (id: string, payload: Partial<RoomDto>) =>
    apiClient.patch<RoomDto>(`/admin/rooms/${id}`, payload),
  deleteRoom: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/rooms/${id}`),
  getBeds: (params?: { departmentId?: string; status?: BedStatus }) =>
    apiClient.get<BedDto[]>('/admin/beds', params),
  createBed: (payload: {
    bedNumber: string;
    roomId: string;
    departmentId?: string;
    status?: BedStatus;
    notes?: string;
  }) => apiClient.post<BedDto>('/admin/beds', payload),
  updateBed: (
    id: string,
    payload: { bedNumber?: string; roomId?: string; status?: BedStatus; notes?: string }
  ) => apiClient.patch<BedDto>(`/admin/beds/${id}`, payload),
  deleteBed: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/beds/${id}`),
  getDoctors: (params?: { departmentId?: string; search?: string }) =>
    apiClient.get<DoctorDto[]>('/admin/doctors', params),
  createDoctor: (payload: {
    email: string;
    password?: string;
    fullName: string;
    phone?: string;
    doctorCode: string;
    departmentId: string;
    roomId?: string;
    specialty: string;
    title?: string;
    bio?: string;
    yearsOfExperience?: number;
    consultationFee?: number;
    isOnDuty?: boolean;
  }) => apiClient.post<DoctorDto>('/admin/doctors', payload),
  updateDoctor: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch<DoctorDto>(`/admin/doctors/${id}`, payload),
  deleteDoctor: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/doctors/${id}`),
  getNurses: (params?: { departmentId?: string; search?: string }) =>
    apiClient.get<NurseDto[]>('/admin/nurses', params),
  createNurse: (payload: {
    email: string;
    password?: string;
    fullName: string;
    phone?: string;
    nurseCode: string;
    departmentId: string;
    shift?: string;
  }) => apiClient.post<NurseDto>('/admin/nurses', payload),
  updateNurse: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch<NurseDto>(`/admin/nurses/${id}`, payload),
  deleteNurse: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/nurses/${id}`),
  getSchedules: (params?: { doctorId?: string; departmentId?: string; from?: string; to?: string }) =>
    apiClient.get<DoctorScheduleDto[]>('/admin/schedules', params),
  createSchedules: (payload: {
    doctorId: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    sessions?: SessionType[];
    maxPatients?: number;
    avgMinutesPerPatient?: number;
    isAvailable?: boolean;
  }) => apiClient.post<DoctorScheduleDto | DoctorScheduleDto[]>('/admin/schedules', payload),
  updateSchedule: (id: string, payload: Partial<DoctorScheduleDto>) =>
    apiClient.patch<DoctorScheduleDto>(`/admin/schedules/${id}`, payload),
  getMedicines: (params?: { search?: string; includeInactive?: boolean }) =>
    apiClient.get<MedicineDto[]>('/admin/medicines', params),
  createMedicine: (payload: {
    code: string;
    name: string;
    genericName?: string;
    unit: string;
    unitPrice: number;
    stockQuantity?: number;
    dosageForm?: string;
    contraindications?: MedicineContraindications;
    manufacturer?: string;
  }) => apiClient.post<MedicineDto>('/admin/medicines', payload),
  updateMedicine: (id: string, payload: Partial<MedicineDto>) =>
    apiClient.patch<MedicineDto>(`/admin/medicines/${id}`, payload),
  deleteMedicine: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/medicines/${id}`),
  getServices: (params?: {
    category?: ServiceCategory;
    search?: string;
    includeInactive?: boolean;
  }) => apiClient.get<ServiceDto[]>('/admin/services', params),
  createService: (payload: {
    code: string;
    name: string;
    category: ServiceCategory;
    departmentId?: string | null;
    unitPrice: number;
    description?: string;
  }) => apiClient.post<ServiceDto>('/admin/services', payload),
  updateService: (id: string, payload: Partial<ServiceDto>) =>
    apiClient.patch<ServiceDto>(`/admin/services/${id}`, payload),
  deleteService: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/services/${id}`),
  exportCsvReport: (type: 'appointments' | 'revenue' | 'beds' | 'patients', params?: { from?: string; to?: string }) =>
    apiClient.downloadCsv('/admin/reports/export', `antam-${type}-report.csv`, {
      type,
      from: params?.from,
      to: params?.to,
    }),
};
