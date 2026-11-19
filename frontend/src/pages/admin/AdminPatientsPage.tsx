import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrencyVND, formatDateVN, formatQueueNumber } from '@/lib/format';
import type {
  AppointmentDto,
  InvoiceDto,
  MedicalRecordDto,
  PaginationMeta,
  PatientSummaryDto,
} from '@/types';
import {
  AppointmentStatusBadge,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  InvoiceStatusBadge,
  Modal,
  Spinner,
  Table,
  Tabs,
  useToast,
} from '@/components/ui';

export const AdminPatientsPage: React.FC = () => {
  const toast = useToast();

  const [patients, setPatients] = useState<PatientSummaryDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<{
    patient: PatientSummaryDto;
    appointments: AppointmentDto[];
    records: MedicalRecordDto[];
    invoices: InvoiceDto[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'RECORDS' | 'APPOINTMENTS' | 'INVOICES'>('RECORDS');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPatients({
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setPatients(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      toast.error(
        'Không thể tải danh sách bệnh nhân',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const handleOpenDetail = async (patientId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailTab('RECORDS');
    try {
      const res = await adminApi.getPatientDetail(patientId);
      const normalizedRecords =
        (res as { records?: MedicalRecordDto[]; medicalRecords?: MedicalRecordDto[] })
          .medicalRecords ??
        res.records ??
        [];
      setDetailData({
        ...res,
        records: normalizedRecords,
      });
    } catch (err) {
      toast.error(
        'Không thể tải hồ sơ chi tiết',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 15)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Danh bạ Bệnh nhân
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tra cứu thông tin hành chính, thẻ BHYT, dị ứng thuốc và lịch sử khám bệnh nhân.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadPatients()}
        >
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Tìm theo tên, mã BN (BN-08250), SĐT, BHYT..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <span className="text-xs font-semibold text-slate-600">
            Tổng số: <strong className="text-slate-900">{meta.total}</strong> hồ sơ bệnh nhân
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <Spinner label="Đang tải danh sách bệnh nhân..." />
      ) : (
        <div className="space-y-4">
          <Table
            data={patients}
            rowKey={(p) => p.id}
            emptyState={<EmptyState title="Không tìm thấy bệnh nhân phù hợp" />}
            columns={[
              {
                key: 'code',
                header: 'Mã BN',
                render: (p) => (
                  <span className="font-mono text-xs font-bold text-[#1D5BB8] bg-[#DCEAFB] px-2.5 py-1 rounded-lg">
                    {p.patientCode}
                  </span>
                ),
              },
              {
                key: 'name',
                header: 'Họ và tên',
                render: (p) => (
                  <div>
                    <p className="font-bold text-slate-900">{p.fullName}</p>
                    <p className="text-xs text-slate-600">{p.email}</p>
                  </div>
                ),
              },
              {
                key: 'demo',
                header: 'Ngày sinh / Giới tính',
                render: (p) => (
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">{formatDateVN(p.dateOfBirth)}</p>
                    <p className="text-slate-600">
                      {p.gender === 'MALE' ? 'Nam' : p.gender === 'FEMALE' ? 'Nữ' : 'Khác'} • Nhóm
                      máu: {p.bloodType || '—'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Liên hệ & BHYT',
                render: (p) => (
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">{p.phone || '—'}</p>
                    <p className="text-slate-600">BHYT: {p.insuranceNumber || 'Chưa cập nhật'}</p>
                  </div>
                ),
              },
              {
                key: 'alerts',
                header: 'Dị ứng / Bệnh nền',
                render: (p) => (
                  <div className="flex flex-wrap gap-1">
                    {p.allergies && p.allergies.length > 0 ? (
                      <Badge variant="rose" size="sm">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        {p.allergies.length} dị ứng
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm">
                        Không dị ứng
                      </Badge>
                    )}
                    {p.chronicConditions && p.chronicConditions.length > 0 && (
                      <Badge variant="amber" size="sm">
                        {p.chronicConditions.length} bệnh nền
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'action',
                header: '',
                render: (p) => (
                  <Button
                    variant="secondary"
                    size="xs"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => void handleOpenDetail(p.id)}
                  >
                    Chi tiết
                  </Button>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={page <= 1}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={page >= totalPages}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        size="xl"
        title="Hồ sơ Chi tiết Bệnh nhân"
      >
        {detailLoading || !detailData ? (
          <Spinner label="Đang tải hồ sơ bệnh nhân..." />
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#DCEAFB] text-[#1D5BB8] flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{detailData.patient.fullName}</p>
                  <p className="text-xs text-slate-600">
                    {detailData.patient.patientCode} • {detailData.patient.phone || '—'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Địa chỉ: {detailData.patient.address || '—'}
                  </p>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <p>
                  <strong>CCCD:</strong> {detailData.patient.nationalId || '—'}
                </p>
                <p>
                  <strong>Số thẻ BHYT:</strong> {detailData.patient.insuranceNumber || '—'}
                </p>
                <p>
                  <strong>Nhóm máu:</strong> {detailData.patient.bloodType || '—'}
                </p>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-rose-800">Dị ứng đã ghi nhận:</p>
                <p>
                  {detailData.patient.allergies.length > 0
                    ? detailData.patient.allergies.map((a) => a.name).join(', ')
                    : 'Không có'}
                </p>
                <p className="font-bold text-amber-800 pt-1">Bệnh nền:</p>
                <p>
                  {detailData.patient.chronicConditions.length > 0
                    ? detailData.patient.chronicConditions.map((c) => c.name).join(', ')
                    : 'Không có'}
                </p>
              </div>
            </div>

            <Tabs
              activeId={detailTab}
              onChange={(id) => setDetailTab(id as 'RECORDS' | 'APPOINTMENTS' | 'INVOICES')}
              items={[
                { id: 'RECORDS', label: 'Hồ sơ khám', count: detailData.records.length },
                { id: 'APPOINTMENTS', label: 'Lịch hẹn', count: detailData.appointments.length },
                { id: 'INVOICES', label: 'Hóa đơn', count: detailData.invoices.length },
              ]}
            />

            {detailTab === 'RECORDS' && (
              <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin">
                {detailData.records.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4">Chưa có bệnh án.</p>
                ) : (
                  detailData.records.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-[#C7D6EA] bg-white space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1D5BB8] flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {rec.recordCode} • {formatDateVN(rec.appointmentDate)}
                        </span>
                        <Badge variant="slate" size="sm">
                          {rec.departmentName}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {rec.diagnosis} {rec.icdCode ? `(${rec.icdCode})` : ''}
                      </p>
                      <p className="text-xs text-slate-600">Bác sĩ: {rec.doctorName}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'APPOINTMENTS' && (
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {detailData.appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-xl border border-[#C7D6EA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {formatQueueNumber(apt.queueNumber)} • {apt.doctorName} ({apt.departmentName})
                      </p>
                      <p className="text-slate-600">
                        {formatDateVN(apt.appointmentDate)} • {apt.appointmentCode}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'INVOICES' && (
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {detailData.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-[#C7D6EA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{inv.invoiceCode}</p>
                      <p className="text-slate-600">
                        {inv.invoiceType === 'HOSPITAL_FEE' ? 'Viện phí' : 'Đơn thuốc'} •{' '}
                        {formatCurrencyVND(inv.totalAmount)}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
