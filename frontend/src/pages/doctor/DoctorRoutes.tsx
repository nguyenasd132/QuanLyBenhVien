import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CalendarClock, ListOrdered, Stethoscope } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout';
import { DoctorQueuePage } from './DoctorQueuePage';
import { DoctorExamPage } from './DoctorExamPage';
import { DoctorSchedulePage } from './DoctorSchedulePage';

const doctorNavItems: NavItem[] = [
  {
    to: '/doctor',
    label: 'Hàng đợi khám',
    shortLabel: 'Hàng đợi',
    icon: <ListOrdered className="h-5 w-5" />,
    end: true,
  },
  {
    to: '/doctor/exam',
    label: 'Khám bệnh & Kê đơn',
    shortLabel: 'Khám bệnh',
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    to: '/doctor/schedules',
    label: 'Lịch làm việc',
    shortLabel: 'Lịch trực',
    icon: <CalendarClock className="h-5 w-5" />,
  },
];

export const DoctorRoutes: React.FC = () => {
  return (
    <AppShell
      portalTitle="Cổng Bác sĩ"
      portalSubtitle="Bệnh viện Đa khoa An Tâm"
      navItems={doctorNavItems}
    >
      <Routes>
        <Route index element={<DoctorQueuePage />} />
        <Route path="exam" element={<DoctorExamPage />} />
        <Route path="exam/:appointmentId" element={<DoctorExamPage />} />
        <Route path="schedules" element={<DoctorSchedulePage />} />
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Routes>
    </AppShell>
  );
};
