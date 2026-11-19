import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import {
  formatDateVN,
  formatQueueNumber,
  getSessionLabel,
  getTodayISODate,
} from '@/lib/format';
import type {
  AppointmentDto,
  DoctorQueueResponseDto,
  DoctorQueueSessionDto,
  SessionType,
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
  Spinner,
  Tabs,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type SessionFilter = 'ALL' | SessionType;

export const DoctorQueuePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate());
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queueData, setQueueData] = useState<DoctorQueueResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await doctorApi.getQueue({
        date: selectedDate,
        session: sessionFilter === 'ALL' ? undefined : sessionFilter,
      });
      setQueueData(data);
    } catch (err) {
      toast.error(
        'Không thể tải hàng đợi khám',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, sessionFilter, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleCallNext = async (session: SessionType, completeCurrent = false) => {
    setBusyKey(`call-next-${session}`);
    try {
      const called = await doctorApi.callNext({
        date: selectedDate,
        session,
        completeCurrent: completeCurrent || undefined,
      });
      if (called) {
        toast.success(
          `Đã gọi số ${formatQueueNumber(called.queueNumber)}`,
          `Bệnh nhân ${called.patientName} (${called.patientCode})`
        );
      } else {
        toast.info('Không còn bệnh nhân chờ trong buổi này');
      }
      await loadQueue();
    } catch (err) {
      toast.error(
        'Không thể gọi số tiếp theo',
        err instanceof Error ? err.message : 'Đã xảy ra lỗi'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleStatusChange = async (
    apt: AppointmentDto,
    action: 'START' | 'COMPLETE' | 'NO_SHOW'
  ) => {
    setBusyKey(`${apt.id}-${action}`);
    try {
      const statusMap = {
        START: 'IN_PROGRESS',
        COMPLETE: 'COMPLETED',
        NO_SHOW: 'NO_SHOW',
      } as const;
      await doctorApi.updateAppointmentStatus(apt.id, {
        action,
        status: statusMap[action],
      });
      const labelMap = {
        START: 'Đã bắt đầu khám',
        COMPLETE: 'Đã hoàn tất lượt khám',
        NO_SHOW: 'Đã đánh dấu vắng mặt',
      };
      toast.success(labelMap[action], `${formatQueueNumber(apt.queueNumber)} • ${apt.patientName}`);
      await loadQueue();
    } catch (err) {
      toast.error(
        'Cập nhật trạng thái thất bại',
        err instanceof Error ? err.message : 'Đã xảy ra lỗi'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const filterAppointments = useCallback(
    (list: AppointmentDto[]) => {
      const sorted = [...list].sort((a, b) => a.queueNumber - b.queueNumber);
      if (!searchQuery.trim()) return sorted;
      const q = searchQuery.trim().toLowerCase();
      return sorted.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.patientCode.toLowerCase().includes(q) ||
          a.appointmentCode.toLowerCase().includes(q) ||
          String(a.queueNumber).includes(q) ||
          (a.chiefComplaint || '').toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const summaryStats = useMemo(() => {
    if (!queueData) return { total: 0, waiting: 0, inProgress: 0, completed: 0 };
    const m = queueData.morning.stats;
    const a = queueData.afternoon.stats;
    if (sessionFilter === 'MORNING') return m;
    if (sessionFilter === 'AFTERNOON') return a;
    return {
      total: m.total + a.total,
      waiting: m.waiting + a.waiting,
      inProgress: m.inProgress + a.inProgress,
      completed: m.completed + a.completed,
    };
  }, [queueData, sessionFilter]);

  const renderSessionSection = (sessionKey: SessionType, sessionData: DoctorQueueSessionDto) => {
    const filteredList = filterAppointments(sessionData.appointments || []);
    const { currentServing, nextWaiting, schedule, stats } = sessionData;
    const isMorning = sessionKey === 'MORNING';

    return (
      <Card key={sessionKey} className="overflow-hidden">
        <CardHeader className="bg-[#EDF3FB] flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                isMorning
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-[#DCEAFB] text-[#1D5BB8] border border-[#9EC0EC]'
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{getSessionLabel(sessionKey)}</CardTitle>
                {schedule ? (
                  <Badge variant={schedule.isAvailable ? 'emerald' : 'slate'} size="sm" dot>
                    {schedule.isAvailable
                      ? `Mở nhận • ${schedule.bookedCount}/${schedule.maxPatients} lượt`
                      : 'Tạm ngưng nhận'}
                  </Badge>
                ) : (
                  <Badge variant="slate" size="sm">
                    Chưa cấu hình lịch
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Chờ khám: <strong className="text-slate-700">{stats.waiting}</strong> • Đang khám:{' '}
                <strong className="text-slate-700">{stats.inProgress}</strong> • Hoàn thành:{' '}
                <strong className="text-slate-700">{stats.completed}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Megaphone className="h-4 w-4" />}
            loading={busyKey === `call-next-${sessionKey}`}
            disabled={!nextWaiting}
            onClick={() => handleCallNext(sessionKey, Boolean(currentServing))}
          >
            {currentServing ? 'Hoàn tất & Gọi số tiếp theo' : 'Gọi số tiếp theo'}
            {nextWaiting ? ` (${formatQueueNumber(nextWaiting.queueNumber)})` : ''}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current serving highlight */}
          {currentServing && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#DCEAFB] to-[#EDF3FB] border border-[#9EC0EC] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-[#1D5BB8] text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase opacity-80">STT</span>
                  <span className="text-lg font-extrabold leading-none">
                    {formatQueueNumber(currentServing.queueNumber)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1D5BB8]">
                      Đang khám hiện tại
                    </span>
                    <AppointmentStatusBadge status={currentServing.status} />
                    {currentServing.isPriority && (
                      <Badge variant="rose" size="sm">
                        Ưu tiên
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {currentServing.patientName}{' '}
                    <span className="text-xs font-semibold text-slate-600">
                      ({currentServing.patientCode})
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                    {currentServing.chiefComplaint || 'Chưa ghi nhận lý do khám'} • Giờ dự kiến:{' '}
                    {currentServing.estimatedTime}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Stethoscope className="h-4 w-4" />}
                  onClick={() =>
                    navigate(`/doctor/exam/${currentServing.id}?date=${selectedDate}`, {
                      state: { appointment: currentServing },
                    })
                  }
                >
                  Mở phòng khám & Kê đơn
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  loading={busyKey === `${currentServing.id}-COMPLETE`}
                  onClick={() => handleStatusChange(currentServing, 'COMPLETE')}
                >
                  Hoàn thành
                </Button>
              </div>
            </div>
          )}

          {/* Queue list */}
          {filteredList.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Chưa có lượt khám trong buổi này"
              description={
                searchQuery
                  ? 'Không tìm thấy bệnh nhân khớp với từ khóa tìm kiếm.'
                  : 'Khi bệnh nhân đặt lịch hoặc điều dưỡng tiếp nhận tại quầy, danh sách STT sẽ hiển thị tại đây.'
              }
            />
          ) : (
            <div className="divide-y divide-[#C7D6EA] border border-[#C7D6EA] rounded-2xl overflow-hidden bg-white">
              {filteredList.map((apt) => {
                const isServing = apt.status === 'IN_PROGRESS';
                const canStart = apt.status === 'BOOKED' || apt.status === 'CHECKED_IN';
                return (
                  <div
                    key={apt.id}
                    className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ${
                      isServing ? 'bg-[#DCEAFB]/40' : 'hover:bg-[#EDF3FB]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-extrabold border ${
                          isServing
                            ? 'bg-[#1D5BB8] text-white border-[#1D5BB8]'
                            : apt.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'
                                ? 'bg-slate-100 text-slate-600 border-slate-300'
                                : 'bg-[#EDF3FB] text-[#1D5BB8] border-[#9EC0EC]'
                        }`}
                      >
                        <span className="text-sm">{formatQueueNumber(apt.queueNumber)}</span>
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
                              Ưu tiên
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                          <span>Mã hẹn: {apt.appointmentCode}</span>
                          <span>Dự kiến: {apt.estimatedTime}</span>
                          {apt.patientPhone && <span>SĐT: {apt.patientPhone}</span>}
                          {apt.hasNursingProcedure ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5" /> Đã đo sinh hiệu
                            </span>
                          ) : (
                            <span className="text-amber-800 font-medium">Chưa đo sinh hiệu</span>
                          )}
                          {apt.hasMedicalRecord && (
                            <span className="text-[#1D5BB8] font-semibold inline-flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" /> Đã có bệnh án
                            </span>
                          )}
                        </div>

                        {apt.chiefComplaint && (
                          <p className="text-xs text-slate-700 mt-1.5 bg-[#EDF3FB] px-3 py-1.5 rounded-lg border border-[#C7D6EA]">
                            <strong>Triệu chứng ban đầu:</strong> {apt.chiefComplaint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
                      {canStart && (
                        <>
                          <Button
                            variant="primary"
                            size="xs"
                            leftIcon={<Play className="h-3.5 w-3.5" />}
                            loading={busyKey === `${apt.id}-START`}
                            onClick={async () => {
                              await handleStatusChange(apt, 'START');
                              navigate(`/doctor/exam/${apt.id}?date=${selectedDate}`, {
                                state: { appointment: apt },
                              });
                            }}
                          >
                            Bắt đầu khám
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={<UserX className="h-3.5 w-3.5" />}
                            loading={busyKey === `${apt.id}-NO_SHOW`}
                            onClick={() => handleStatusChange(apt, 'NO_SHOW')}
                          >
                            Vắng mặt
                          </Button>
                        </>
                      )}

                      {isServing && (
                        <>
                          <Button
                            variant="primary"
                            size="xs"
                            leftIcon={<Stethoscope className="h-3.5 w-3.5" />}
                            onClick={() =>
                              navigate(`/doctor/exam/${apt.id}?date=${selectedDate}`, {
                                state: { appointment: apt },
                              })
                            }
                          >
                            Khám & Kê đơn
                          </Button>
                          <Button
                            variant="success"
                            size="xs"
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            loading={busyKey === `${apt.id}-COMPLETE`}
                            onClick={() => handleStatusChange(apt, 'COMPLETE')}
                          >
                            Hoàn tất
                          </Button>
                        </>
                      )}

                      {apt.status === 'COMPLETED' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          leftIcon={<FileText className="h-3.5 w-3.5" />}
                          onClick={() =>
                            navigate(`/doctor/exam/${apt.id}?date=${selectedDate}`, {
                              state: { appointment: apt },
                            })
                          }
                        >
                          Xem hồ sơ khám
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Hàng đợi Khám bệnh
            </h2>
            {user?.doctorProfile && (
              <Badge variant="blue">
                {user.doctorProfile.departmentName}
                {user.doctorProfile.roomName ? ` • ${user.doctorProfile.roomName}` : ''}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Quản lý lượt khám theo Buổi Sáng / Buổi Chiều, sắp xếp theo Số thứ tự (STT) ngày{' '}
            <strong className="text-slate-700">{formatDateVN(selectedDate)}</strong>.
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
            onClick={() => void loadQueue()}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Tổng lượt hôm nay</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{summaryStats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#DCEAFB] text-[#1D5BB8] flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Đang chờ khám</p>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">{summaryStats.waiting}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Đang trong phòng</p>
              <p className="text-2xl font-extrabold text-[#1D5BB8] mt-1">
                {summaryStats.inProgress}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#DCEAFB] text-[#1D5BB8] flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Đã hoàn thành</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {summaryStats.completed}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          activeId={sessionFilter}
          onChange={(id) => setSessionFilter(id as SessionFilter)}
          items={[
            { id: 'ALL', label: 'Cả ngày' },
            { id: 'MORNING', label: 'Buổi Sáng (07:30 - 11:30)' },
            { id: 'AFTERNOON', label: 'Buổi Chiều (13:30 - 17:00)' },
          ]}
        />
        <div className="w-full sm:w-72">
          <Input
            placeholder="Tìm tên, mã BN, STT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {loading ? (
        <Spinner label="Đang tải hàng đợi khám..." />
      ) : !queueData ? (
        <EmptyState
          title="Không có dữ liệu hàng đợi"
          description="Vui lòng thử làm mới hoặc chọn ngày khác."
        />
      ) : (
        <div className="space-y-6">
          {(sessionFilter === 'ALL' || sessionFilter === 'MORNING') &&
            renderSessionSection('MORNING', queueData.morning)}
          {(sessionFilter === 'ALL' || sessionFilter === 'AFTERNOON') &&
            renderSessionSection('AFTERNOON', queueData.afternoon)}
        </div>
      )}
    </div>
  );
};
