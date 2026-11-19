import React, { useCallback, useEffect, useState } from 'react';
import {
  BedDouble,
  Calendar,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrencyVND, getTodayISODate } from '@/lib/format';
import type { AdminDashboardDto } from '@/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  useToast,
} from '@/components/ui';
import { RevenueBreakdownChart } from '@/components/charts';

type ReportType = 'appointments' | 'revenue' | 'beds' | 'patients';

export const AdminReportsPage: React.FC = () => {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<AdminDashboardDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(getTodayISODate());
  const [exportingType, setExportingType] = useState<ReportType | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard(getTodayISODate());
      setDashboard(res);
    } catch (err) {
      toast.error(
        'Không thể tải số liệu báo cáo',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const handleExport = async (type: ReportType, title: string) => {
    setExportingType(type);
    try {
      await adminApi.exportCsvReport(type, { from: fromDate, to: toDate });
      toast.success(`Đã tải xuống ${title} (.csv)`);
    } catch (err) {
      toast.error(
        'Xuất CSV thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setExportingType(null);
    }
  };

  const reportCards: {
    type: ReportType;
    title: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
  }[] = [
    {
      type: 'appointments',
      title: 'Báo cáo Lượt khám & Lịch hẹn',
      description:
        'Bao gồm mã hẹn, STT, bệnh nhân, bác sĩ, chuyên khoa, buổi khám và trạng thái xử lý.',
      icon: <Calendar className="h-5 w-5" />,
      accent: 'bg-[#DCEAFB] text-[#1D5BB8]',
    },
    {
      type: 'revenue',
      title: 'Báo cáo Doanh thu & Hóa đơn',
      description:
        'Chi tiết hóa đơn viện phí & đơn thuốc, số tiền giảm BHYT, tổng thanh toán và trạng thái.',
      icon: <CircleDollarSign className="h-5 w-5" />,
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      type: 'beds',
      title: 'Báo cáo Công suất Giường bệnh',
      description:
        'Danh sách toàn bộ giường bệnh theo khoa, phòng, trạng thái sử dụng và bệnh nhân nội trú.',
      icon: <BedDouble className="h-5 w-5" />,
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      type: 'patients',
      title: 'Danh sách Hồ sơ Bệnh nhân',
      description:
        'Xuất danh bạ bệnh nhân gồm mã BN, họ tên, giới tính, ngày sinh, SĐT và thẻ BHYT.',
      icon: <Users className="h-5 w-5" />,
      accent: 'bg-amber-50 text-amber-800',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Trung tâm Báo cáo & Phân tích Tài chính
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Theo dõi doanh thu viện phí / dược phẩm và xuất dữ liệu CSV chuẩn UTF-8 phục vụ thống kê.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadAnalytics()}
        >
          Làm mới
        </Button>
      </div>

      {/* Export Date Range + Cards */}
      <Card>
        <CardHeader className="bg-[#EDF3FB]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#1D5BB8]" />
            <CardTitle>Xuất Báo cáo CSV theo Khoảng thời gian</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Input
              label="Từ ngày"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              label="Đến ngày"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportCards.map((rc) => (
              <div
                key={rc.type}
                className="p-4 rounded-2xl border border-[#C7D6EA] bg-[#EDF3FB] flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${rc.accent}`}
                  >
                    {rc.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{rc.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{rc.description}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={exportingType === rc.type}
                    leftIcon={<Download className="h-4 w-4" />}
                    onClick={() => void handleExport(rc.type, rc.title)}
                  >
                    Tải xuống CSV
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Analytics Detail */}
      {loading || !dashboard ? (
        <Spinner label="Đang tải thống kê doanh thu..." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tổng hợp Doanh thu Viện phí & Quầy thuốc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <p className="text-[11px] font-semibold text-slate-600">Hôm nay</p>
                <p className="text-sm sm:text-base font-extrabold text-[#1D5BB8] mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.todayRevenue)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <p className="text-[11px] font-semibold text-slate-600">Trong tháng</p>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.monthRevenue)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-300">
                <p className="text-[11px] font-semibold text-emerald-800">Tổng đã thu</p>
                <p className="text-sm sm:text-base font-extrabold text-emerald-800 mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.totalPaid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#DCEAFB] border border-[#9EC0EC]">
                <p className="text-[11px] font-semibold text-[#1D5BB8]">Viện phí đã thu</p>
                <p className="text-sm sm:text-base font-extrabold text-[#15458E] mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.hospitalFeesPaid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200">
                <p className="text-[11px] font-semibold text-teal-700">Đơn thuốc đã thu</p>
                <p className="text-sm sm:text-base font-extrabold text-teal-800 mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.prescriptionsPaid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300">
                <p className="text-[11px] font-semibold text-amber-800">Công nợ chờ thu</p>
                <p className="text-sm sm:text-base font-extrabold text-amber-800 mt-1">
                  {formatCurrencyVND(dashboard.revenueSummary.totalUnpaid)}
                </p>
              </div>
            </div>

            <RevenueBreakdownChart
              hospitalFeesPaid={dashboard.revenueSummary.hospitalFeesPaid}
              prescriptionsPaid={dashboard.revenueSummary.prescriptionsPaid}
              totalUnpaid={dashboard.revenueSummary.totalUnpaid}
              height={260}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
