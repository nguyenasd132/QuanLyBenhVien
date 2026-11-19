import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Stethoscope,
  Sun,
  Sunset,
  Ticket,
  UserCheck,
} from 'lucide-react';
import { ApiError, patientApi, publicApi } from '@/lib/api';
import {
  formatCurrencyVND,
  formatDateVN,
  formatQueueNumber,
  getSessionLabel,
  getTodayISODate,
  toLocalISODate,
} from '@/lib/format';
import type {
  AppointmentDto,
  BookingFlow,
  DepartmentDto,
  DoctorDto,
  ScheduleAvailabilityDto,
} from '@/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  QrCodeBox,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

function getNext7Days(): { value: string; weekday: string; label: string }[] {
  const days: { value: string; weekday: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const offset = d.getTimezoneOffset();
    const iso = new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
    const weekday =
      i === 0
        ? 'Hôm nay'
        : i === 1
        ? 'Ngày mai'
        : d.toLocaleDateString('vi-VN', { weekday: 'short' });
    const label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    days.push({ value: iso, weekday, label });
  }
  return days;
}

export const BookingWizardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const initialFlowParam = searchParams.get('flow');
  const initialFlow: BookingFlow =
    initialFlowParam === 'BY_DOCTOR' || initialFlowParam === 'BY_DATE'
      ? initialFlowParam
      : 'BY_DEPARTMENT';
  const initialDoctorId = searchParams.get('doctorId') || '';
  const initialDeptId = searchParams.get('departmentId') || '';

  const [flow, setFlow] = useState<BookingFlow>(initialFlow);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDeptId);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate());
  const [doctorSearch, setDoctorSearch] = useState('');

  const [availabilities, setAvailabilities] = useState<ScheduleAvailabilityDto[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleAvailabilityDto | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<AppointmentDto | null>(null);

  const next7Days = useMemo(() => getNext7Days(), []);

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const [depts, docs] = await Promise.all([
          publicApi.getDepartments(),
          publicApi.getDoctors(),
        ]);
        setDepartments(depts);
        setDoctors(docs);

        if (!initialDeptId && depts.length > 0) {
          const noiTongQuat = depts.find((d) =>
            d.name.toLowerCase().includes('nội tổng quát')
          );
          setSelectedDepartmentId((noiTongQuat || depts[0]).id);
        }
        if (!initialDoctorId && docs.length > 0) {
          setSelectedDoctorId(docs[0].id);
        }
      } catch {
        setError('Không thể tải dữ liệu chuyên khoa và bác sĩ.');
      } finally {
        setCatalogLoading(false);
      }
    };
    void loadCatalog();
  }, [initialDeptId, initialDoctorId]);

  useEffect(() => {
    if (catalogLoading) return;
    const loadAvailability = async () => {
      setAvailLoading(true);
      setError(null);
      setSelectedSchedule(null);
      try {
        if (flow === 'BY_DEPARTMENT') {
          if (!selectedDepartmentId || !selectedDate) {
            setAvailabilities([]);
            return;
          }
          const data = await publicApi.getAvailability({
            flow: 'BY_DEPARTMENT',
            departmentId: selectedDepartmentId,
            date: selectedDate,
          });
          setAvailabilities(data);
        } else if (flow === 'BY_DOCTOR') {
          if (!selectedDoctorId) {
            setAvailabilities([]);
            return;
          }
          const fromDate = getTodayISODate();
          const to = new Date();
          to.setDate(to.getDate() + 10);
          const toDate = toLocalISODate(to);
          const data = await publicApi.getAvailability({
            flow: 'BY_DOCTOR',
            doctorId: selectedDoctorId,
            fromDate,
            toDate,
          });
          setAvailabilities(data);
        } else {
          if (!selectedDate) {
            setAvailabilities([]);
            return;
          }
          const data = await publicApi.getAvailability({
            flow: 'BY_DATE',
            date: selectedDate,
            departmentId: selectedDepartmentId || undefined,
          });
          setAvailabilities(data);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Không thể kiểm tra lịch trống. Vui lòng thử lại.');
        }
      } finally {
        setAvailLoading(false);
      }
    };
    void loadAvailability();
  }, [flow, selectedDepartmentId, selectedDoctorId, selectedDate, catalogLoading]);

  const filteredDoctors = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    return doctors.filter((d) => {
      if (!q) return true;
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.department.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
      );
    });
  }, [doctors, doctorSearch]);

  const handleConfirmBooking = async () => {
    if (!selectedSchedule) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await patientApi.bookAppointment({
        doctorId: selectedSchedule.doctorId,
        date: selectedSchedule.scheduleDate,
        session: selectedSchedule.session,
        bookingFlow: flow,
        chiefComplaint: chiefComplaint.trim() || undefined,
      });
      setConfirmedTicket(created);
      toast.success(
        `Đặt lịch thành công • STT ${formatQueueNumber(created.queueNumber)}`,
        `Mã lịch hẹn: ${created.appointmentCode}`
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Đặt lịch không thành công. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedTicket) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <Card padding="lg" className="border-[#9EC0EC] shadow-card-hover">
          <div className="text-center pb-5 border-b border-[#C7D6EA]">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <Badge variant="emerald">Đặt lịch khám thành công</Badge>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              Phiếu khám ngoại trú An Tâm
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Vui lòng xuất trình mã check-in hoặc mã QR này tại quầy Điều dưỡng trước giờ dự kiến 15 phút.
            </p>
          </div>

          <div className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <p className="text-xs font-bold text-slate-600 uppercase">Số thứ tự (STT)</p>
              <p className="text-4xl font-extrabold text-[#1D5BB8] my-1">
                {formatQueueNumber(confirmedTicket.queueNumber)}
              </p>
              <p className="text-xs font-semibold text-slate-700 mb-3">
                Dự kiến: {confirmedTicket.estimatedTime}
              </p>
              <QrCodeBox value={confirmedTicket.appointmentCode} size={132} />
              <p className="text-xs font-bold text-slate-900 mt-2">
                {confirmedTicket.appointmentCode}
              </p>
            </div>

            <div className="sm:col-span-7 space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <p className="text-xs text-slate-600">Chuyên khoa & Bác sĩ</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  {confirmedTicket.departmentName}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-[#1D5BB8]">
                  {confirmedTicket.doctorTitle ? `${confirmedTicket.doctorTitle} ` : ''}
                  {confirmedTicket.doctorName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                  <p className="text-xs text-slate-600">Ngày khám</p>
                  <p className="font-bold text-slate-900">
                    {formatDateVN(confirmedTicket.appointmentDate)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                  <p className="text-xs text-slate-600">Phòng khám</p>
                  <p className="font-bold text-slate-900">
                    {confirmedTicket.roomName || 'Theo điều phối'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <p className="text-xs text-slate-600">Buổi khám</p>
                <p className="font-bold text-slate-900">
                  {getSessionLabel(confirmedTicket.session)}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#C7D6EA] flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmedTicket(null);
                setSelectedSchedule(null);
                setChiefComplaint('');
              }}
            >
              Đặt thêm lịch khác
            </Button>
            <Link to="/patient/appointments">
              <Button leftIcon={<Ticket className="h-4 w-4" />}>
                Xem trong Lịch hẹn của tôi
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Đặt lịch khám theo Buổi</h1>
        <p className="text-sm text-slate-600 mt-1">
          Chọn cách đặt lịch thuận tiện nhất. Hệ thống tự động cấp STT tuần tự cho Buổi Sáng
          (07:30-11:30) hoặc Buổi Chiều (13:30-17:00).
        </p>
      </div>

      {/* 3-Flow Tabs */}
      <Tabs
        activeId={flow}
        onChange={(id) => {
          setFlow(id as BookingFlow);
          setSelectedSchedule(null);
          if (id === 'BY_DATE') {
            setSelectedDepartmentId('');
          } else if (id === 'BY_DEPARTMENT' && !selectedDepartmentId && departments.length > 0) {
            const noi = departments.find((d) => d.name.toLowerCase().includes('nội tổng quát'));
            setSelectedDepartmentId((noi || departments[0]).id);
          }
        }}
        items={[
          {
            id: 'BY_DEPARTMENT',
            label: '1. Theo chuyên khoa',
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            id: 'BY_DOCTOR',
            label: '2. Theo bác sĩ',
            icon: <Stethoscope className="h-4 w-4" />,
          },
          {
            id: 'BY_DATE',
            label: '3. Theo ngày khám',
            icon: <Calendar className="h-4 w-4" />,
          },
        ]}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {catalogLoading ? (
        <Spinner label="Đang tải chuyên khoa và lịch bác sĩ..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Steps Column */}
          <div className="lg:col-span-8 space-y-5">
            {/* Flow 1: BY_DEPARTMENT */}
            {flow === 'BY_DEPARTMENT' && (
              <>
                <Card padding="md">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">
                    Bước 1: Chọn chuyên khoa
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {departments.map((dep) => {
                      const active = dep.id === selectedDepartmentId;
                      return (
                        <button
                          key={dep.id}
                          type="button"
                          onClick={() => setSelectedDepartmentId(dep.id)}
                          className={`text-left p-3.5 rounded-2xl border transition-all ${
                            active
                              ? 'bg-[#DCEAFB] border-[#1D5BB8] shadow-sm'
                              : 'bg-white border-[#C7D6EA] hover:bg-[#EDF3FB]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">{dep.name}</p>
                            <span className="text-xs font-bold text-[#1D5BB8]">
                              {formatCurrencyVND(dep.consultationFee)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {dep.location || 'Khu khám ngoại trú'}
                            {typeof dep.doctorCount === 'number'
                              ? ` • ${dep.doctorCount} bác sĩ`
                              : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h2 className="text-sm font-bold text-slate-900">Bước 2: Chọn ngày khám</h2>
                    <input
                      type="date"
                      min={getTodayISODate()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 px-3 rounded-xl border border-[#9FB5D0] text-xs font-semibold text-slate-800 focus:border-[#1D5BB8] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {next7Days.map((d) => {
                      const active = selectedDate === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setSelectedDate(d.value)}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            active
                              ? 'bg-[#1D5BB8] text-white border-[#1D5BB8]'
                              : 'bg-[#EDF3FB] text-slate-800 border-[#C7D6EA] hover:border-[#7B99BE]'
                          }`}
                        >
                          <p className="text-[10px] font-semibold opacity-85">{d.weekday}</p>
                          <p className="text-xs font-extrabold mt-0.5">{d.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}

            {/* Flow 2: BY_DOCTOR */}
            {flow === 'BY_DOCTOR' && (
              <Card padding="md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-bold text-slate-900">Bước 1: Chọn bác sĩ</h2>
                  <div className="sm:w-64">
                    <Input
                      placeholder="Tìm tên bác sĩ, chuyên khoa..."
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {filteredDoctors.map((doc) => {
                    const active = doc.id === selectedDoctorId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all ${
                          active
                            ? 'bg-[#DCEAFB] border-[#1D5BB8] shadow-sm'
                            : 'bg-white border-[#C7D6EA] hover:bg-[#EDF3FB]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {doc.title ? `${doc.title} ` : ''}
                            {doc.fullName}
                          </p>
                          <Badge variant={doc.isOnDuty ? 'emerald' : 'slate'} size="sm">
                            {doc.isOnDuty ? 'Đang trực' : 'Lịch chuẩn'}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#1D5BB8] font-semibold mt-0.5">
                          {doc.department.name} • {doc.specialty}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {doc.room ? doc.room.name : 'Phòng khám'} •{' '}
                          {formatCurrencyVND(doc.consultationFee)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Flow 3: BY_DATE */}
            {flow === 'BY_DATE' && (
              <>
                <Card padding="md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h2 className="text-sm font-bold text-slate-900">Bước 1: Chọn ngày khám</h2>
                    <input
                      type="date"
                      min={getTodayISODate()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 px-3 rounded-xl border border-[#9FB5D0] text-xs font-semibold text-slate-800 focus:border-[#1D5BB8] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {next7Days.map((d) => {
                      const active = selectedDate === d.value;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setSelectedDate(d.value)}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            active
                              ? 'bg-[#1D5BB8] text-white border-[#1D5BB8]'
                              : 'bg-[#EDF3FB] text-slate-800 border-[#C7D6EA] hover:border-[#7B99BE]'
                          }`}
                        >
                          <p className="text-[10px] font-semibold opacity-85">{d.weekday}</p>
                          <p className="text-xs font-extrabold mt-0.5">{d.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card padding="md">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">
                    Bước 2: Lọc chuyên khoa (tùy chọn)
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDepartmentId('')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        selectedDepartmentId === ''
                          ? 'bg-[#1D5BB8] text-white border-[#1D5BB8]'
                          : 'bg-white text-slate-800 border-[#9FB5D0] hover:bg-[#EDF3FB]'
                      }`}
                    >
                      Tất cả chuyên khoa
                    </button>
                    {departments.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => setSelectedDepartmentId(dep.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          selectedDepartmentId === dep.id
                            ? 'bg-[#1D5BB8] text-white border-[#1D5BB8]'
                            : 'bg-white text-slate-800 border-[#9FB5D0] hover:bg-[#EDF3FB]'
                        }`}
                      >
                        {dep.name}
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* Step 3 / Sessions Selection */}
            <Card padding="md">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  {flow === 'BY_DOCTOR'
                    ? 'Bước 2: Chọn ngày & Buổi Sáng/Chiều'
                    : 'Bước 3: Chọn bác sĩ & Buổi Sáng/Chiều'}
                </h2>
                <span className="text-xs text-slate-600">
                  {availabilities.length} buổi mở đặt lịch
                </span>
              </div>

              {availLoading ? (
                <Spinner label="Đang tải các buổi khám còn chỗ..." />
              ) : availabilities.length === 0 ? (
                <EmptyState
                  icon={<CalendarCheck className="h-5 w-5" />}
                  title="Không có lịch khám trống cho lựa chọn này"
                  description="Vui lòng chọn ngày khác hoặc chuyên khoa/bác sĩ khác."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availabilities.map((slot) => {
                    const isSelected = selectedSchedule?.scheduleId === slot.scheduleId;
                    const isFull = slot.remainingSlots <= 0 || !slot.isAvailable;
                    const fillPercent = Math.min(
                      100,
                      Math.round((slot.bookedCount / Math.max(1, slot.maxPatients)) * 100)
                    );

                    return (
                      <button
                        key={slot.scheduleId}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSchedule(slot)}
                        className={`text-left p-4 rounded-2xl border transition-all disabled:opacity-55 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-[#DCEAFB] border-[#1D5BB8] ring-2 ring-[#1D5BB8]/25'
                            : 'bg-white border-[#C7D6EA] hover:border-[#7B99BE] hover:bg-[#EDF3FB]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                                slot.session === 'MORNING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {slot.session === 'MORNING' ? (
                                <Sun className="h-4 w-4" />
                              ) : (
                                <Sunset className="h-4 w-4" />
                              )}
                            </span>
                            <div>
                              <p className="text-xs font-extrabold text-slate-900">
                                {slot.session === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'} (
                                {slot.startTime} - {slot.endTime})
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {formatDateVN(slot.scheduleDate)}
                              </p>
                            </div>
                          </div>
                          <Badge variant={isFull ? 'rose' : 'blue'} size="sm">
                            {isFull
                              ? 'Hết lượt'
                              : `Còn ${slot.remainingSlots}/${slot.maxPatients} lượt`}
                          </Badge>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#C7D6EA] space-y-1.5">
                          <p className="text-sm font-bold text-slate-900">
                            {slot.doctorTitle ? `${slot.doctorTitle} ` : ''}
                            {slot.doctorName}
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                            <span>{slot.departmentName}</span>
                            {slot.roomName && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                {slot.roomName}
                              </span>
                            )}
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mt-2">
                            <div
                              className="h-full rounded-full bg-[#1D5BB8]"
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="font-bold text-[#1D5BB8]">
                              STT dự kiến {formatQueueNumber(slot.nextQueueNumber)} •{' '}
                              {slot.estimatedTime}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatCurrencyVND(slot.consultationFee)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Summary & Confirm Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <Card padding="md" className="space-y-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#1D5BB8]" />
                <h2 className="text-base font-bold text-slate-900">Xác nhận đặt lịch</h2>
              </div>

              {selectedSchedule ? (
                <>
                  <div className="p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA] space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">STT dự kiến</span>
                      <span className="text-lg font-extrabold text-[#1D5BB8]">
                        {formatQueueNumber(selectedSchedule.nextQueueNumber)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Giờ dự kiến</span>
                      <span className="font-bold text-slate-900 inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#1D5BB8]" />
                        {selectedSchedule.estimatedTime}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#C7D6EA] space-y-1">
                      <p className="font-bold text-slate-900">
                        {selectedSchedule.doctorTitle ? `${selectedSchedule.doctorTitle} ` : ''}
                        {selectedSchedule.doctorName}
                      </p>
                      <p className="text-xs text-slate-700">{selectedSchedule.departmentName}</p>
                      <p className="text-xs text-slate-700">
                        {formatDateVN(selectedSchedule.scheduleDate)} •{' '}
                        {selectedSchedule.session === 'MORNING' ? 'Buổi Sáng' : 'Buổi Chiều'} (
                        {selectedSchedule.startTime} - {selectedSchedule.endTime})
                      </p>
                      {selectedSchedule.roomName && (
                        <p className="text-xs text-slate-700">{selectedSchedule.roomName}</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#C7D6EA] flex items-center justify-between">
                      <span className="text-slate-600">Phí khám dự kiến</span>
                      <span className="font-extrabold text-[#1D5BB8]">
                        {formatCurrencyVND(selectedSchedule.consultationFee)}
                      </span>
                    </div>
                  </div>

                  <Textarea
                    label="Triệu chứng / Lý do khám"
                    placeholder="Ví dụ: Đau đầu, chóng mặt nhẹ 2 ngày nay..."
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />

                  <Button
                    size="lg"
                    className="w-full"
                    loading={submitting}
                    onClick={handleConfirmBooking}
                  >
                    Xác nhận lấy STT & Đặt lịch
                  </Button>
                </>
              ) : (
                <div className="p-6 rounded-2xl bg-[#EDF3FB] border border-dashed border-[#9FB5D0] text-center text-xs sm:text-sm text-slate-600">
                  Chọn một buổi khám ở bên trái để xem số thứ tự dự kiến và hoàn tất đặt lịch.
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
