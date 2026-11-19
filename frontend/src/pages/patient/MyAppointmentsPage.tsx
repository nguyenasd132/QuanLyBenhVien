import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  CalendarPlus,
  Clock,
  Eye,
  MapPin,
  RefreshCw,
  Sun,
  Sunset,
  XCircle,
} from 'lucide-react';
import { ApiError, patientApi, publicApi } from '@/lib/api';
import {
  formatDateTimeVN,
  formatDateVN,
  formatQueueNumber,
  getSessionLabel,
  getTodayISODate,
} from '@/lib/format';
import type {
  AppointmentDto,
  MedicalRecordDto,
  ScheduleAvailabilityDto,
  SessionType,
} from '@/types';
import {
  Alert,
  AppointmentStatusBadge,
  Badge,
  BookingTypeBadge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  QrCodeBox,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

type FilterTab = 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export const MyAppointmentsPage: React.FC = () => {
  const toast = useToast();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [detailTarget, setDetailTarget] = useState<
    (AppointmentDto & { medicalRecord?: MedicalRecordDto | null }) | null
  >(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reschedule modal
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentDto | null>(null);
  const [newDate, setNewDate] = useState(getTodayISODate());
  const [availSessions, setAvailSessions] = useState<ScheduleAvailabilityDto[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType | ''>('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<AppointmentDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await patientApi.getAppointments();
      setAppointments(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Không thể tải danh sách lịch hẹn.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const counts = useMemo(() => {
    const upcoming = appointments.filter((a) =>
      ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
    ).length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter((a) =>
      ['CANCELLED', 'NO_SHOW'].includes(a.status)
    ).length;
    return { all: appointments.length, upcoming, completed, cancelled };
  }, [appointments]);

  const filtered = useMemo(() => {
    if (activeTab === 'UPCOMING') {
      return appointments.filter((a) =>
        ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
      );
    }
    if (activeTab === 'COMPLETED') {
      return appointments.filter((a) => a.status === 'COMPLETED');
    }
    if (activeTab === 'CANCELLED') {
      return appointments.filter((a) => ['CANCELLED', 'NO_SHOW'].includes(a.status));
    }
    return appointments;
  }, [appointments, activeTab]);

  const openDetailModal = async (appt: AppointmentDto) => {
    setDetailTarget(appt);
    setDetailLoading(true);
    try {
      const detail = await patientApi.getAppointmentDetail(appt.id);
      setDetailTarget(detail);
    } catch {
      // keep summary
    } finally {
      setDetailLoading(false);
    }
  };

  const openRescheduleModal = async (appt: AppointmentDto) => {
    setRescheduleTarget(appt);
    const baseDate = appt.appointmentDate.slice(0, 10) || getTodayISODate();
    setNewDate(baseDate);
    setSelectedSession('');
    await fetchDoctorAvailabilityForDate(appt.doctorId, baseDate);
  };

  const fetchDoctorAvailabilityForDate = async (doctorId: string, date: string) => {
    setAvailLoading(true);
    try {
      const slots = await publicApi.getAvailability({ doctorId, date });
      setAvailSessions(slots);
    } catch {
      setAvailSessions([]);
    } finally {
      setAvailLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !selectedSession) return;
    setRescheduleSubmitting(true);
    try {
      const updated = await patientApi.rescheduleAppointment(rescheduleTarget.id, {
        date: newDate,
        session: selectedSession,
        doctorId: rescheduleTarget.doctorId,
      });
      toast.success(
        'Đổi lịch thành công',
        `STT mới của bạn là ${formatQueueNumber(updated.queueNumber)} (${updated.estimatedTime})`
      );
      setRescheduleTarget(null);
      await loadAppointments(true);
    } catch (err) {
      toast.error(
        'Không thể đổi lịch',
        err instanceof ApiError ? err.message : 'Vui lòng chọn buổi khám khác.'
      );
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    try {
      await patientApi.cancelAppointment(
        cancelTarget.id,
        cancelReason.trim() || 'Bệnh nhân thay đổi kế hoạch'
      );
      toast.info('Đã hủy lịch hẹn', `Lịch ${cancelTarget.appointmentCode} đã được hủy.`);
      setCancelTarget(null);
      setCancelReason('');
      await loadAppointments(true);
    } catch (err) {
      toast.error(
        'Không thể hủy lịch',
        err instanceof ApiError ? err.message : 'Vui lòng thử lại.'
      );
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Lịch hẹn của tôi</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Theo dõi Số thứ tự (STT), STT đang khám trực tiếp tại phòng và quản lý đổi/hủy lịch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadAppointments(true)}
          >
            Cập nhật STT
          </Button>
          <Link to="/patient/book">
            <Button size="sm" leftIcon={<CalendarPlus className="h-4 w-4" />}>
              Đặt lịch mới
            </Button>
          </Link>
        </div>
      </div>

      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as FilterTab)}
        items={[
          { id: 'ALL', label: 'Tất cả', count: counts.all },
          { id: 'UPCOMING', label: 'Sắp tới & Đang khám', count: counts.upcoming },
          { id: 'COMPLETED', label: 'Hoàn thành', count: counts.completed },
          { id: 'CANCELLED', label: 'Đã hủy', count: counts.cancelled },
        ]}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Đang tải lịch hẹn..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Chưa có lịch hẹn nào trong mục này"
          description="Đặt lịch khám ngay để nhận STT và giờ khám dự kiến."
          action={
            <Link to="/patient/book">
              <Button size="sm">Đặt lịch khám ngay</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filtered.map((appt) => {
            const isActive = ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appt.status);
            const turnsAhead =
              appt.liveCurrentStt && appt.queueNumber > appt.liveCurrentStt
                ? appt.queueNumber - appt.liveCurrentStt
                : null;

            return (
              <Card key={appt.id} padding="md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: STT & Live Clinic Queue */}
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-20 rounded-2xl bg-[#DCEAFB] border border-[#9EC0EC] flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">STT</span>
                      <span className="text-2xl font-extrabold text-[#1D5BB8] leading-none mt-0.5">
                        {formatQueueNumber(appt.queueNumber)}
                      </span>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 bg-[#EDF3FB] px-2 py-0.5 rounded-lg border border-[#C7D6EA]">
                          {appt.appointmentCode}
                        </span>
                        <AppointmentStatusBadge status={appt.status} />
                        <BookingTypeBadge type={appt.bookingType} />
                        {appt.isPriority && (
                          <Badge variant="rose" size="sm">
                            Ưu tiên
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {appt.departmentName} —{' '}
                        {appt.doctorTitle ? `${appt.doctorTitle} ` : ''}
                        {appt.doctorName}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#1D5BB8]" />
                          {formatDateVN(appt.appointmentDate)} • {getSessionLabel(appt.session)} •
                          Dự kiến <strong>{appt.estimatedTime}</strong>
                        </span>
                        {appt.roomName && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#1D5BB8]" />
                            {appt.roomName}
                          </span>
                        )}
                      </div>

                      {isActive && (
                        <div className="inline-flex flex-wrap items-center gap-2 pt-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold">
                            <Activity className="h-3.5 w-3.5" />
                            STT đang khám tại phòng:{' '}
                            <strong>
                              {appt.liveCurrentStt
                                ? formatQueueNumber(appt.liveCurrentStt)
                                : 'Chưa bắt đầu'}
                            </strong>
                            {turnsAhead !== null && ` (Còn ${turnsAhead} lượt)`}
                          </span>
                        </div>
                      )}

                      {appt.cancelReason && (
                        <p className="text-xs font-medium text-rose-700">
                          Lý do hủy: {appt.cancelReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => void openDetailModal(appt)}
                    >
                      Chi tiết
                    </Button>

                    {appt.status === 'BOOKED' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void openRescheduleModal(appt)}
                        >
                          Đổi lịch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-700 border-rose-300 hover:bg-rose-50 hover:border-rose-400"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setCancelTarget(appt);
                            setCancelReason('');
                          }}
                        >
                          Hủy lịch
                        </Button>
                      </>
                    )}

                    {appt.hasMedicalRecord && (
                      <Link
                        to={
                          appt.medicalRecordId
                            ? `/patient/records?recordId=${appt.medicalRecordId}`
                            : '/patient/records'
                        }
                      >
                        <Button size="sm">Xem kết quả</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Appointment Detail Modal */}
      <Modal
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Chi tiết lịch hẹn ${detailTarget?.appointmentCode || ''}`}
        description={
          detailTarget
            ? `${detailTarget.departmentName} • ${detailTarget.doctorName}`
            : ''
        }
        size="lg"
      >
        {detailTarget && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <QrCodeBox value={detailTarget.appointmentCode} size={110} />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="blue">STT {formatQueueNumber(detailTarget.queueNumber)}</Badge>
                  <AppointmentStatusBadge status={detailTarget.status} />
                </div>
                <p className="font-bold text-slate-900">
                  {formatDateVN(detailTarget.appointmentDate)} •{' '}
                  {getSessionLabel(detailTarget.session)}
                </p>
                <p className="text-xs text-slate-700">
                  Giờ dự kiến: <strong>{detailTarget.estimatedTime}</strong> • Phòng:{' '}
                  <strong>{detailTarget.roomName || 'Theo điều phối'}</strong>
                </p>
                {detailTarget.checkedInAt && (
                  <p className="text-xs text-slate-600">
                    Check-in lúc: {formatDateTimeVN(detailTarget.checkedInAt)}
                  </p>
                )}
              </div>
            </div>

            {detailTarget.chiefComplaint && (
              <div className="p-3.5 rounded-xl border border-[#C7D6EA]">
                <p className="text-xs font-bold text-slate-600 mb-1">Triệu chứng ban đầu</p>
                <p className="text-slate-900">{detailTarget.chiefComplaint}</p>
              </div>
            )}

            {detailLoading ? (
              <Spinner />
            ) : detailTarget.nursingProcedure ? (
              <div className="p-4 rounded-2xl border border-[#C7D6EA] bg-[#EDF3FB]">
                <p className="text-xs font-bold text-[#15458E] uppercase mb-2">
                  Sinh hiệu đo tại quầy Điều dưỡng ({detailTarget.nursingProcedure.nurseName})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {detailTarget.nursingProcedure.vitals.bloodPressureSystolic && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Huyết áp</span>
                      <strong className="text-slate-900">
                        {detailTarget.nursingProcedure.vitals.bloodPressureSystolic}/
                        {detailTarget.nursingProcedure.vitals.bloodPressureDiastolic} mmHg
                      </strong>
                    </div>
                  )}
                  {detailTarget.nursingProcedure.vitals.heartRate && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Nhịp tim</span>
                      <strong className="text-slate-900">
                        {detailTarget.nursingProcedure.vitals.heartRate} bpm
                      </strong>
                    </div>
                  )}
                  {detailTarget.nursingProcedure.vitals.temperature && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#C7D6EA]">
                      <span className="text-slate-600 block">Nhiệt độ</span>
                      <strong className="text-slate-900">
                        {detailTarget.nursingProcedure.vitals.temperature} °C
                      </strong>
                    </div>
                  )}
                  {detailTarget.nursingProcedure.vitals.spo2 && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#C7D6EA]">
                      <span className="text-slate-600 block">SpO2</span>
                      <strong className="text-slate-900">
                        {detailTarget.nursingProcedure.vitals.spo2}%
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Đổi lịch khám"
        description={
          rescheduleTarget
            ? `Bác sĩ ${rescheduleTarget.doctorName} • ${rescheduleTarget.departmentName}`
            : ''
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              disabled={!selectedSession}
              loading={rescheduleSubmitting}
              onClick={handleConfirmReschedule}
            >
              Xác nhận đổi lịch
            </Button>
          </>
        }
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <Input
              label="Chọn ngày khám mới"
              type="date"
              min={getTodayISODate()}
              value={newDate}
              onChange={(e) => {
                const val = e.target.value;
                setNewDate(val);
                setSelectedSession('');
                void fetchDoctorAvailabilityForDate(rescheduleTarget.doctorId, val);
              }}
            />

            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">
                Chọn Buổi Sáng / Buổi Chiều
              </p>
              {availLoading ? (
                <Spinner />
              ) : availSessions.length === 0 ? (
                <Alert variant="warning">
                  Bác sĩ không có lịch trống vào ngày đã chọn. Vui lòng chọn ngày khác.
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availSessions.map((slot) => {
                    const disabled = slot.remainingSlots <= 0 || !slot.isAvailable;
                    const active = selectedSession === slot.session;
                    return (
                      <button
                        key={slot.scheduleId}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedSession(slot.session)}
                        className={`text-left p-3.5 rounded-2xl border transition-all disabled:opacity-50 ${
                          active
                            ? 'bg-[#DCEAFB] border-[#1D5BB8]'
                            : 'bg-white border-[#C7D6EA] hover:bg-[#EDF3FB]'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                          {slot.session === 'MORNING' ? (
                            <Sun className="h-4 w-4 text-amber-600" />
                          ) : (
                            <Sunset className="h-4 w-4 text-indigo-600" />
                          )}
                          {slot.session === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {slot.startTime} - {slot.endTime} • Còn {slot.remainingSlots}/
                          {slot.maxPatients} lượt
                        </p>
                        <p className="text-xs font-bold text-[#1D5BB8] mt-1">
                          STT mới dự kiến: {formatQueueNumber(slot.nextQueueNumber)} (
                          {slot.estimatedTime})
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Hủy lịch hẹn ${cancelTarget?.appointmentCode || ''}`}
        description="STT của các bệnh nhân khác trong buổi khám vẫn được giữ nguyên."
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Giữ lại lịch
            </Button>
            <Button variant="danger" loading={cancelSubmitting} onClick={handleConfirmCancel}>
              Xác nhận hủy lịch
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              'Bận công việc đột xuất',
              'Đã khỏe hơn, không cần khám',
              'Đổi sang ngày khác thuận tiện hơn',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCancelReason(preset)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#EDF3FB] hover:bg-[#DCEAFB] text-slate-800 border border-[#C7D6EA]"
              >
                {preset}
              </button>
            ))}
          </div>
          <Textarea
            label="Lý do hủy lịch"
            placeholder="Nhập lý do hủy (tùy chọn)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
