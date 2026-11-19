import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { adminApi, publicApi } from '@/lib/api';
import {
  formatDateVN,
  formatQueueNumber,
  getSessionShortLabel,
} from '@/lib/format';
import type {
  AppointmentDto,
  AppointmentStatus,
  DepartmentDto,
  DoctorDto,
  PaginationMeta,
} from '@/types';
import {
  AppointmentStatusBadge,
  Badge,
  BookingTypeBadge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Select,
  Spinner,
  Table,
  useToast,
} from '@/components/ui';

export const AdminAppointmentsPage: React.FC = () => {
  const toast = useToast();

  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15 });
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

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

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAppointments({
        date: date || undefined,
        status: (status as AppointmentStatus) || undefined,
        departmentId: departmentId || undefined,
        doctorId: doctorId || undefined,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setAppointments(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      toast.error(
        'Không thể tải danh sách lịch hẹn',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [date, status, departmentId, doctorId, search, page, toast]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 15)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Lịch hẹn Toàn viện
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tra cứu lịch khám ngoại trú theo khoa, bác sĩ, ngày và trạng thái tiếp nhận.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadAppointments()}
        >
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Tìm mã hẹn, bệnh nhân..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <div className="flex items-center gap-2 border border-[#9FB5D0] hover:border-[#7B99BE] rounded-xl px-3 h-10 bg-white">
            <Calendar className="h-4 w-4 text-slate-600 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setPage(1);
                setDate(e.target.value);
              }}
              className="w-full text-sm text-slate-800 bg-transparent focus:outline-none"
            />
          </div>
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
              { value: 'BOOKED', label: 'Đã đặt lịch' },
              { value: 'CHECKED_IN', label: 'Đã check-in' },
              { value: 'IN_PROGRESS', label: 'Đang khám' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'CANCELLED', label: 'Đã hủy' },
              { value: 'NO_SHOW', label: 'Vắng mặt' },
            ]}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Spinner label="Đang tải danh sách lịch hẹn..." />
      ) : (
        <div className="space-y-4">
          <Table
            data={appointments}
            rowKey={(r) => r.id}
            emptyState={
              <EmptyState
                title="Không có lịch hẹn nào"
                description="Thử xóa bộ lọc ngày hoặc từ khóa để xem thêm."
              />
            }
            columns={[
              {
                key: 'code',
                header: 'Mã hẹn / STT',
                render: (r) => (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="blue" size="sm">
                        {formatQueueNumber(r.queueNumber)}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {r.appointmentCode}
                      </span>
                    </div>
                    <div className="mt-1">
                      <BookingTypeBadge type={r.bookingType} />
                    </div>
                  </div>
                ),
              },
              {
                key: 'patient',
                header: 'Bệnh nhân',
                render: (r) => (
                  <div>
                    <p className="font-bold text-slate-900">{r.patientName}</p>
                    <p className="text-xs text-slate-600">
                      {r.patientCode} {r.patientPhone ? `• ${r.patientPhone}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'doctor',
                header: 'Bác sĩ & Chuyên khoa',
                render: (r) => (
                  <div>
                    <p className="font-semibold text-slate-800">{r.doctorName}</p>
                    <p className="text-xs text-slate-600">
                      {r.departmentName}
                      {r.roomName ? ` • ${r.roomName}` : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'time',
                header: 'Ngày & Buổi',
                render: (r) => (
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800">{formatDateVN(r.appointmentDate)}</p>
                    <p className="text-slate-600">
                      {getSessionShortLabel(r.session)} ({r.estimatedTime})
                    </p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (r) => <AppointmentStatusBadge status={r.status} />,
              },
            ]}
          />

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Hiển thị {appointments.length} / {meta.total} lịch hẹn
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
              <span className="font-semibold">
                Trang {page} / {totalPages}
              </span>
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
    </div>
  );
};
