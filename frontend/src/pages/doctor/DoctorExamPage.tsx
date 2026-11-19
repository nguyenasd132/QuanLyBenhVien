import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  HeartPulse,
  History,
  Pill,
  Plus,
  Save,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import { doctorApi, publicApi } from '@/lib/api';
import {
  formatCurrencyVND,
  formatDateVN,
  formatQueueNumber,
  getSessionShortLabel,
  getTodayISODate,
} from '@/lib/format';
import type {
  AllergyWarningDto,
  AppointmentDto,
  DoctorDto,
  InvoiceDto,
  LabOrderItem,
  MedicalRecordDto,
  MedicineDto,
  PatientSummaryDto,
  ScheduleAvailabilityDto,
  ServiceDto,
  SessionType,
} from '@/types';
import {
  Alert,
  AppointmentStatusBadge,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

interface RxDraftItem {
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  quantity: number;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

const QUICK_ICD10 = [
  { code: 'J02.9', label: 'Viêm họng cấp' },
  { code: 'J06.9', label: 'Nhiễm khuẩn hô hấp trên' },
  { code: 'I10', label: 'Tăng huyết áp vô căn' },
  { code: 'E11.9', label: 'Đái tháo đường type 2' },
  { code: 'K29.7', label: 'Viêm dạ dày' },
  { code: 'R51', label: 'Đau đầu' },
  { code: 'L20.9', label: 'Viêm da cơ địa' },
];

export const DoctorExamPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const queueDateParam = searchParams.get('date') || getTodayISODate();
  const navStateApt = (location.state as { appointment?: AppointmentDto } | null)?.appointment || null;

  const [loading, setLoading] = useState<boolean>(true);
  const [queueAppointments, setQueueAppointments] = useState<AppointmentDto[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [patient, setPatient] = useState<PatientSummaryDto | null>(null);
  const [pastRecords, setPastRecords] = useState<MedicalRecordDto[]>([]);

  const [servicesCatalog, setServicesCatalog] = useState<ServiceDto[]>([]);
  const [medicinesCatalog, setMedicinesCatalog] = useState<MedicineDto[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorDto[]>([]);

  // Examination form state
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [icdCode, setIcdCode] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [treatmentPlan, setTreatmentPlan] = useState<string>('');
  const [examFindings, setExamFindings] = useState<string>('');
  const [imagingNotes, setImagingNotes] = useState<string>('');

  // Lab orders
  const [labOrders, setLabOrders] = useState<LabOrderItem[]>([]);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('');

  // Prescription builder
  const [rxNotes, setRxNotes] = useState<string>('');
  const [rxItems, setRxItems] = useState<RxDraftItem[]>([]);
  const [medSearch, setMedSearch] = useState<string>('');
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarningDto[]>([]);
  const [checkingAllergy, setCheckingAllergy] = useState<boolean>(false);

  // Result feedback
  const [createdInvoices, setCreatedInvoices] = useState<InvoiceDto[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);

  // Follow-up modal
  const [followUpOpen, setFollowUpOpen] = useState<boolean>(false);
  const [fuDoctorId, setFuDoctorId] = useState<string>('');
  const [fuDate, setFuDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [fuSession, setFuSession] = useState<SessionType>('MORNING');
  const [fuComplaint, setFuComplaint] = useState<string>('Tái khám theo hẹn bác sĩ');
  const [fuAvailability, setFuAvailability] = useState<ScheduleAvailabilityDto[]>([]);
  const [fuSubmitting, setFuSubmitting] = useState<boolean>(false);
  const [fuIssued, setFuIssued] = useState<AppointmentDto | null>(null);

  const populateFromRecord = useCallback((rec: MedicalRecordDto) => {
    setExistingRecordId(rec.id);
    setRecordStatus(rec.status);
    setSymptoms(rec.symptoms || '');
    setDiagnosis(rec.diagnosis || '');
    setIcdCode(rec.icdCode || '');
    setClinicalNotes(rec.clinicalNotes || '');
    setTreatmentPlan(rec.treatmentPlan || '');
    setExamFindings(rec.specialtyResults?.examFindings || '');
    setImagingNotes(rec.specialtyResults?.imagingNotes || '');
    setLabOrders(rec.specialtyResults?.labOrders || []);
    if (rec.prescription) {
      setRxNotes(rec.prescription.notes || '');
      setRxItems(
        rec.prescription.items.map((it) => ({
          medicineId: it.medicineId,
          medicineCode: it.medicineCode,
          medicineName: it.medicineName,
          unit: it.unit,
          unitPrice: Number(it.unitPrice),
          stockQuantity: 999,
          quantity: it.quantity,
          dosage: it.dosage,
          frequency: it.frequency || 'Sáng - Tối',
          durationDays: it.durationDays || 5,
          instructions: it.instructions || 'Uống sau ăn',
        }))
      );
      setAllergyWarnings(rec.prescription.allergyWarnings || []);
    } else {
      setRxNotes('');
      setRxItems([]);
    }
  }, []);

  const resetFormForAppointment = useCallback((apt: AppointmentDto) => {
    setExistingRecordId(null);
    setRecordStatus(null);
    setSymptoms(apt.chiefComplaint || '');
    setDiagnosis('');
    setIcdCode('');
    setClinicalNotes('');
    setTreatmentPlan('');
    setExamFindings('');
    setImagingNotes('');
    setLabOrders([]);
    setRxNotes('');
    setRxItems([]);
    setAllergyWarnings([]);
    setCreatedInvoices([]);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, servicesRes, medsRes, docsRes] = await Promise.all([
        doctorApi.getQueue({ date: queueDateParam }),
        publicApi.getServices(),
        publicApi.getMedicines(),
        publicApi.getDoctors(),
      ]);
      const allApts = [
        ...(queueRes.morning.appointments || []),
        ...(queueRes.afternoon.appointments || []),
      ].sort((a, b) => a.queueNumber - b.queueNumber);

      setQueueAppointments(allApts);
      setServicesCatalog(servicesRes.filter((s) => s.isActive));
      setMedicinesCatalog(medsRes.filter((m) => m.isActive));
      setDoctorsList(docsRes);
      if (user?.doctorProfile?.id) {
        setFuDoctorId(user.doctorProfile.id);
      } else if (docsRes.length > 0) {
        setFuDoctorId(docsRes[0].id);
      }

      let targetApt: AppointmentDto | null = null;
      if (appointmentId) {
        targetApt =
          allApts.find((a) => a.id === appointmentId) ||
          (navStateApt && navStateApt.id === appointmentId ? navStateApt : null);
      } else {
        targetApt =
          queueRes.morning.currentServing ||
          queueRes.afternoon.currentServing ||
          allApts.find((a) => a.status === 'IN_PROGRESS') ||
          allApts.find((a) => a.status === 'CHECKED_IN') ||
          allApts[0] ||
          null;
      }

      if (targetApt) {
        setSelectedAppointment(targetApt);
        const history = await doctorApi.getPatientHistory(targetApt.patientId);
        const historyRecords =
          (history as { records?: MedicalRecordDto[]; medicalRecords?: MedicalRecordDto[] })
            .medicalRecords ??
          history.records ??
          [];
        setPatient(history.patient);
        setPastRecords(historyRecords);
        const matchedApt =
          history.appointments.find((a) => a.id === targetApt!.id) || targetApt;
        setSelectedAppointment(matchedApt);

        const existingRec = historyRecords.find((r) => r.appointmentId === targetApt!.id);
        if (existingRec) {
          populateFromRecord(existingRec);
        } else {
          resetFormForAppointment(matchedApt);
        }
      } else if (appointmentId) {
        setSelectedAppointment(null);
      }
    } catch (err) {
      toast.error(
        'Không thể tải không gian khám bệnh',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [
    appointmentId,
    navStateApt,
    populateFromRecord,
    queueDateParam,
    resetFormForAppointment,
    toast,
    user?.doctorProfile?.id,
  ]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  // Real-time allergy check when prescription items change
  useEffect(() => {
    if (!patient || rxItems.length === 0) {
      setAllergyWarnings([]);
      return;
    }
    let cancelled = false;
    const runCheck = async () => {
      setCheckingAllergy(true);
      try {
        const res = await doctorApi.checkAllergies({
          patientId: patient.id,
          medicineIds: rxItems.map((i) => i.medicineId),
        });
        if (!cancelled) {
          setAllergyWarnings(res.warnings || []);
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) setCheckingAllergy(false);
      }
    };
    void runCheck();
    return () => {
      cancelled = true;
    };
  }, [patient, rxItems]);

  // Load availability inside follow-up modal
  useEffect(() => {
    if (!followUpOpen || !fuDoctorId || !fuDate) return;
    let cancelled = false;
    const fetchAvail = async () => {
      try {
        const res = await publicApi.getAvailability({
          doctorId: fuDoctorId,
          date: fuDate,
          session: fuSession,
        });
        if (!cancelled) setFuAvailability(res);
      } catch {
        if (!cancelled) setFuAvailability([]);
      }
    };
    void fetchAvail();
    return () => {
      cancelled = true;
    };
  }, [followUpOpen, fuDoctorId, fuDate, fuSession]);

  const filteredMedicines = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return medicinesCatalog.slice(0, 12);
    return medicinesCatalog
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.genericName || '').toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q)
      )
      .slice(0, 16);
  }, [medicinesCatalog, medSearch]);

  const rxTotalAmount = useMemo(
    () => rxItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [rxItems]
  );

  const labTotalAmount = useMemo(() => {
    return labOrders.reduce((sum, order) => {
      const svc = servicesCatalog.find((s) => s.id === order.serviceId);
      return sum + (svc ? Number(svc.unitPrice) : 0);
    }, 0);
  }, [labOrders, servicesCatalog]);

  const handleAddLabOrder = () => {
    if (!selectedServiceToAdd) return;
    const svc = servicesCatalog.find((s) => s.id === selectedServiceToAdd);
    if (!svc) return;
    if (labOrders.some((o) => o.serviceId === svc.id)) {
      toast.info('Dịch vụ này đã có trong danh sách chỉ định');
      return;
    }
    setLabOrders((prev) => [
      ...prev,
      {
        serviceId: svc.id,
        testName: svc.name,
        category: svc.category,
        status: 'ORDERED',
        result: '',
        normalRange: '',
        unit: '',
        notes: '',
      },
    ]);
    setSelectedServiceToAdd('');
  };

  const handleAddMedicine = (med: MedicineDto) => {
    setRxItems((prev) => {
      const existing = prev.find((i) => i.medicineId === med.id);
      if (existing) {
        return prev.map((i) =>
          i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          medicineCode: med.code,
          medicineName: med.name,
          unit: med.unit,
          unitPrice: Number(med.unitPrice),
          stockQuantity: med.stockQuantity,
          quantity: 10,
          dosage: '1 viên x 2 lần/ngày',
          frequency: 'Sáng - Tối',
          durationDays: 5,
          instructions: 'Uống sau khi ăn',
        },
      ];
    });
  };

  const handleSaveOrPublish = async (publish: boolean) => {
    if (!selectedAppointment) return;
    if (!diagnosis.trim()) {
      toast.warning('Thiếu chẩn đoán', 'Vui lòng nhập chẩn đoán bệnh trước khi lưu.');
      return;
    }
    if (publish) setPublishing(true);
    else setSaving(true);

    try {
      const orderedServiceIds = labOrders
        .map((o) => o.serviceId)
        .filter((id): id is string => Boolean(id));

      const payload = {
        appointmentId: selectedAppointment.id,
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim(),
        icdCode: icdCode.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
        specialtyResults: {
          examFindings: examFindings.trim() || undefined,
          imagingNotes: imagingNotes.trim() || undefined,
          labOrders,
        },
        orderedServiceIds,
        prescription:
          rxItems.length > 0
            ? {
                notes: rxNotes.trim() || undefined,
                items: rxItems.map((i) => ({
                  medicineId: i.medicineId,
                  quantity: Math.max(1, Number(i.quantity)),
                  dosage: i.dosage.trim() || 'Theo chỉ định',
                  frequency: i.frequency.trim() || undefined,
                  durationDays: Number(i.durationDays) || undefined,
                  instructions: i.instructions.trim() || undefined,
                })),
              }
            : existingRecordId
              ? { items: [] }
              : undefined,
        publish,
      };

      const res = existingRecordId
        ? await doctorApi.updateRecord(existingRecordId, payload)
        : await doctorApi.createRecord(payload);

      setExistingRecordId(res.medicalRecord.id);
      setRecordStatus(res.medicalRecord.status);
      setCreatedInvoices(res.invoices || []);
      if (res.allergyWarnings) {
        setAllergyWarnings(res.allergyWarnings);
      }

      toast.success(
        publish ? 'Đã công bố kết quả khám & gửi thông báo' : 'Đã lưu nháp hồ sơ bệnh án',
        publish
          ? `Tự động tạo ${res.invoices?.length || 0} hóa đơn thanh toán cho bệnh nhân.`
          : 'Bạn có thể tiếp tục cập nhật hoặc công bố sau.'
      );
      await loadWorkspace();
    } catch (err) {
      toast.error(
        'Lưu hồ sơ khám thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const handleBookFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setFuSubmitting(true);
    try {
      const created = await doctorApi.bookFollowUp({
        patientId: patient.id,
        date: fuDate,
        session: fuSession,
        doctorId: fuDoctorId || undefined,
        chiefComplaint: fuComplaint.trim() || undefined,
      });
      setFuIssued(created);
      toast.success(
        `Đã cấp lịch tái khám ${formatQueueNumber(created.queueNumber)}`,
        `${formatDateVN(created.appointmentDate)} • ${getSessionShortLabel(created.session)}`
      );
    } catch (err) {
      toast.error(
        'Đặt lịch tái khám thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setFuSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner label="Đang tải hồ sơ khám bệnh..." />;
  }

  if (!selectedAppointment || !patient) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/doctor')}
        >
          Quay lại hàng đợi
        </Button>
        <EmptyState
          icon={<Stethoscope className="h-7 w-7" />}
          title="Chưa chọn lượt khám"
          description="Vui lòng chọn một bệnh nhân từ hàng đợi để bắt đầu khám lâm sàng và kê đơn."
          action={
            <Button variant="primary" onClick={() => navigate('/doctor')}>
              Mở hàng đợi khám
            </Button>
          }
        />
      </div>
    );
  }

  const vitals = selectedAppointment.nursingProcedure?.vitals;
  const checklist = selectedAppointment.nursingProcedure?.checklistData;

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#C7D6EA] shadow-card">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/doctor')}
          >
            Hàng đợi
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#1D5BB8] text-white text-xs font-extrabold">
                {formatQueueNumber(selectedAppointment.queueNumber)}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {patient.fullName}
              </h2>
              <span className="text-xs font-mono text-slate-600">({patient.patientCode})</span>
              <AppointmentStatusBadge status={selectedAppointment.status} />
              {recordStatus && (
                <Badge variant={recordStatus === 'PUBLISHED' ? 'emerald' : 'amber'} size="sm">
                  {recordStatus === 'PUBLISHED' ? 'Đã công bố kết quả' : 'Bản nháp'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Mã hẹn: {selectedAppointment.appointmentCode} •{' '}
              {formatDateVN(selectedAppointment.appointmentDate)} •{' '}
              {getSessionShortLabel(selectedAppointment.session)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {queueAppointments.length > 1 && (
            <select
              value={selectedAppointment.id}
              onChange={(e) =>
                navigate(`/doctor/exam/${e.target.value}?date=${queueDateParam}`)
              }
              className="h-9 px-3 rounded-xl border border-[#9FB5D0] hover:border-[#7B99BE] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1D5BB8]"
            >
              {queueAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {formatQueueNumber(a.queueNumber)} - {a.patientName} ({a.status})
                </option>
              ))}
            </select>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => {
              setFuIssued(null);
              setFollowUpOpen(true);
            }}
          >
            Hẹn tái khám / Chuyển khoa
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={() => void handleSaveOrPublish(false)}
          >
            Lưu nháp
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Send className="h-4 w-4" />}
            loading={publishing}
            onClick={() => void handleSaveOrPublish(true)}
          >
            Công bố & Gửi kết quả
          </Button>
        </div>
      </div>

      {/* Allergy Banner (Always visible at top if patient has allergies) */}
      {patient.allergies && patient.allergies.length > 0 && (
        <Alert variant="error" title="Cảnh báo Tiền sử Dị ứng của Bệnh nhân">
          <div className="flex flex-wrap gap-2 mt-1">
            {patient.allergies.map((al, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 text-xs font-bold"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-800" />
                {al.name}
                {al.severity ? ` (${al.severity})` : ''}
                {al.reaction ? ` — ${al.reaction}` : ''}
              </span>
            ))}
          </div>
        </Alert>
      )}

      {/* Real-time Drug Allergy Warning Alert */}
      {allergyWarnings.length > 0 && (
        <Alert
          variant="error"
          title={`CẢNH BÁO TƯƠNG TÁC / DỊ ỨNG THUỐC (${allergyWarnings.length})`}
        >
          <ul className="space-y-1 mt-1 list-disc list-inside text-xs">
            {allergyWarnings.map((w) => (
              <li key={w.medicineId}>
                <strong>{w.medicineName}</strong> [{w.severity}]: {w.message}
                {w.matchedAllergens.length > 0 && (
                  <span className="ml-1 font-semibold">
                    (Dị nguyên khớp: {w.matchedAllergens.join(', ')})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Created invoices confirmation */}
      {createdInvoices.length > 0 && (
        <Alert variant="success" title="Đã đồng bộ hóa đơn thanh toán">
          <div className="flex flex-wrap gap-3 mt-1 text-xs">
            {createdInvoices.map((inv) => (
              <span key={inv.id} className="font-semibold">
                {inv.invoiceCode} ({inv.invoiceType === 'HOSPITAL_FEE' ? 'Viện phí' : 'Đơn thuốc'}):{' '}
                {formatCurrencyVND(inv.totalAmount)}
              </span>
            ))}
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Patient Profile, Vitals, History */}
        <div className="xl:col-span-4 space-y-5">
          {/* Patient Info Card */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm">Thông tin Bệnh nhân</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-600 text-xs block">Ngày sinh</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateVN(patient.dateOfBirth)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 text-xs block">Giới tính / Nhóm máu</span>
                  <span className="font-semibold text-slate-800">
                    {patient.gender === 'MALE'
                      ? 'Nam'
                      : patient.gender === 'FEMALE'
                        ? 'Nữ'
                        : 'Khác'}{' '}
                    • {patient.bloodType || 'Chưa rõ'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 text-xs block">Số điện thoại</span>
                  <span className="font-semibold text-slate-800">{patient.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 text-xs block">Số thẻ BHYT</span>
                  <span className="font-semibold text-slate-800">
                    {patient.insuranceNumber || 'Không có'}
                  </span>
                </div>
              </div>
              {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                <div className="pt-2 border-t border-[#C7D6EA]">
                  <span className="text-xs font-bold text-slate-600 block mb-1">
                    Bệnh nền mạn tính:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronicConditions.map((c, idx) => (
                      <Badge key={idx} variant="amber" size="sm">
                        {c.name}
                        {c.diagnosedYear ? ` (${c.diagnosedYear})` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vitals from Nurse */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm">Sinh hiệu Điều dưỡng đo</CardTitle>
              </div>
              {selectedAppointment.nursingProcedure && (
                <Badge variant="emerald" size="sm">
                  Đã tiếp nhận
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {!vitals ? (
                <p className="text-xs text-slate-600">
                  Điều dưỡng chưa cập nhật chỉ số sinh hiệu cho lượt khám này.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Huyết áp</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {vitals.bloodPressureSystolic ?? '--'}/
                        {vitals.bloodPressureDiastolic ?? '--'} mmHg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Nhịp tim</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {vitals.heartRate ?? '--'} bpm
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Nhiệt độ</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {vitals.temperature ?? '--'} °C
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">SpO2</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {vitals.spo2 ?? '--'} %
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Chiều cao / Cân nặng</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {vitals.heightCm ?? '--'} cm / {vitals.weightKg ?? '--'} kg
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                      <span className="text-slate-600 block">BMI</span>
                      <span className="text-sm font-extrabold text-[#1D5BB8]">
                        {vitals.bmi ?? '--'}
                      </span>
                    </div>
                  </div>
                  {checklist && (
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      {checklist.bhytVerified && (
                        <Badge variant="blue" size="sm">
                          Đã kiểm BHYT
                        </Badge>
                      )}
                      {checklist.allergyScreened && (
                        <Badge variant="emerald" size="sm">
                          Đã sàng lọc dị ứng
                        </Badge>
                      )}
                    </div>
                  )}
                  {selectedAppointment.nursingProcedure?.triageNotes && (
                    <p className="text-xs text-slate-600 bg-amber-50/70 border border-amber-300 rounded-xl p-2.5">
                      <strong>Ghi chú điều dưỡng:</strong>{' '}
                      {selectedAppointment.nursingProcedure.triageNotes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Medical History */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm">Lịch sử Khám bệnh ({pastRecords.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
              {pastRecords.length === 0 ? (
                <p className="text-xs text-slate-600">Bệnh nhân chưa có hồ sơ khám trước đây.</p>
              ) : (
                pastRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1D5BB8]">
                        {formatDateVN(rec.appointmentDate)} • {rec.departmentName}
                      </span>
                      {rec.icdCode && (
                        <Badge variant="slate" size="sm">
                          {rec.icdCode}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900">{rec.diagnosis}</p>
                    <p className="text-[11px] text-slate-600">BS. {rec.doctorName}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Exam Form, Labs, Prescription */}
        <div className="xl:col-span-8 space-y-5">
          {/* Clinical Examination */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm sm:text-base">Khám lâm sàng & Chẩn đoán</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Triệu chứng cơ năng"
                  placeholder="Mô tả triệu chứng bệnh nhân khai báo..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
                <Textarea
                  label="Kết quả khám thực thể (Specialty Exam Findings)"
                  placeholder="Tim đều, phổi trong, họng đỏ..."
                  value={examFindings}
                  onChange={(e) => setExamFindings(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Chẩn đoán xác định"
                    required
                    placeholder="Ví dụ: Viêm họng cấp, Tăng huyết áp..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>
                <Input
                  label="Mã ICD-10"
                  placeholder="VD: J02.9"
                  value={icdCode}
                  onChange={(e) => setIcdCode(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 mr-1">
                  Gợi ý nhanh ICD-10:
                </span>
                {QUICK_ICD10.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setIcdCode(item.code);
                      if (!diagnosis.trim()) setDiagnosis(item.label);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#EDF3FB] hover:bg-[#DCEAFB] border border-[#C7D6EA] text-[11px] font-semibold text-slate-700 hover:text-[#1D5BB8] transition-colors"
                  >
                    {item.code} • {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Ghi chú lâm sàng & Chẩn đoán hình ảnh"
                  placeholder="Ghi nhận thêm về siêu âm, X-quang hoặc theo dõi..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
                <Textarea
                  label="Hướng điều trị & Lời dặn"
                  placeholder="Uống thuốc đủ liều, tái khám sau 5 ngày hoặc khi sốt cao..."
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lab Tests & Services */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm sm:text-base">
                  Chỉ định Cận lâm sàng & Dịch vụ
                </CardTitle>
              </div>
              {labTotalAmount > 0 && (
                <Badge variant="blue">Phí DV: {formatCurrencyVND(labTotalAmount)}</Badge>
              )}
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <Select
                    value={selectedServiceToAdd}
                    onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                  >
                    <option value="">-- Chọn xét nghiệm / dịch vụ cận lâm sàng --</option>
                    {servicesCatalog
                      .filter((s) => s.category !== 'CONSULTATION')
                      .map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          [{svc.code}] {svc.name} — {formatCurrencyVND(svc.unitPrice)}
                        </option>
                      ))}
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleAddLabOrder}
                  disabled={!selectedServiceToAdd}
                >
                  Thêm chỉ định
                </Button>
              </div>

              {labOrders.length === 0 ? (
                <p className="text-xs text-slate-600">
                  Chưa có chỉ định xét nghiệm / chẩn đoán hình ảnh.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {labOrders.map((order, idx) => (
                    <div
                      key={`${order.serviceId || order.testName}-${idx}`}
                      className="p-3.5 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-[#1D5BB8]" />
                          <span className="text-sm font-bold text-slate-900">{order.testName}</span>
                          <Badge
                            variant={order.status === 'COMPLETED' ? 'emerald' : 'amber'}
                            size="sm"
                          >
                            {order.status === 'COMPLETED' ? 'Đã có kết quả' : 'Đã chỉ định'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              setLabOrders((prev) =>
                                prev.map((it, i) =>
                                  i === idx
                                    ? { ...it, status: e.target.value as 'ORDERED' | 'COMPLETED' }
                                    : it
                                )
                              )
                            }
                            className="h-8 px-2 rounded-lg border border-[#9FB5D0] hover:border-[#7B99BE] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1D5BB8]"
                          >
                            <option value="ORDERED">Đã chỉ định</option>
                            <option value="COMPLETED">Có kết quả</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setLabOrders((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          placeholder="Kết quả (VD: 6.2)"
                          value={order.result || ''}
                          onChange={(e) =>
                            setLabOrders((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, result: e.target.value } : it
                              )
                            )
                          }
                        />
                        <Input
                          placeholder="Khoảng bình thường"
                          value={order.normalRange || ''}
                          onChange={(e) =>
                            setLabOrders((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, normalRange: e.target.value } : it
                              )
                            )
                          }
                        />
                        <Input
                          placeholder="Đơn vị / Ghi chú"
                          value={order.notes || ''}
                          onChange={(e) =>
                            setLabOrders((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, notes: e.target.value } : it
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Input
                label="Kết luận hình ảnh (X-Quang / Siêu âm)"
                placeholder="Ghi chú tóm tắt chẩn đoán hình ảnh (nếu có)..."
                value={imagingNotes}
                onChange={(e) => setImagingNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Prescription Builder */}
          <Card>
            <CardHeader className="py-3.5">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-[#1D5BB8]" />
                <CardTitle className="text-sm sm:text-base">
                  Kê đơn thuốc & Kiểm tra Dị ứng Tự động
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {checkingAllergy && (
                  <span className="text-xs text-slate-600">Đang kiểm tra dị ứng...</span>
                )}
                <Badge variant="blue">Tổng đơn thuốc: {formatCurrencyVND(rxTotalAmount)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Medicine Search Picker */}
              <div className="space-y-2">
                <Input
                  placeholder="Tìm thuốc theo tên thương mại, hoạt chất hoặc mã thuốc..."
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  leftIcon={<Search className="h-4 w-4" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin p-1">
                  {filteredMedicines.map((med) => {
                    const outOfStock = med.stockQuantity <= 0;
                    const hasAllergenMeta =
                      (med.contraindications?.allergens?.length || 0) > 0 ||
                      (med.contraindications?.conditions?.length || 0) > 0;
                    return (
                      <button
                        key={med.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() => handleAddMedicine(med)}
                        className="text-left p-2.5 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] hover:bg-[#DCEAFB] hover:border-[#9EC0EC] transition-all disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 line-clamp-1">
                            {med.name}
                          </span>
                          <Plus className="h-3.5 w-3.5 text-[#1D5BB8] shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          {med.genericName || med.code} • {med.dosageForm || med.unit}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-bold text-[#1D5BB8]">
                            {formatCurrencyVND(med.unitPrice)}/{med.unit}
                          </span>
                          <span
                            className={
                              outOfStock ? 'text-rose-800 font-bold' : 'text-slate-600'
                            }
                          >
                            Kho: {med.stockQuantity}
                          </span>
                        </div>
                        {hasAllergenMeta && (
                          <p className="text-[10px] text-amber-800 mt-0.5 truncate">
                            Lưu ý: {med.contraindications.allergens?.join(', ')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Added Rx Items */}
              {rxItems.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#9EC0EC] rounded-xl bg-[#EDF3FB]">
                  <p className="text-xs text-slate-600">
                    Chọn thuốc từ danh mục phía trên để thêm vào đơn thuốc.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rxItems.map((item) => {
                    const hasWarn = allergyWarnings.find(
                      (w) => w.medicineId === item.medicineId
                    );
                    return (
                      <div
                        key={item.medicineId}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          hasWarn
                            ? 'bg-rose-50/70 border-rose-300'
                            : 'bg-white border-[#C7D6EA]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {item.medicineName}
                            </span>
                            <span className="text-xs text-slate-600">
                              ({formatCurrencyVND(item.unitPrice)}/{item.unit})
                            </span>
                            {hasWarn && (
                              <Badge variant="rose" size="sm">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Cảnh báo dị ứng
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm font-extrabold text-[#1D5BB8]">
                              {formatCurrencyVND(item.quantity * item.unitPrice)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRxItems((prev) =>
                                  prev.filter((i) => i.medicineId !== item.medicineId)
                                )
                              }
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <Input
                            label={`Số lượng (${item.unit})`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              setRxItems((prev) =>
                                prev.map((i) =>
                                  i.medicineId === item.medicineId
                                    ? { ...i, quantity: Math.max(1, Number(e.target.value)) }
                                    : i
                                )
                              )
                            }
                          />
                          <Input
                            label="Liều dùng"
                            value={item.dosage}
                            onChange={(e) =>
                              setRxItems((prev) =>
                                prev.map((i) =>
                                  i.medicineId === item.medicineId
                                    ? { ...i, dosage: e.target.value }
                                    : i
                                )
                              )
                            }
                          />
                          <Input
                            label="Số ngày"
                            type="number"
                            min={1}
                            value={item.durationDays}
                            onChange={(e) =>
                              setRxItems((prev) =>
                                prev.map((i) =>
                                  i.medicineId === item.medicineId
                                    ? { ...i, durationDays: Math.max(1, Number(e.target.value)) }
                                    : i
                                )
                              )
                            }
                          />
                          <Input
                            label="Cách dùng"
                            value={item.instructions}
                            onChange={(e) =>
                              setRxItems((prev) =>
                                prev.map((i) =>
                                  i.medicineId === item.medicineId
                                    ? { ...i, instructions: e.target.value }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Textarea
                label="Lời dặn đơn thuốc"
                placeholder="Ghi chú thêm cho bệnh nhân khi dùng thuốc..."
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
              />

              {/* Footer Save / Publish */}
              <div className="pt-3 border-t border-[#C7D6EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-slate-600">
                  Tổng tiền thuốc dự kiến:{' '}
                  <strong className="text-[#1D5BB8] text-base">
                    {formatCurrencyVND(rxTotalAmount)}
                  </strong>
                  {labTotalAmount > 0 && (
                    <span className="ml-2 text-slate-600">
                      (+ {formatCurrencyVND(labTotalAmount)} dịch vụ CLS)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    leftIcon={<Save className="h-4 w-4" />}
                    loading={saving}
                    onClick={() => void handleSaveOrPublish(false)}
                  >
                    Lưu nháp
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<FileCheck2 className="h-4 w-4" />}
                    loading={publishing}
                    onClick={() => void handleSaveOrPublish(true)}
                  >
                    Công bố kết quả & Tạo hóa đơn
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up / Referral Modal */}
      <Modal
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Đặt lịch Tái khám / Chuyển chuyên khoa"
        description={`Bệnh nhân: ${patient.fullName} (${patient.patientCode})`}
      >
        {fuIssued ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-700 mx-auto" />
              <p className="text-sm font-bold text-emerald-900">
                Đã đặt lịch tái khám & cấp Số thứ tự thành công!
              </p>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-emerald-300">
                <span className="text-2xl font-extrabold text-[#1D5BB8]">
                  {formatQueueNumber(fuIssued.queueNumber)}
                </span>
                <div className="text-left text-xs text-slate-600">
                  <p className="font-bold text-slate-900">{fuIssued.doctorName}</p>
                  <p>
                    {formatDateVN(fuIssued.appointmentDate)} •{' '}
                    {getSessionShortLabel(fuIssued.session)} ({fuIssued.estimatedTime})
                  </p>
                  <p>Mã hẹn: {fuIssued.appointmentCode}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setFollowUpOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBookFollowUp} className="space-y-4">
            <Select
              label="Bác sĩ khám / Chuyển khoa"
              value={fuDoctorId}
              onChange={(e) => setFuDoctorId(e.target.value)}
            >
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title ? `${doc.title} ` : ''}
                  {doc.fullName} — {doc.department.name}
                  {doc.room ? ` (${doc.room.name})` : ''}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ngày hẹn tái khám"
                type="date"
                min={getTodayISODate()}
                value={fuDate}
                onChange={(e) => setFuDate(e.target.value)}
                required
              />
              <Select
                label="Buổi khám"
                value={fuSession}
                onChange={(e) => setFuSession(e.target.value as SessionType)}
                options={[
                  { value: 'MORNING', label: 'Buổi Sáng (07:30 - 11:30)' },
                  { value: 'AFTERNOON', label: 'Buổi Chiều (13:30 - 17:00)' },
                ]}
              />
            </div>

            {fuAvailability.length > 0 ? (
              <div className="p-3 rounded-xl bg-[#DCEAFB] border border-[#9EC0EC] text-xs text-[#15458E]">
                Còn <strong>{fuAvailability[0].remainingSlots}</strong>/{fuAvailability[0].maxPatients}{' '}
                lượt • STT dự kiến tiếp theo:{' '}
                <strong>{formatQueueNumber(fuAvailability[0].nextQueueNumber)}</strong> (khoảng{' '}
                {fuAvailability[0].estimatedTime})
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-800">
                Lưu ý: Hệ thống sẽ tự động mở hoặc kiểm tra lịch của bác sĩ trong buổi đã chọn.
              </div>
            )}

            <Textarea
              label="Nội dung tái khám / Lý do chuyển khoa"
              value={fuComplaint}
              onChange={(e) => setFuComplaint(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFollowUpOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" loading={fuSubmitting}>
                Xác nhận đặt lịch & Cấp STT
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
