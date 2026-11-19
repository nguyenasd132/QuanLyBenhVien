import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarPlus,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  HelpCircle,
  MapPin,
  PhoneCall,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi, patientApi } from '@/lib/api';
import {
  formatCurrencyVND,
  formatDateTimeVN,
  formatDateVN,
  formatQueueNumber,
  getSessionLabel,
} from '@/lib/format';
import type { AppointmentDto, InvoiceDto, NotificationDto } from '@/types';
import {
  Alert,
  AppointmentStatusBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
} from '@/components/ui';

function getShortGreetingName(fullName?: string): string {
  if (!fullName) return 'bạn';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts.slice(-2).join(' ');
  }
  return parts[0];
}

export const PatientHomePage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [appts, invs, notifs] = await Promise.all([
          patientApi.getAppointments(),
          patientApi.getInvoices({ status: 'UNPAID' }),
          notificationsApi.list({ limit: 5 }),
        ]);
        setAppointments(appts);
        setInvoices(invs);
        setNotifications(notifs.items || []);
      } catch {
        // gracefully render with partial data
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const upcomingAppointments = appointments.filter((a) =>
    ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
  );
  const nextAppointment = upcomingAppointments[0] || null;
  const latestAppointment = appointments[0] || null;
  const unpaidTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const serviceTiles = [
    {
      title: 'Đặt lịch khám',
      desc: '3 luồng theo khoa, bác sĩ, ngày',
      to: '/patient/book',
      icon: <CalendarPlus className="h-5 w-5" />,
      tone: 'bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC]',
    },
    {
      title: 'Lịch hẹn của tôi',
      desc: 'Theo dõi STT & đổi/hủy lịch',
      to: '/patient/appointments',
      icon: <CalendarCheck className="h-5 w-5" />,
      tone: 'bg-teal-100 text-teal-800 border border-teal-300',
    },
    {
      title: 'Hồ sơ sức khỏe',
      desc: 'Dị ứng, bệnh nền & BHYT',
      to: '/patient/profile',
      icon: <HeartPulse className="h-5 w-5" />,
      tone: 'bg-rose-100 text-rose-800 border border-rose-300',
    },
    {
      title: 'Kết quả khám',
      desc: 'Chẩn đoán, xét nghiệm & đơn thuốc',
      to: '/patient/records',
      icon: <FileText className="h-5 w-5" />,
      tone: 'bg-violet-100 text-violet-800 border border-violet-300',
    },
    {
      title: 'Thanh toán',
      desc: 'Viện phí, đơn thuốc & QR',
      to: '/patient/billing',
      icon: <CreditCard className="h-5 w-5" />,
      tone: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    {
      title: 'Tìm bác sĩ',
      desc: 'Danh bạ bác sĩ & phòng khám',
      to: '/patient/doctors',
      icon: <Stethoscope className="h-5 w-5" />,
      tone: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    },
  ];

  const handleMarkNotifRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Chào {getShortGreetingName(user?.fullName)}
            </h1>
            <Sparkles className="h-5 w-5 text-[#1D5BB8]" />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Mã bệnh nhân:{' '}
            <span className="font-bold text-[#1D5BB8]">
              {user?.patientProfile?.patientCode || 'Đang cập nhật'}
            </span>{' '}
            • Chúc bạn một ngày nhiều sức khỏe tại Bệnh viện An Tâm.
          </p>
        </div>

        <Link to="/patient/book" className="self-start sm:self-auto">
          <Button leftIcon={<CalendarPlus className="h-4 w-4" />}>Đặt lịch khám ngay</Button>
        </Link>
      </div>

      {/* Unpaid Invoice Alert */}
      {invoices.length > 0 && (
        <Alert
          variant="warning"
          title={`Bạn có ${invoices.length} hóa đơn chưa thanh toán (${formatCurrencyVND(unpaidTotal)})`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
            <span>Thanh toán qua QR chuyển khoản hoặc tại quầy để hoàn tất thủ tục.</span>
            <Link to="/patient/billing" className="font-bold underline text-amber-900">
              Thanh toán ngay →
            </Link>
          </div>
        </Alert>
      )}

      {/* Hero CTA + Upcoming Appointment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#1D5BB8] via-[#164996] to-[#0F3570] text-white p-6 shadow-card relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-xs font-semibold">
              Đặt lịch khám ngoại trú
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold mt-3">
              Đặt lịch khám ngay — Nhận STT tự động theo Buổi
            </h2>
            <p className="text-white/95 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
              Linh hoạt chọn theo Chuyên khoa (Nội tổng quát, Tim mạch, Nhi khoa...), theo Bác sĩ
              hoặc theo Ngày khám với khung Buổi Sáng (07:30-11:30) và Buổi Chiều (13:30-17:00).
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 mt-6">
            <Link to="/patient/book?flow=BY_DEPARTMENT">
              <Button className="bg-white text-[#15458E] hover:bg-blue-50 font-bold">
                Đặt lịch khám ngay
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/patient/book?flow=BY_DOCTOR">
              <Button className="bg-white/15 text-white hover:bg-white/25 border border-white/30">
                Chọn theo bác sĩ
              </Button>
            </Link>
          </div>
        </div>

        <Card padding="md" className="lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-slate-900">Lịch hẹn sắp tới</h2>
            <Link
              to="/patient/appointments"
              className="text-xs font-semibold text-[#1D5BB8] hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          {loading ? (
            <Spinner />
          ) : nextAppointment ? (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-600 uppercase">
                    Số thứ tự của bạn
                  </p>
                  <p className="text-3xl font-extrabold text-[#1D5BB8] leading-tight">
                    {formatQueueNumber(nextAppointment.queueNumber)}
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Giờ dự kiến: <span className="font-bold">{nextAppointment.estimatedTime}</span>
                    {nextAppointment.liveCurrentStt ? (
                      <span className="ml-2 text-emerald-800 font-semibold">
                        • Đang khám {formatQueueNumber(nextAppointment.liveCurrentStt)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <AppointmentStatusBadge status={nextAppointment.status} />
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                <p className="font-bold text-slate-900">
                  {nextAppointment.doctorTitle ? `${nextAppointment.doctorTitle} ` : ''}
                  {nextAppointment.doctorName} • {nextAppointment.departmentName}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#1D5BB8]" />
                    {formatDateVN(nextAppointment.appointmentDate)} •{' '}
                    {getSessionLabel(nextAppointment.session)}
                  </span>
                  {nextAppointment.roomName && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#1D5BB8]" />
                      {nextAppointment.roomName}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600">
                  Mã check-in:{' '}
                  <strong className="text-slate-900">{nextAppointment.appointmentCode}</strong>
                </span>
                <Link to="/patient/appointments">
                  <Button size="xs" variant="secondary">
                    Quản lý lịch
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<CalendarCheck className="h-5 w-5" />}
              title="Chưa có lịch hẹn sắp tới"
              description="Đặt lịch ngay để nhận số thứ tự khám ưu tiên."
              action={
                <Link to="/patient/book">
                  <Button size="sm">Đặt lịch ngay</Button>
                </Link>
              }
            />
          )}
        </Card>
      </div>

      {/* 6-Tile Service Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Tiện ích Cổng Sức khỏe</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {serviceTiles.map((tile) => (
            <Link key={tile.to} to={tile.to} className="group">
              <Card
                hoverable
                padding="sm"
                className="h-full flex flex-col justify-between gap-3 group-hover:-translate-y-0.5"
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${tile.tone}`}
                >
                  {tile.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-[#1D5BB8] transition-colors">
                    {tile.title}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{tile.desc}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Appointment + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card padding="md" className="lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Lịch hẹn gần nhất</h2>
            <Link
              to="/patient/appointments"
              className="text-xs font-semibold text-[#1D5BB8] hover:underline"
            >
              Lịch sử khám
            </Link>
          </div>
          {loading ? (
            <Spinner />
          ) : latestAppointment ? (
            <div className="p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="blue">{formatQueueNumber(latestAppointment.queueNumber)}</Badge>
                  <span className="text-xs font-bold text-slate-800">
                    {latestAppointment.appointmentCode}
                  </span>
                </div>
                <AppointmentStatusBadge status={latestAppointment.status} />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {latestAppointment.departmentName} • {latestAppointment.doctorName}
              </p>
              <p className="text-xs text-slate-600">
                {formatDateVN(latestAppointment.appointmentDate)} •{' '}
                {getSessionLabel(latestAppointment.session)} ({latestAppointment.estimatedTime})
              </p>
              {latestAppointment.chiefComplaint && (
                <p className="text-xs text-slate-700 bg-white rounded-xl p-2.5 border border-[#C7D6EA]">
                  Triệu chứng: {latestAppointment.chiefComplaint}
                </p>
              )}
              {latestAppointment.hasMedicalRecord && (
                <Link to="/patient/records" className="inline-block pt-1">
                  <Button size="xs" variant="secondary">
                    Xem kết quả khám & đơn thuốc
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <EmptyState
              title="Chưa có lịch hẹn nào"
              description="Các lịch hẹn đã đặt hoặc hoàn thành sẽ xuất hiện tại đây."
            />
          )}
        </Card>

        <Card padding="md" className="lg:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#1D5BB8]" />
              Thông báo
            </h2>
            <span className="text-xs text-slate-600">
              {notifications.filter((n) => !n.isRead).length} chưa đọc
            </span>
          </div>

          {loading ? (
            <Spinner />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-5 w-5" />}
              title="Không có thông báo mới"
              description="Thông báo gọi số STT, kết quả khám và thanh toán sẽ hiển thị tại đây."
            />
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    if (!notif.isRead) void handleMarkNotifRead(notif.id);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-2.5 ${
                    notif.isRead
                      ? 'bg-white border-[#C7D6EA]'
                      : 'bg-[#DCEAFB]/65 border-[#9EC0EC]'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      notif.isRead ? 'bg-slate-400' : 'bg-[#1D5BB8]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{notif.title}</p>
                    <p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {formatDateTimeVN(notif.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Support Box */}
      <Card padding="md" className="bg-gradient-to-r from-white to-[#DCEAFB]/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC] flex items-center justify-center shrink-0">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Trung tâm trợ giúp An Tâm</h3>
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                Cần hỗ trợ đặt lịch, hướng dẫn check-in hoặc đối soát BHYT? Liên hệ tổng đài{' '}
                <strong className="text-[#1D5BB8]">1900 6868</strong> hoặc xem hướng dẫn chi tiết.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="tel:19006868">
              <Button variant="outline" size="sm" leftIcon={<PhoneCall className="h-4 w-4" />}>
                1900 6868
              </Button>
            </a>
            <Link to="/patient/help">
              <Button size="sm">Mở Trợ giúp</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};
