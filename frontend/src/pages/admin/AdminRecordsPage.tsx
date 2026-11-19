import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminApi, publicApi } from '@/lib/api';
import { formatCurrencyVND, formatDateVN, getSessionShortLabel } from '@/lib/format';
import type {
  DepartmentDto,
  DoctorDto,
  MedicalRecordDto,
  PaginationMeta,
} from '@/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  useToast,
} from '@/components/ui';

export const AdminRecordsPage: React.FC = () => {
  const toast = useToast();

  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15 });
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordDto | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [depts, docs] = await Promise.all([
          publicApi.getDepartments(true),
          publicApi.getDoctors(),
        ]);
        setDepartments(depts);
        setDoctors(docs);
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMedicalRecords({
        search: search.trim() || undefined,
        departmentId: departmentId || undefined,
        doctorId: doctorId || undefined,
        status: status || undefined,
        page,
        limit: 15,
      });
      setRecords(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      toast.error(
        'Không thể tải hồ sơ bệnh án',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, doctorId, status, page, toast]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 15)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Kho Lưu trữ Hồ sơ Bệnh án
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tra cứu chẩn đoán, mã ICD-10, kết quả cận lâm sàng và đơn thuốc toàn viện.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadRecords()}
        >
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Tìm mã BA, tên BN, chẩn đoán, ICD..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            value={departmentId}
            onChange={(e) => {
              setPage(1);
              setDepartmentId(e.target.value);
            }}
          >
            <option value="">Tất cả chuyên khoa</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            value={doctorId}
            onChange={(e) => {
              setPage(1);
              setDoctorId(e.target.value);
            }}
          >
            <option value="">Tất cả bác sĩ</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'PUBLISHED', label: 'Đã công bố' },
              { value: 'DRAFT', label: 'Bản nháp' },
            ]}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Spinner label="Đang tải hồ sơ bệnh án..." />
      ) : (
        <div className="space-y-4">
          <Table
            data={records}
            rowKey={(r) => r.id}
            emptyState={<EmptyState title="Không có hồ sơ bệnh án phù hợp" />}
            columns={[
              {
                key: 'code',
                header: 'Mã BA',
                render: (r) => (
                  <span className="font-mono text-xs font-bold text-[#1D5BB8]">
                    {r.recordCode}
                  </span>
                ),
              },
              {
                key: 'patient',
                header: 'Bệnh nhân',
                render: (r) => (
                  <div>
                    <p className="font-bold text-slate-900">{r.patientName}</p>
                    <p className="text-xs text-slate-600">{r.patientCode}</p>
                  </div>
                ),
              },
              {
                key: 'diag',
                header: 'Chẩn đoán & ICD-10',
                render: (r) => (
                  <div>
                    <p className="font-semibold text-slate-800">{r.diagnosis}</p>
                    {r.icdCode && (
                      <Badge variant="slate" size="sm">
                        ICD: {r.icdCode}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'doc',
                header: 'Bác sĩ & Ngày khám',
                render: (r) => (
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">{r.doctorName}</p>
                    <p className="text-slate-600">
                      {r.departmentName} • {formatDateVN(r.appointmentDate)}
                    </p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (r) => (
                  <Badge variant={r.status === 'PUBLISHED' ? 'emerald' : 'amber'} size="sm">
                    {r.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                  </Badge>
                ),
              },
              {
                key: 'action',
                header: '',
                render: (r) => (
                  <Button
                    variant="secondary"
                    size="xs"
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => setSelectedRecord(r)}
                  >
                    Xem
                  </Button>
                ),
              },
            ]}
          />

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Tổng: {meta.total} hồ sơ • Trang {page} / {totalPages}
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

      <Modal
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        size="lg"
        title={
          selectedRecord ? (
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1D5BB8]" />
              Hồ sơ Bệnh án {selectedRecord.recordCode}
            </span>
          ) : undefined
        }
        description={
          selectedRecord
            ? `${selectedRecord.patientName} (${selectedRecord.patientCode}) • ${formatDateVN(selectedRecord.appointmentDate)} • ${getSessionShortLabel(selectedRecord.session)}`
            : undefined
        }
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA] space-y-1.5">
              <p>
                <strong>Chẩn đoán:</strong> {selectedRecord.diagnosis}{' '}
                {selectedRecord.icdCode ? `(${selectedRecord.icdCode})` : ''}
              </p>
              <p>
                <strong>Triệu chứng:</strong> {selectedRecord.symptoms || '—'}
              </p>
              <p>
                <strong>Hướng điều trị:</strong> {selectedRecord.treatmentPlan || '—'}
              </p>
              <p>
                <strong>Bác sĩ thực hiện:</strong> {selectedRecord.doctorName} (
                {selectedRecord.departmentName})
              </p>
            </div>

            {selectedRecord.specialtyResults?.labOrders &&
              selectedRecord.specialtyResults.labOrders.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900">Cận lâm sàng</h4>
                  <div className="rounded-xl border border-[#C7D6EA] divide-y divide-[#C7D6EA]">
                    {selectedRecord.specialtyResults.labOrders.map((lo, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{lo.testName}</span>
                        <span className="text-slate-600">
                          {lo.result || (lo.status === 'ORDERED' ? 'Đã chỉ định' : 'Hoàn thành')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {selectedRecord.prescription && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">
                    Đơn thuốc ({selectedRecord.prescription.prescriptionCode})
                  </h4>
                  <span className="font-bold text-[#1D5BB8]">
                    {formatCurrencyVND(selectedRecord.prescription.totalAmount)}
                  </span>
                </div>
                <div className="rounded-xl border border-[#C7D6EA] divide-y divide-[#C7D6EA]">
                  {selectedRecord.prescription.items.map((it) => (
                    <div key={it.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{it.medicineName}</p>
                        <p className="text-slate-600">{it.dosage}</p>
                      </div>
                      <span className="font-semibold">
                        {it.quantity} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
