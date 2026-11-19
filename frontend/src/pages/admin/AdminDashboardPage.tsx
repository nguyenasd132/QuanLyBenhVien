import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BedDouble,
  Calendar,
  CalendarCheck2,
  CircleDollarSign,
  Download,
  RefreshCw,
  Search,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import {
  formatCurrencyVND,
  formatDateVN,
  formatNumberVN,
  formatQueueNumber,
  getSessionShortLabel,
  getTodayISODate,
} from '@/lib/format';
import type { AdminDashboardDto } from '@/types';
import {
  AppointmentStatusBadge,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Spinner,
  Table,
  Tabs,
  useToast,
} from '@/components/ui';
import {
  BedOccupancyDonutChart,
  RevenueBreakdownChart,
  VisitsComparisonChart,
} from '@/components/charts';

type TodayApptTab = 'ALL' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';

export const AdminDashboardPage: React.FC = () => {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate());
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apptTab, setApptTab] = useState<TodayApptTab>('ALL');
  const [apptSearch, setApptSearch] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard(selectedDate);
      setData(res);
    } catch (err) {
      toast.error(
        'Không thể tải dữ liệu tổng quan',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredAppointments = useMemo(() => {
    if (!data) return [];
    let list = data.todayAppointmentsList || [];
    if (apptTab === 'UPCOMING') {
      list = list.filter((a) => a.status === 'BOOKED' || a.status === 'CHECKED_IN');
    } else if (apptTab === 'IN_PROGRESS') {
      list = list.filter((a) => a.status === 'IN_PROGRESS');
    } else if (apptTab === 'COMPLETED') {
      list = list.filter((a) => a.status === 'COMPLETED');
    }
    if (apptSearch.trim()) {
      const q = apptSearch.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patientName.toLowerCase().includes(q) ||
          a.patientCode.toLowerCase().includes(q) ||
          a.doctorName.toLowerCase().includes(q) ||
          a.departmentName.toLowerCase().includes(q) ||
          a.appointmentCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, apptTab, apptSearch]);

  const handleQuickExport = async () => {
    setExporting(true);
    try {
      await adminApi.exportCsvReport('appointments', {
        from: selectedDate,
        to: selectedDate,
      });
      toast.success('Đã xuất báo cáo CSV lượt khám trong ngày');
    } catch (err) {
      toast.error(
        'Xuất báo cáo thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return <Spinner label="Đang tổng hợp số liệu toàn bệnh viện..." />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Không có dữ liệu tổng quan"
        action={
          <Button variant="primary" onClick={() => void loadDashboard()}>
            Tải lại
          </Button>
        }
      />
    );
  }

  const { kpis, revenueSummary } = data;
  const pctPositive = kpis.todayVisits.percentChange >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tổng quan Bệnh viện An Tâm
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Bảng điều hành trực quan theo thời gian thực ngày{' '}
            <strong className="text-slate-700">{formatDateVN(data.date || selectedDate)}</strong>.
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
            loading={loading}
            onClick={() => void loadDashboard()}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            loading={exporting}
            onClick={() => void handleQuickExport()}
          >
            Xuất CSV ngày
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Lượt khám hôm nay */}
        <Card padding="md" hoverable>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Lượt khám hôm nay</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                {formatNumberVN(kpis.todayVisits.count)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    pctPositive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {pctPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {pctPositive ? `+${kpis.todayVisits.percentChange}%` : `${kpis.todayVisits.percentChange}%`}
                </span>
                <span className="text-[11px] text-slate-600">
                  so với hôm qua ({kpis.todayVisits.yesterdayCount})
                </span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-[#DCEAFB] text-[#1D5BB8] flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* KPI 2: Lịch hẹn hôm nay */}
        <Card padding="md" hoverable>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Lịch hẹn hôm nay</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                {formatNumberVN(kpis.todayAppointments.total)}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Sắp tới:{' '}
                <strong className="text-[#1D5BB8]">{kpis.todayAppointments.upcoming}</strong> •
                Hoàn thành:{' '}
                <strong className="text-emerald-700">{kpis.todayAppointments.completed}</strong>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* KPI 3: Bác sĩ đang trực */}
        <Card padding="md" hoverable>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-600">Bác sĩ đang trực</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                {kpis.onDutyDoctors.count}
                <span className="text-sm font-semibold text-slate-600">
                  /{kpis.onDutyDoctors.totalDoctors}
                </span>
              </p>
              <p className="text-[11px] text-slate-600 mt-2 truncate">
                {kpis.onDutyDoctors.byDepartment
                  .slice(0, 3)
                  .map((d) => `${d.departmentName}: ${d.count}`)
                  .join(' • ') || 'Theo các chuyên khoa'}
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* KPI 4: Giường đang sử dụng */}
        <Card padding="md" hoverable>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Giường đang sử dụng</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                {kpis.bedOccupancy.occupancyRate}%
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Đang dùng:{' '}
                <strong className="text-slate-800">
                  {kpis.bedOccupancy.occupied}/{kpis.bedOccupancy.total}
                </strong>{' '}
                • Trống:{' '}
                <strong className="text-emerald-700">{kpis.bedOccupancy.available}</strong>
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <BedDouble className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: 7-day Visits Comparison Chart + On-duty Doctors List */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>Lượt khám 7 ngày qua</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                So sánh lưu lượng khám 7 ngày gần nhất với 7 ngày trước đó
              </p>
            </div>
            <Badge variant="blue">Cập nhật theo dữ liệu thực</Badge>
          </CardHeader>
          <CardContent>
            <VisitsComparisonChart data={data.visitsComparison7Days || []} height={290} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-4 flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Bác sĩ đang trực</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                {data.onDutyDoctorsList.length} bác sĩ đang hoạt động
              </p>
            </div>
            <Link
              to="/admin/staff"
              className="text-xs font-semibold text-[#1D5BB8] hover:underline inline-flex items-center gap-0.5"
            >
              Quản lý <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 flex-1 space-y-2.5 max-h-[340px] overflow-y-auto scrollbar-thin">
            {data.onDutyDoctorsList.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">
                Chưa có bác sĩ trong ca trực.
              </p>
            ) : (
              data.onDutyDoctorsList.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {doc.isOnDuty && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          doc.isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {doc.title ? `${doc.title} ` : ''}
                        {doc.fullName}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate">
                        {doc.departmentName}
                        {doc.roomName ? ` • ${doc.roomName}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="blue" size="sm">
                    {doc.todayQueueCount} lượt
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Today's Appointments Table + Bed Occupancy Donut & Dept Bars */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="xl:col-span-7">
          <CardHeader className="flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <CardTitle>Lịch hẹn hôm nay</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Danh sách lượt khám & tiến độ phục vụ trong ngày
              </p>
            </div>
            <div className="w-full sm:w-56">
              <Input
                placeholder="Tìm BN, bác sĩ, mã..."
                value={apptSearch}
                onChange={(e) => setApptSearch(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5" />}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Tabs
              activeId={apptTab}
              onChange={(id) => setApptTab(id as TodayApptTab)}
              items={[
                { id: 'ALL', label: 'Tất cả', count: data.todayAppointmentsList.length },
                { id: 'UPCOMING', label: 'Sắp tới', count: kpis.todayAppointments.upcoming },
                {
                  id: 'IN_PROGRESS',
                  label: 'Đang khám',
                  count: kpis.todayAppointments.inProgress,
                },
                { id: 'COMPLETED', label: 'Hoàn thành', count: kpis.todayAppointments.completed },
              ]}
            />

            <Table
              data={filteredAppointments.slice(0, 10)}
              rowKey={(row) => row.id}
              emptyState={
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="Không có lịch hẹn khớp bộ lọc"
                />
              }
              columns={[
                {
                  key: 'stt',
                  header: 'STT',
                  render: (row) => (
                    <span className="font-extrabold text-[#1D5BB8]">
                      {formatQueueNumber(row.queueNumber)}
                    </span>
                  ),
                },
                {
                  key: 'patient',
                  header: 'Bệnh nhân',
                  render: (row) => (
                    <div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        {row.patientName}
                      </p>
                      <p className="text-[11px] text-slate-600">{row.patientCode}</p>
                    </div>
                  ),
                },
                {
                  key: 'doctor',
                  header: 'Bác sĩ & Khoa',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{row.doctorName}</p>
                      <p className="text-[11px] text-slate-600">{row.departmentName}</p>
                    </div>
                  ),
                },
                {
                  key: 'session',
                  header: 'Buổi / Giờ',
                  render: (row) => (
                    <span className="text-xs text-slate-600">
                      {getSessionShortLabel(row.session)} • {row.estimatedTime}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (row) => <AppointmentStatusBadge status={row.status} />,
                },
              ]}
            />

            {filteredAppointments.length > 10 && (
              <div className="text-right">
                <Link
                  to="/admin/appointments"
                  className="text-xs font-semibold text-[#1D5BB8] hover:underline"
                >
                  Xem toàn bộ {filteredAppointments.length} lịch hẹn →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Công suất Giường bệnh</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Tỷ lệ sử dụng giường nội trú theo chuyên khoa
              </p>
            </div>
            <Link
              to="/admin/facilities"
              className="text-xs font-semibold text-[#1D5BB8] hover:underline"
            >
              Chi tiết
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <BedOccupancyDonutChart
              occupied={kpis.bedOccupancy.occupied}
              available={kpis.bedOccupancy.available}
              maintenance={kpis.bedOccupancy.maintenance}
              total={kpis.bedOccupancy.total}
              occupancyRate={kpis.bedOccupancy.occupancyRate}
              height={200}
            />

            <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D5BB8]" />
                Đang dùng ({kpis.bedOccupancy.occupied})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Trống ({kpis.bedOccupancy.available})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Bảo trì ({kpis.bedOccupancy.maintenance})
              </span>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#C7D6EA]">
              {data.bedOccupancyByDepartment.map((dept) => (
                <div key={dept.departmentId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{dept.departmentName}</span>
                    <span className="text-slate-600">
                      <strong>{dept.occupied}</strong>/{dept.total} ({dept.occupancyRate}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#DCEAFB] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        dept.occupancyRate >= 85
                          ? 'bg-rose-500'
                          : dept.occupancyRate >= 70
                            ? 'bg-[#1D5BB8]'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dept.occupancyRate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Revenue Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-[#1D5BB8]" />
            <div>
              <CardTitle>Phân tích Doanh thu & Viện phí</CardTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                Đối soát doanh thu khám/cận lâm sàng so với doanh thu quầy thuốc & công nợ chờ thu
              </p>
            </div>
          </div>
          <Link
            to="/admin/reports"
            className="text-xs font-semibold text-[#1D5BB8] hover:underline"
          >
            Trung tâm Báo cáo & Xuất CSV →
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <p className="text-xs text-slate-600 font-semibold">Doanh thu hôm nay</p>
              <p className="text-lg font-extrabold text-[#1D5BB8] mt-1">
                {formatCurrencyVND(revenueSummary.todayRevenue)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <p className="text-xs text-slate-600 font-semibold">Doanh thu tháng</p>
              <p className="text-lg font-extrabold text-slate-900 mt-1">
                {formatCurrencyVND(revenueSummary.monthRevenue)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300">
              <p className="text-xs text-emerald-800 font-semibold">Tổng đã thu</p>
              <p className="text-lg font-extrabold text-emerald-800 mt-1">
                {formatCurrencyVND(revenueSummary.totalPaid)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300">
              <p className="text-xs text-amber-800 font-semibold">Chờ thanh toán</p>
              <p className="text-lg font-extrabold text-amber-800 mt-1">
                {formatCurrencyVND(revenueSummary.totalUnpaid)}
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <RevenueBreakdownChart
              hospitalFeesPaid={revenueSummary.hospitalFeesPaid}
              prescriptionsPaid={revenueSummary.prescriptionsPaid}
              totalUnpaid={revenueSummary.totalUnpaid}
              height={220}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
