import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarPlus,
  CreditCard,
  FileText,
  HeartPulse,
  HelpCircle,
  Home,
  Stethoscope,
} from 'lucide-react';
import { AppShell, type BreadcrumbItem, type NavItem } from '@/components/layout';
import { PatientHomePage } from './PatientHomePage';
import { BookingWizardPage } from './BookingWizardPage';
import { MyAppointmentsPage } from './MyAppointmentsPage';
import { HealthProfilePage } from './HealthProfilePage';
import { ExamResultsPage } from './ExamResultsPage';
import { BillingPage } from './BillingPage';
import { DoctorsDirectoryView, HelpCenterView } from '@/pages/public';

const patientNavItems: NavItem[] = [
  { to: '/patient', label: 'Trang chủ', shortLabel: 'Trang chủ', icon: <Home className="h-4 w-4" />, end: true },
  {
    to: '/patient/book',
    label: 'Đặt lịch khám',
    shortLabel: 'Đặt lịch',
    icon: <CalendarPlus className="h-4 w-4" />,
  },
  {
    to: '/patient/appointments',
    label: 'Lịch hẹn của tôi',
    shortLabel: 'Lịch hẹn',
    icon: <CalendarCheck className="h-4 w-4" />,
  },
  {
    to: '/patient/profile',
    label: 'Hồ sơ sức khỏe',
    shortLabel: 'Hồ sơ',
    icon: <HeartPulse className="h-4 w-4" />,
  },
  {
    to: '/patient/records',
    label: 'Kết quả khám',
    shortLabel: 'Kết quả',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    to: '/patient/billing',
    label: 'Thanh toán',
    shortLabel: 'Thanh toán',
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    to: '/patient/doctors',
    label: 'Tìm bác sĩ',
    shortLabel: 'Bác sĩ',
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    to: '/patient/help',
    label: 'Hỗ trợ',
    shortLabel: 'Hỗ trợ',
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

const patientMobileTabs: NavItem[] = [
  patientNavItems[0],
  patientNavItems[1],
  patientNavItems[2],
  patientNavItems[4],
  patientNavItems[5],
];

const breadcrumbLabels: Record<string, string> = {
  '/patient': 'Trang chủ',
  '/patient/book': 'Đặt lịch khám',
  '/patient/appointments': 'Lịch hẹn của tôi',
  '/patient/profile': 'Hồ sơ sức khỏe',
  '/patient/records': 'Kết quả khám & Đơn thuốc',
  '/patient/billing': 'Thanh toán',
  '/patient/doctors': 'Tìm bác sĩ',
  '/patient/help': 'Trung tâm trợ giúp',
};

export const PatientRoutes: React.FC = () => {
  const location = useLocation();
  const currentLabel = breadcrumbLabels[location.pathname];
  const breadcrumbs: BreadcrumbItem[] =
    location.pathname === '/patient' || !currentLabel
      ? [{ label: 'Cổng Bệnh nhân' }, { label: 'Trang chủ' }]
      : [{ label: 'Cổng Bệnh nhân', to: '/patient' }, { label: currentLabel }];

  return (
    <AppShell
      portalTitle="Cổng Bệnh nhân"
      portalSubtitle="An Tâm Health Portal"
      navItems={patientNavItems}
      mobileNavItems={patientMobileTabs}
      breadcrumbs={breadcrumbs}
    >
      <Routes>
        <Route index element={<PatientHomePage />} />
        <Route path="book" element={<BookingWizardPage />} />
        <Route path="appointments" element={<MyAppointmentsPage />} />
        <Route path="profile" element={<HealthProfilePage />} />
        <Route path="records" element={<ExamResultsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="doctors" element={<DoctorsDirectoryView embedded />} />
        <Route path="help" element={<HelpCenterView />} />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </AppShell>
  );
};
