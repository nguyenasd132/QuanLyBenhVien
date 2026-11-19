import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Pill,
  Stethoscope,
  Users,
} from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminAppointmentsPage } from './AdminAppointmentsPage';
import { AdminPatientsPage } from './AdminPatientsPage';
import { AdminStaffPage } from './AdminStaffPage';
import { AdminFacilitiesPage } from './AdminFacilitiesPage';
import { AdminRecordsPage } from './AdminRecordsPage';
import { AdminCatalogPage } from './AdminCatalogPage';
import { AdminReportsPage } from './AdminReportsPage';

const adminNavItems: NavItem[] = [
  {
    to: '/admin',
    label: 'Tổng quan bệnh viện',
    shortLabel: 'Tổng quan',
    icon: <LayoutDashboard className="h-5 w-5" />,
    end: true,
  },
  {
    to: '/admin/appointments',
    label: 'Lịch hẹn',
    shortLabel: 'Lịch hẹn',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    to: '/admin/patients',
    label: 'Bệnh nhân',
    shortLabel: 'Bệnh nhân',
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: '/admin/staff',
    label: 'Bác sĩ & Điều dưỡng',
    shortLabel: 'Nhân sự',
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    to: '/admin/facilities',
    label: 'Khoa & Phòng',
    shortLabel: 'Khoa/Phòng',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    to: '/admin/records',
    label: 'Hồ sơ bệnh án',
    shortLabel: 'Bệnh án',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: '/admin/catalog',
    label: 'Danh mục Thuốc & DV',
    shortLabel: 'Danh mục',
    icon: <Pill className="h-5 w-5" />,
  },
  {
    to: '/admin/reports',
    label: 'Báo cáo & Doanh thu',
    shortLabel: 'Báo cáo',
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

const adminMobileNavItems: NavItem[] = [
  adminNavItems[0],
  adminNavItems[1],
  adminNavItems[2],
  adminNavItems[3],
  adminNavItems[7],
];

export const AdminRoutes: React.FC = () => {
  return (
    <AppShell
      portalTitle="Giám đốc Bệnh viện"
      portalSubtitle="Hệ thống Quản trị An Tâm"
      navItems={adminNavItems}
      mobileNavItems={adminMobileNavItems}
    >
      <Routes>
        <Route index element={<AdminDashboardPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="patients" element={<AdminPatientsPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="facilities" element={<AdminFacilitiesPage />} />
        <Route path="records" element={<AdminRecordsPage />} />
        <Route path="catalog" element={<AdminCatalogPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
};
