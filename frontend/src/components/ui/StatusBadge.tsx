import React from 'react';
import { Badge, type BadgeVariant } from './Badge';

const appointmentStatusMap: Record<string, { label: string; variant: BadgeVariant; dot?: boolean; pulse?: boolean }> = {
  BOOKED: { label: 'Đã đặt lịch', variant: 'blue', dot: true },
  CHECKED_IN: { label: 'Đã check-in', variant: 'amber', dot: true },
  IN_PROGRESS: { label: 'Đang khám', variant: 'teal', dot: true, pulse: true },
  COMPLETED: { label: 'Hoàn thành', variant: 'emerald' },
  CANCELLED: { label: 'Đã hủy', variant: 'rose' },
  NO_SHOW: { label: 'Vắng mặt', variant: 'slate' },
};

const invoiceStatusMap: Record<string, { label: string; variant: BadgeVariant; dot?: boolean }> = {
  UNPAID: { label: 'Chưa thanh toán', variant: 'amber', dot: true },
  PENDING_VERIFICATION: { label: 'Chờ điều dưỡng xác nhận', variant: 'blue', dot: true },
  PAID: { label: 'Đã thanh toán', variant: 'emerald' },
  CANCELLED: { label: 'Đã hủy', variant: 'slate' },
};

const prescriptionStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', variant: 'amber' },
  PAID: { label: 'Đã thanh toán • Chờ cấp thuốc', variant: 'blue' },
  DISPENSED: { label: 'Đã cấp thuốc', variant: 'emerald' },
  CANCELLED: { label: 'Đã hủy', variant: 'slate' },
};

const bedStatusMap: Record<string, { label: string; variant: BadgeVariant; dot?: boolean }> = {
  AVAILABLE: { label: 'Trống', variant: 'emerald', dot: true },
  OCCUPIED: { label: 'Đang sử dụng', variant: 'blue', dot: true },
  MAINTENANCE: { label: 'Bảo trì', variant: 'amber', dot: true },
};

const bookingTypeMap: Record<string, { label: string; variant: BadgeVariant }> = {
  ONLINE: { label: 'Đặt trực tuyến', variant: 'blue' },
  WALK_IN: { label: 'Tại quầy', variant: 'violet' },
  FOLLOW_UP: { label: 'Tái khám', variant: 'teal' },
};

export const AppointmentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = appointmentStatusMap[status] || { label: status, variant: 'slate' as BadgeVariant };
  return (
    <Badge variant={cfg.variant} dot={cfg.dot} pulse={cfg.pulse}>
      {cfg.label}
    </Badge>
  );
};

export const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = invoiceStatusMap[status] || { label: status, variant: 'slate' as BadgeVariant };
  return (
    <Badge variant={cfg.variant} dot={cfg.dot}>
      {cfg.label}
    </Badge>
  );
};

export const PrescriptionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = prescriptionStatusMap[status] || { label: status, variant: 'slate' as BadgeVariant };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export const BedStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = bedStatusMap[status] || { label: status, variant: 'slate' as BadgeVariant };
  return (
    <Badge variant={cfg.variant} dot={cfg.dot}>
      {cfg.label}
    </Badge>
  );
};

export const BookingTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const cfg = bookingTypeMap[type] || { label: type, variant: 'slate' as BadgeVariant };
  return (
    <Badge variant={cfg.variant} size="sm">
      {cfg.label}
    </Badge>
  );
};
