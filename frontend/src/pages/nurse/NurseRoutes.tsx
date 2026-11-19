import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Banknote, BedDouble, ClipboardCheck } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout';
import { NurseReceptionPage } from './NurseReceptionPage';
import { NurseCashierPage } from './NurseCashierPage';
import { NurseBedsPage } from './NurseBedsPage';

const nurseNavItems: NavItem[] = [
  {
    to: '/nurse',
    label: 'Tiếp nhận & Sinh hiệu',
    shortLabel: 'Tiếp nhận',
    icon: <ClipboardCheck className="h-5 w-5" />,
    end: true,
  },
  {
    to: '/nurse/cashier',
    label: 'Thu ngân & Phát thuốc',
    shortLabel: 'Thu ngân',
    icon: <Banknote className="h-5 w-5" />,
  },
  {
    to: '/nurse/beds',
    label: 'Quản lý Giường bệnh',
    shortLabel: 'Giường bệnh',
    icon: <BedDouble className="h-5 w-5" />,
  },
];

export const NurseRoutes: React.FC = () => {
  return (
    <AppShell
      portalTitle="Cổng Điều dưỡng"
      portalSubtitle="Bệnh viện Đa khoa An Tâm"
      navItems={nurseNavItems}
    >
      <Routes>
        <Route index element={<NurseReceptionPage />} />
        <Route path="cashier" element={<NurseCashierPage />} />
        <Route path="beds" element={<NurseBedsPage />} />
        <Route path="*" element={<Navigate to="/nurse" replace />} />
      </Routes>
    </AppShell>
  );
};
