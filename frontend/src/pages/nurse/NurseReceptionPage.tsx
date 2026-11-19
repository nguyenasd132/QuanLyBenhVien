import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { apiClient, nurseApi, publicApi } from '@/lib/api';
import {
  formatDateVN,
  formatQueueNumber,
  getSessionShortLabel,
  getTodayISODate,
} from '@/lib/format';
import type {
  AppointmentDto,
  AppointmentStatus,
  ChecklistData,
  DoctorDto,
  Gender,
  PatientSummaryDto,
  SessionType,
  VitalsData,
} from '@/types';
import {
  AppointmentStatusBadge,
  Badge,
  BookingTypeBadge,
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
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

const DEFAULT_CHECKLIST_ITEMS = [
  'Đã đối chiếu CCCD / Giấy tờ tùy thân',
  'Đã kiểm tra thẻ BHYT / Quyền lợi bảo hiểm',
  'Đã sàng lọc tiền sử dị ứng & bệnh nền',
  'Đã hướng dẫn số thứ tự & phòng khám',
];

export const NurseReceptionPage: React.FC = () => {
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate());
  const [sessionFilter, setSessionFilter] = useState<'ALL' | SessionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Quick check-in by code or STT
  const [checkInCode, setCheckInCode] = useState<string>('');
  const [checkInStt, setCheckInStt] = useState<string>('');
  const [checkInDoctorId, setCheckInDoctorId] = useState<string>('');
  const [checkInSession, setCheckInSession] = useState<SessionType>('MORNING');
  const [checkingInLookup, setCheckingInLookup] = useState<boolean>(false);

  // Walk-in Modal
  const [walkInOpen, setWalkInOpen] = useState<boolean>(false);
  const [walkInMode, setWalkInMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientResults, setPatientResults] = useState<PatientSummaryDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newDob, setNewDob] = useState<string>('');
  const [newGender, setNewGender] = useState<Gender>('MALE');
  const [walkInDoctorId, setWalkInDoctorId] = useState<string>('');
  const [walkInDate, setWalkInDate] = useState<string>(getTodayISODate());
  const [walkInSession, setWalkInSession] = useState<SessionType>('MORNING');
  const [walkInPriority, setWalkInPriority] = useState<boolean>(false);
  const [walkInComplaint, setWalkInComplaint] = useState<string>('');
  const [walkInSubmitting, setWalkInSubmitting] = useState<boolean>(false);

  // Triage Vitals & Checklist Modal
  const [triageApt, setTriageApt] = useState<AppointmentDto | null>(null);
  const [vitals, setVitals] = useState<VitalsData>({
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 76,
    temperature: 36.8,
    spo2: 98,
    respiratoryRate: 18,
    heightCm: 165,
    weightKg: 60,
  });
  const [checklist, setChecklist] = useState<ChecklistData>({
    bhytVerified: true,
    identityVerified: true,
    allergyScreened: true,
    consentSigned: true,
    items: DEFAULT_CHECKLIST_ITEMS.map((label) => ({ label, checked: true })),
  });
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [savingTriage, setSavingTriage] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apts, docs] = await Promise.all([
        nurseApi.getAppointments({
          date: selectedDate,
          session: sessionFilter === 'ALL' ? undefined : sessionFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
        }),
        publicApi.getDoctors(),
      ]);
      setAppointments(apts);
      setDoctors(docs);
      if (docs.length > 0 && !checkInDoctorId) {
        setCheckInDoctorId(docs[0].id);
        setWalkInDoctorId(docs[0].id);
      }
    } catch (err) {
      toast.error(
        'Không thể tải danh sách tiếp nhận',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, sessionFilter, statusFilter, searchQuery, checkInDoctorId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Search existing patients inside walk-in modal
  useEffect(() => {
    if (!walkInOpen || walkInMode !== 'EXISTING') return;
    let cancelled = false;
    const fetchPatients = async () => {
      try {
        const res = await nurseApi.getPatients(patientSearch.trim() || undefined);
        if (!cancelled) {
          setPatientResults(res);
          if (res.length > 0 && !selectedPatientId) {
            setSelectedPatientId(res[0].id);
          }
        }
      } catch {
        // ignore
      }
    };
    void fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [walkInOpen, walkInMode, patientSearch, selectedPatientId]);

  const computedBmi = useMemo(() => {
    const h = Number(vitals.heightCm);
    const w = Number(vitals.weightKg);
    if (!h || !w || h <= 0) return undefined;
    const hm = h / 100;
    return Number((w / (hm * hm)).toFixed(1));
  }, [vitals.heightCm, vitals.weightKg]);

  const handleQuickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInCode.trim() && !checkInStt.trim()) {
      toast.warning('Nhập mã hẹn hoặc STT để check-in');
      return;
    }
    setCheckingInLookup(true);
    try {
      const updated = await nurseApi.checkInLookup(
        checkInCode.trim()
          ? { appointmentCode: checkInCode.trim() }
          : {
              queueNumber: Number(checkInStt),
              doctorId: checkInDoctorId,
              date: selectedDate,
              session: checkInSession,
            }
      );
      toast.success(
        `Đã check-in thành công ${formatQueueNumber(updated.queueNumber)}`,
        `Bệnh nhân ${updated.patientName} • ${updated.doctorName}`
      );
      setCheckInCode('');
      setCheckInStt('');
      await loadData();
    } catch (err) {
      toast.error(
        'Check-in thất bại',
        err instanceof Error ? err.message : 'Không tìm thấy lịch hẹn phù hợp'
      );
    } finally {
      setCheckingInLookup(false);
    }
  };

  const handleCheckInRow = async (apt: AppointmentDto) => {
    setBusyId(apt.id);
    try {
      await nurseApi.checkInById(apt.id);
      toast.success(
        `Đã check-in ${formatQueueNumber(apt.queueNumber)}`,
        `${apt.patientName} (${apt.patientCode})`
      );
      await loadData();
    } catch (err) {
      toast.error(
        'Không thể check-in',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (walkInMode === 'EXISTING' && !selectedPatientId) {
      toast.warning('Vui lòng chọn bệnh nhân');
      return;
    }
    if (walkInMode === 'NEW' && !newFullName.trim()) {
      toast.warning('Vui lòng nhập họ tên bệnh nhân');
      return;
    }
    setWalkInSubmitting(true);
    try {
      const created =
        walkInMode === 'EXISTING'
          ? await nurseApi.createWalkIn({
              patientId: selectedPatientId,
              doctorId: walkInDoctorId,
              date: walkInDate,
              session: walkInSession,
              isPriority: walkInPriority,
              chiefComplaint: walkInComplaint.trim() || undefined,
            })
          : await apiClient.post<AppointmentDto>('/nurse/appointments/walk-in', {
              newPatient: {
                fullName: newFullName.trim(),
                phone: newPhone.trim() || undefined,
                dateOfBirth: newDob || undefined,
                gender: newGender,
              },
              doctorId: walkInDoctorId,
              date: walkInDate,
              session: walkInSession,
              isPriority: walkInPriority,
              chiefComplaint: walkInComplaint.trim() || undefined,
              autoCheckIn: true,
            });
      toast.success(
        `Đã tiếp nhận Walk-in • Cấp STT ${formatQueueNumber(created.queueNumber)}`,
        `${created.patientName} • ${created.doctorName} (${created.estimatedTime})`
      );
      setWalkInOpen(false);
      setNewFullName('');
      setNewPhone('');
      setWalkInComplaint('');
      setWalkInPriority(false);
      await loadData();
    } catch (err) {
      toast.error(
        'Tiếp nhận Walk-in thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra lịch bác sĩ'
      );
    } finally {
      setWalkInSubmitting(false);
    }
  };

  const openTriageModal = (apt: AppointmentDto) => {
    setTriageApt(apt);
    if (apt.nursingProcedure) {
      setVitals({
        bloodPressureSystolic: apt.nursingProcedure.vitals.bloodPressureSystolic ?? 120,
        bloodPressureDiastolic: apt.nursingProcedure.vitals.bloodPressureDiastolic ?? 80,
        heartRate: apt.nursingProcedure.vitals.heartRate ?? 76,
        temperature: apt.nursingProcedure.vitals.temperature ?? 36.8,
        spo2: apt.nursingProcedure.vitals.spo2 ?? 98,
        respiratoryRate: apt.nursingProcedure.vitals.respiratoryRate ?? 18,
        heightCm: apt.nursingProcedure.vitals.heightCm ?? 165,
        weightKg: apt.nursingProcedure.vitals.weightKg ?? 60,
      });
      setChecklist({
        bhytVerified: apt.nursingProcedure.checklistData.bhytVerified ?? true,
        identityVerified: apt.nursingProcedure.checklistData.identityVerified ?? true,
        allergyScreened: apt.nursingProcedure.checklistData.allergyScreened ?? true,
        consentSigned: apt.nursingProcedure.checklistData.consentSigned ?? true,
        items:
          apt.nursingProcedure.checklistData.items &&
          apt.nursingProcedure.checklistData.items.length > 0
            ? apt.nursingProcedure.checklistData.items
            : DEFAULT_CHECKLIST_ITEMS.map((label) => ({ label, checked: true })),
      });
      setTriageNotes(apt.nursingProcedure.triageNotes || '');
    } else {
      setVitals({
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 76,
        temperature: 36.8,
        spo2: 98,
        respiratoryRate: 18,
        heightCm: 165,
        weightKg: 60,
      });
      setChecklist({
        bhytVerified: true,
        identityVerified: true,
        allergyScreened: true,
        consentSigned: true,
        items: DEFAULT_CHECKLIST_ITEMS.map((label) => ({ label, checked: true })),
      });
      setTriageNotes('');
    }
  };

  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageApt) return;
    setSavingTriage(true);
    try {
      await nurseApi.saveProcedure({
        appointmentId: triageApt.id,
        vitals: {
          ...vitals,
          bmi: computedBmi,
        },
        checklistData: checklist,
        triageNotes: triageNotes.trim() || undefined,
      });
      toast.success(
        'Đã lưu chỉ số sinh hiệu & thủ tục BHYT',
        `Bệnh nhân ${triageApt.patientName} (${formatQueueNumber(triageApt.queueNumber)})`
      );
      setTriageApt(null);
      await loadData();
    } catch (err) {
      toast.error(
        'Lưu sinh hiệu thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSavingTriage(false);
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return a.queueNumber - b.queueNumber;
    });
  }, [appointments]);

  const counts = useMemo(() => {
    return {
      total: appointments.length,
      booked: appointments.filter((a) => a.status === 'BOOKED').length,
      checkedIn: appointments.filter((a) => a.status === 'CHECKED_IN').length,
      triaged: appointments.filter((a) => a.hasNursingProcedure).length,
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tiếp nhận Bệnh nhân & Đo sinh hiệu
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Check-in lịch hẹn online, tiếp nhận bệnh nhân Walk-in (tự động cấp STT) và ghi nhận
            sinh hiệu ban đầu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-[#9FB5D0] hover:border-[#7B99BE] rounded-xl px-3 h-10">
            <Calendar className="h-4 w-4 text-[#1D5BB8]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadData()}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => {
              setWalkInDate(selectedDate);
              setWalkInOpen(true);
            }}
          >
            Đăng ký Walk-in
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-600">Tổng lượt ngày {formatDateVN(selectedDate)}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts.total}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-600">Chờ check-in</p>
          <p className="text-2xl font-extrabold text-[#1D5BB8] mt-1">{counts.booked}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-600">Đã check-in chờ khám</p>
          <p className="text-2xl font-extrabold text-amber-800 mt-1">{counts.checkedIn}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-600">Đã đo sinh hiệu</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{counts.triaged}</p>
        </Card>
      </div>

      {/* Quick Check-in by Appointment Code or STT */}
      <Card>
        <CardHeader className="py-3.5 bg-[#EDF3FB]">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[#1D5BB8]" />
            <CardTitle className="text-sm sm:text-base">
              Check-in nhanh bằng Mã hẹn hoặc Số thứ tự (STT)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form
            onSubmit={handleQuickCheckIn}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-4">
              <Input
                label="Mã lịch hẹn (ưu tiên nếu nhập)"
                placeholder="VD: LH-20261117-001"
                value={checkInCode}
                onChange={(e) => setCheckInCode(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Hoặc STT"
                type="number"
                min={1}
                placeholder="VD: 3"
                value={checkInStt}
                onChange={(e) => setCheckInStt(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Bác sĩ (khi tìm theo STT)"
                value={checkInDoctorId}
                onChange={(e) => setCheckInDoctorId(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.department.name})
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select
                label="Buổi"
                value={checkInSession}
                onChange={(e) => setCheckInSession(e.target.value as SessionType)}
                options={[
                  { value: 'MORNING', label: 'Buổi Sáng' },
                  { value: 'AFTERNOON', label: 'Buổi Chiều' },
                ]}
              />
            </div>
            <div className="md:col-span-1">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={checkingInLookup}
                leftIcon={<UserCheck className="h-4 w-4" />}
              >
                OK
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            activeId={sessionFilter}
            onChange={(id) => setSessionFilter(id as 'ALL' | SessionType)}
            items={[
              { id: 'ALL', label: 'Cả ngày' },
              { id: 'MORNING', label: 'Buổi Sáng' },
              { id: 'AFTERNOON', label: 'Buổi Chiều' },
            ]}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AppointmentStatus)}
            className="h-10 px-3 rounded-xl border border-[#9FB5D0] hover:border-[#7B99BE] bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1D5BB8]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="BOOKED">Đã đặt lịch</option>
            <option value="CHECKED_IN">Đã check-in</option>
            <option value="IN_PROGRESS">Đang khám</option>
            <option value="COMPLETED">Hoàn thành</option>
          </select>
        </div>

        <div className="w-full lg:w-72">
          <Input
            placeholder="Tìm bệnh nhân, mã hẹn, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <Spinner label="Đang tải danh sách tiếp nhận..." />
      ) : sortedAppointments.length === 0 ? (
        <EmptyState
          title="Chưa có lịch hẹn nào"
          description="Không tìm thấy lượt khám phù hợp bộ lọc hiện tại."
          action={
            <Button variant="primary" onClick={() => setWalkInOpen(true)}>
              Tiếp nhận Walk-in mới
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((apt) => (
            <Card key={apt.id} className="overflow-hidden">
              <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-12 w-12 rounded-xl bg-[#DCEAFB] text-[#1D5BB8] border border-[#9EC0EC] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold uppercase opacity-75">STT</span>
                    <span className="text-sm font-extrabold leading-none">
                      {formatQueueNumber(apt.queueNumber)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {apt.patientName}
                      </span>
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {apt.patientCode}
                      </span>
                      <AppointmentStatusBadge status={apt.status} />
                      <BookingTypeBadge type={apt.bookingType} />
                      {apt.isPriority && (
                        <Badge variant="rose" size="sm">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Ưu tiên
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                      <span>Mã hẹn: {apt.appointmentCode}</span>
                      <span>
                        {apt.doctorName} ({apt.departmentName}
                        {apt.roomName ? ` • ${apt.roomName}` : ''})
                      </span>
                      <span>
                        {getSessionShortLabel(apt.session)} • {apt.estimatedTime}
                      </span>
                      {apt.patientPhone && <span>SĐT: {apt.patientPhone}</span>}
                    </div>

                    {apt.nursingProcedure && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] bg-emerald-50/70 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl">
                        <HeartPulse className="h-3.5 w-3.5 text-emerald-700" />
                        <span>
                          HA: {apt.nursingProcedure.vitals.bloodPressureSystolic ?? '--'}/
                          {apt.nursingProcedure.vitals.bloodPressureDiastolic ?? '--'} mmHg • Mạch:{' '}
                          {apt.nursingProcedure.vitals.heartRate ?? '--'} bpm • Nhiệt độ:{' '}
                          {apt.nursingProcedure.vitals.temperature ?? '--'}°C • SpO2:{' '}
                          {apt.nursingProcedure.vitals.spo2 ?? '--'}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
                  {apt.status === 'BOOKED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<UserCheck className="h-4 w-4" />}
                      loading={busyId === apt.id}
                      onClick={() => void handleCheckInRow(apt)}
                    >
                      Check-in
                    </Button>
                  )}
                  <Button
                    variant={apt.hasNursingProcedure ? 'outline' : 'secondary'}
                    size="sm"
                    leftIcon={<Activity className="h-4 w-4" />}
                    onClick={() => openTriageModal(apt)}
                  >
                    {apt.hasNursingProcedure ? 'Sửa sinh hiệu' : 'Đo sinh hiệu & BHYT'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Walk-in Registration Modal */}
      <Modal
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        size="lg"
        title="Đăng ký Bệnh nhân Khám tại quầy (Walk-in)"
        description="Hệ thống tự động cấp Số thứ tự (STT) tiếp theo trong buổi khám."
      >
        <form onSubmit={handleCreateWalkIn} className="space-y-4">
          <Tabs
            activeId={walkInMode}
            onChange={(id) => setWalkInMode(id as 'EXISTING' | 'NEW')}
            items={[
              { id: 'EXISTING', label: 'Bệnh nhân đã có hồ sơ' },
              { id: 'NEW', label: 'Tạo hồ sơ bệnh nhân mới' },
            ]}
          />

          {walkInMode === 'EXISTING' ? (
            <div className="space-y-2.5">
              <Input
                label="Tìm bệnh nhân theo tên, mã BN hoặc SĐT"
                placeholder="Nhập từ khóa tìm kiếm..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              <Select
                label="Chọn bệnh nhân"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                {patientResults.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.patientCode}] {p.fullName} — {p.phone || p.email}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Họ và tên"
                required
                placeholder="Nguyễn Văn A"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
              <Input
                label="Số điện thoại"
                placeholder="090xxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <Input
                label="Ngày sinh"
                type="date"
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
              />
              <Select
                label="Giới tính"
                value={newGender}
                onChange={(e) => setNewGender(e.target.value as Gender)}
                options={[
                  { value: 'MALE', label: 'Nam' },
                  { value: 'FEMALE', label: 'Nữ' },
                  { value: 'OTHER', label: 'Khác' },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <Input
                label="Ngày khám"
                type="date"
                value={walkInDate}
                onChange={(e) => setWalkInDate(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Bác sĩ & Chuyên khoa"
                value={walkInDoctorId}
                onChange={(e) => setWalkInDoctorId(e.target.value)}
                required
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title ? `${d.title} ` : ''}
                    {d.fullName} — {d.department.name}
                    {d.room ? ` (${d.room.name})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <Select
              label="Buổi khám"
              value={walkInSession}
              onChange={(e) => setWalkInSession(e.target.value as SessionType)}
              options={[
                { value: 'MORNING', label: 'Buổi Sáng (07:30 - 11:30)' },
                { value: 'AFTERNOON', label: 'Buổi Chiều (13:30 - 17:00)' },
              ]}
            />
            <label className="flex items-center gap-2.5 p-3 mt-5 rounded-xl border border-rose-300 bg-rose-50/60 cursor-pointer">
              <input
                type="checkbox"
                checked={walkInPriority}
                onChange={(e) => setWalkInPriority(e.target.checked)}
                className="h-4 w-4 rounded text-rose-800 focus:ring-rose-500"
              />
              <span className="text-xs sm:text-sm font-bold text-rose-800">
                Đánh dấu Ưu tiên (Người cao tuổi / Cấp cứu / Trẻ nhỏ)
              </span>
            </label>
          </div>

          <Textarea
            label="Triệu chứng / Lý do đến khám"
            placeholder="Ví dụ: Sốt cao, ho khan 2 ngày..."
            value={walkInComplaint}
            onChange={(e) => setWalkInComplaint(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setWalkInOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={walkInSubmitting}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Tiếp nhận & Cấp STT
            </Button>
          </div>
        </form>
      </Modal>

      {/* Triage Vitals & BHYT Checklist Modal */}
      <Modal
        open={Boolean(triageApt)}
        onClose={() => setTriageApt(null)}
        size="lg"
        title="Đo Sinh hiệu (Triage Vitals) & Kiểm tra Thủ tục BHYT"
        description={
          triageApt
            ? `${formatQueueNumber(triageApt.queueNumber)} • ${triageApt.patientName} (${triageApt.patientCode})`
            : undefined
        }
      >
        <form onSubmit={handleSaveTriage} className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[#1D5BB8]" />
                Chỉ số Sinh hiệu ban đầu
              </h4>
              {computedBmi !== undefined && (
                <Badge variant="blue">BMI ước tính: {computedBmi}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Huyết áp tâm thu (mmHg)"
                type="number"
                value={vitals.bloodPressureSystolic ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    bloodPressureSystolic: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Huyết áp tâm trương (mmHg)"
                type="number"
                value={vitals.bloodPressureDiastolic ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    bloodPressureDiastolic: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Nhịp tim (lần/phút)"
                type="number"
                value={vitals.heartRate ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    heartRate: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Nhiệt độ (°C)"
                type="number"
                step="0.1"
                value={vitals.temperature ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    temperature: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="SpO2 (%)"
                type="number"
                max={100}
                value={vitals.spo2 ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    spo2: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Nhịp thở (lần/phút)"
                type="number"
                value={vitals.respiratoryRate ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    respiratoryRate: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Chiều cao (cm)"
                type="number"
                value={vitals.heightCm ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    heightCm: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <Input
                label="Cân nặng (kg)"
                type="number"
                step="0.1"
                value={vitals.weightKg ?? ''}
                onChange={(e) =>
                  setVitals((v) => ({
                    ...v,
                    weightKg: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-[#1D5BB8]" />
              Bảng kiểm Thủ tục Hành chính & BHYT
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'identityVerified' as const, label: 'Đã đối chiếu CCCD / Giấy tờ' },
                { key: 'bhytVerified' as const, label: 'Đã kiểm tra thẻ BHYT hợp lệ' },
                { key: 'allergyScreened' as const, label: 'Đã sàng lọc tiền sử dị ứng' },
                { key: 'consentSigned' as const, label: 'Bệnh nhân đã đồng ý thực hiện khám' },
              ].map((chk) => (
                <label
                  key={chk.key}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checklist[chk.key])}
                    onChange={(e) =>
                      setChecklist((c) => ({ ...c, [chk.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-[#1D5BB8]"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">
                    {chk.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Ghi chú phân loại ban đầu (Triage Notes)"
            placeholder="Ví dụ: Bệnh nhân hơi mệt, cần ưu tiên vào phòng khám sớm..."
            value={triageNotes}
            onChange={(e) => setTriageNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTriageApt(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingTriage}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Lưu sinh hiệu & Thủ tục
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
