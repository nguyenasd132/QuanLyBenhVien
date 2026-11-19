import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarPlus,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import {
  formatCurrencyVND,
  formatDateVN,
  getSessionShortLabel,
  getTodayISODate,
} from '@/lib/format';
import type {
  DepartmentDto,
  DoctorDto,
  DoctorScheduleDto,
  NurseDto,
  RoomDto,
  SessionType,
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
  Tabs,
  useToast,
} from '@/components/ui';

export const AdminStaffPage: React.FC = () => {
  const toast = useToast();

  const [tab, setTab] = useState<'DOCTORS' | 'NURSES' | 'SCHEDULES'>('DOCTORS');
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [nurses, setNurses] = useState<NurseDto[]>([]);
  const [schedules, setSchedules] = useState<DoctorScheduleDto[]>([]);

  // Doctor modal
  const [docModalOpen, setDocModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<DoctorDto | null>(null);
  const [docForm, setDocForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    doctorCode: '',
    departmentId: '',
    roomId: '',
    specialty: '',
    title: 'BS.',
    yearsOfExperience: 5,
    consultationFee: 150000,
    isOnDuty: true,
    isActive: true,
  });

  // Nurse modal
  const [nurseModalOpen, setNurseModalOpen] = useState<boolean>(false);
  const [editingNurse, setEditingNurse] = useState<NurseDto | null>(null);
  const [nurseForm, setNurseForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    nurseCode: '',
    departmentId: '',
    shift: 'Ca sáng (07:00 - 15:00)',
    isActive: true,
  });

  // Bulk Schedule modal
  const [schedModalOpen, setSchedModalOpen] = useState<boolean>(false);
  const [schedForm, setSchedForm] = useState({
    doctorId: '',
    fromDate: getTodayISODate(),
    toDate: getTodayISODate(),
    morning: true,
    afternoon: true,
    maxPatients: 20,
    avgMinutesPerPatient: 12,
    isAvailable: true,
  });

  const [saving, setSaving] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptsRes, roomsRes, docsRes, nursesRes, schedRes] = await Promise.all([
        adminApi.getDepartments(),
        adminApi.getRooms(),
        adminApi.getDoctors({
          departmentId: deptFilter || undefined,
          search: search.trim() || undefined,
        }),
        adminApi.getNurses({
          departmentId: deptFilter || undefined,
          search: search.trim() || undefined,
        }),
        adminApi.getSchedules({
          departmentId: deptFilter || undefined,
          from: getTodayISODate(),
        }),
      ]);
      setDepartments(deptsRes);
      setRooms(roomsRes);
      setDoctors(docsRes);
      setNurses(nursesRes);
      setSchedules(schedRes);
    } catch (err) {
      toast.error(
        'Không thể tải dữ liệu nhân sự',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [deptFilter, search, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openCreateDoctor = () => {
    setEditingDoc(null);
    setDocForm({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      doctorCode: `BS-${String(doctors.length + 1).padStart(3, '0')}`,
      departmentId: departments[0]?.id || '',
      roomId: '',
      specialty: departments[0]?.name || 'Nội tổng quát',
      title: 'BS.CKI',
      yearsOfExperience: 5,
      consultationFee: 150000,
      isOnDuty: true,
      isActive: true,
    });
    setDocModalOpen(true);
  };

  const openEditDoctor = (doc: DoctorDto) => {
    setEditingDoc(doc);
    setDocForm({
      email: doc.email,
      password: '',
      fullName: doc.fullName,
      phone: doc.phone || '',
      doctorCode: doc.doctorCode,
      departmentId: doc.department.id,
      roomId: doc.room?.id || '',
      specialty: doc.specialty,
      title: doc.title || '',
      yearsOfExperience: doc.yearsOfExperience,
      consultationFee: Number(doc.consultationFee),
      isOnDuty: doc.isOnDuty,
      isActive: doc.isActive,
    });
    setDocModalOpen(true);
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDoc) {
        await adminApi.updateDoctor(editingDoc.id, {
          fullName: docForm.fullName,
          phone: docForm.phone || undefined,
          departmentId: docForm.departmentId,
          roomId: docForm.roomId || null,
          specialty: docForm.specialty,
          title: docForm.title || undefined,
          yearsOfExperience: Number(docForm.yearsOfExperience),
          consultationFee: Number(docForm.consultationFee),
          isOnDuty: docForm.isOnDuty,
          isActive: docForm.isActive,
        });
        toast.success(`Đã cập nhật bác sĩ ${docForm.fullName}`);
      } else {
        await adminApi.createDoctor({
          email: docForm.email,
          password: docForm.password || undefined,
          fullName: docForm.fullName,
          phone: docForm.phone || undefined,
          doctorCode: docForm.doctorCode,
          departmentId: docForm.departmentId,
          roomId: docForm.roomId || undefined,
          specialty: docForm.specialty,
          title: docForm.title || undefined,
          yearsOfExperience: Number(docForm.yearsOfExperience),
          consultationFee: Number(docForm.consultationFee),
          isOnDuty: docForm.isOnDuty,
        });
        toast.success(`Đã thêm bác sĩ ${docForm.fullName}`);
      }
      setDocModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Lưu thông tin bác sĩ thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateDoctor = async (doc: DoctorDto) => {
    try {
      await adminApi.deleteDoctor(doc.id);
      toast.info(`Đã vô hiệu hóa tài khoản ${doc.fullName}`);
      await loadAll();
    } catch (err) {
      toast.error(
        'Thao tác thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    }
  };

  const openCreateNurse = () => {
    setEditingNurse(null);
    setNurseForm({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      nurseCode: `DD-${String(nurses.length + 1).padStart(3, '0')}`,
      departmentId: departments[0]?.id || '',
      shift: 'Ca sáng (07:00 - 15:00)',
      isActive: true,
    });
    setNurseModalOpen(true);
  };

  const openEditNurse = (n: NurseDto) => {
    setEditingNurse(n);
    setNurseForm({
      email: n.email,
      password: '',
      fullName: n.fullName,
      phone: n.phone || '',
      nurseCode: n.nurseCode,
      departmentId: n.department.id,
      shift: n.shift || '',
      isActive: n.isActive,
    });
    setNurseModalOpen(true);
  };

  const handleSaveNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingNurse) {
        await adminApi.updateNurse(editingNurse.id, {
          fullName: nurseForm.fullName,
          phone: nurseForm.phone || undefined,
          departmentId: nurseForm.departmentId,
          shift: nurseForm.shift || undefined,
          isActive: nurseForm.isActive,
        });
        toast.success(`Đã cập nhật điều dưỡng ${nurseForm.fullName}`);
      } else {
        await adminApi.createNurse({
          email: nurseForm.email,
          password: nurseForm.password || undefined,
          fullName: nurseForm.fullName,
          phone: nurseForm.phone || undefined,
          nurseCode: nurseForm.nurseCode,
          departmentId: nurseForm.departmentId,
          shift: nurseForm.shift || undefined,
        });
        toast.success(`Đã thêm điều dưỡng ${nurseForm.fullName}`);
      }
      setNurseModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Lưu thông tin điều dưỡng thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBulkSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessions: SessionType[] = [];
    if (schedForm.morning) sessions.push('MORNING');
    if (schedForm.afternoon) sessions.push('AFTERNOON');
    if (sessions.length === 0) {
      toast.warning('Chọn ít nhất 1 buổi khám (Sáng hoặc Chiều)');
      return;
    }
    setSaving(true);
    try {
      await adminApi.createSchedules({
        doctorId: schedForm.doctorId,
        fromDate: schedForm.fromDate,
        toDate: schedForm.toDate,
        sessions,
        maxPatients: Number(schedForm.maxPatients),
        avgMinutesPerPatient: Number(schedForm.avgMinutesPerPatient),
        isAvailable: schedForm.isAvailable,
      });
      toast.success('Đã tạo lịch khám cho bác sĩ');
      setSchedModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Phân lịch thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSchedule = async (s: DoctorScheduleDto) => {
    try {
      await adminApi.updateSchedule(s.id, { isAvailable: !s.isAvailable });
      toast.success('Đã cập nhật trạng thái lịch khám');
      await loadAll();
    } catch (err) {
      toast.error(
        'Cập nhật thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Bác sĩ, Điều dưỡng & Lịch trực
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tạo tài khoản nhân viên y tế, phân công phòng khám và xếp lịch khám theo Buổi Sáng /
            Chiều.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadAll()}
          >
            Làm mới
          </Button>
          {tab === 'DOCTORS' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateDoctor}
            >
              Thêm Bác sĩ
            </Button>
          )}
          {tab === 'NURSES' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateNurse}
            >
              Thêm Điều dưỡng
            </Button>
          )}
          {tab === 'SCHEDULES' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus className="h-4 w-4" />}
              onClick={() => {
                setSchedForm((f) => ({
                  ...f,
                  doctorId: doctors[0]?.id || '',
                }));
                setSchedModalOpen(true);
              }}
            >
              Phân lịch khám
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          activeId={tab}
          onChange={(id) => setTab(id as 'DOCTORS' | 'NURSES' | 'SCHEDULES')}
          items={[
            {
              id: 'DOCTORS',
              label: 'Đội ngũ Bác sĩ',
              count: doctors.length,
              icon: <Stethoscope className="h-4 w-4" />,
            },
            {
              id: 'NURSES',
              label: 'Đội ngũ Điều dưỡng',
              count: nurses.length,
              icon: <Users className="h-4 w-4" />,
            },
            {
              id: 'SCHEDULES',
              label: 'Lịch trực / Khám bệnh',
              count: schedules.length,
              icon: <CalendarPlus className="h-4 w-4" />,
            },
          ]}
        />

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="w-full sm:w-52">
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Tất cả chuyên khoa</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          {tab !== 'SCHEDULES' && (
            <div className="w-full sm:w-64">
              <Input
                placeholder="Tìm tên, mã NV, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner label="Đang tải dữ liệu nhân sự..." />
      ) : tab === 'DOCTORS' ? (
        <Table
          data={doctors}
          rowKey={(d) => d.id}
          emptyState={<EmptyState title="Chưa có bác sĩ nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã BS',
              render: (d) => (
                <span className="font-mono text-xs font-bold text-[#1D5BB8] bg-[#DCEAFB] px-2 py-1 rounded-lg">
                  {d.doctorCode}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Bác sĩ',
              render: (d) => (
                <div>
                  <p className="font-bold text-slate-900">
                    {d.title ? `${d.title} ` : ''}
                    {d.fullName}
                  </p>
                  <p className="text-xs text-slate-600">
                    {d.email} {d.phone ? `• ${d.phone}` : ''}
                  </p>
                </div>
              ),
            },
            {
              key: 'dept',
              header: 'Khoa & Phòng',
              render: (d) => (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">{d.department.name}</p>
                  <p className="text-slate-600">{d.room ? d.room.name : 'Chưa gán phòng'}</p>
                </div>
              ),
            },
            {
              key: 'fee',
              header: 'Phí khám',
              render: (d) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrencyVND(d.consultationFee)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (d) => (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={d.isOnDuty ? 'emerald' : 'slate'} dot pulse={d.isOnDuty} size="sm">
                    {d.isOnDuty ? 'Đang trực' : 'Nghỉ ca'}
                  </Badge>
                  {!d.isActive && (
                    <Badge variant="rose" size="sm">
                      Đã khóa
                    </Badge>
                  )}
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (d) => (
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => openEditDoctor(d)}
                  >
                    Sửa
                  </Button>
                  {d.isActive && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void handleDeactivateDoctor(d)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : tab === 'NURSES' ? (
        <Table
          data={nurses}
          rowKey={(n) => n.id}
          emptyState={<EmptyState title="Chưa có điều dưỡng nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã ĐD',
              render: (n) => (
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                  {n.nurseCode}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Điều dưỡng',
              render: (n) => (
                <div>
                  <p className="font-bold text-slate-900">{n.fullName}</p>
                  <p className="text-xs text-slate-600">
                    {n.email} {n.phone ? `• ${n.phone}` : ''}
                  </p>
                </div>
              ),
            },
            {
              key: 'dept',
              header: 'Chuyên khoa',
              render: (n) => <span className="font-semibold text-slate-800">{n.department.name}</span>,
            },
            {
              key: 'shift',
              header: 'Ca làm việc',
              render: (n) => <span className="text-xs text-slate-600">{n.shift || '—'}</span>,
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (n) => (
                <Badge variant={n.isActive ? 'emerald' : 'rose'} size="sm" dot>
                  {n.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (n) => (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => openEditNurse(n)}
                >
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Table
          data={schedules}
          rowKey={(s) => s.id}
          emptyState={<EmptyState title="Chưa có lịch khám từ hôm nay" />}
          columns={[
            {
              key: 'date',
              header: 'Ngày khám',
              render: (s) => (
                <span className="font-semibold text-slate-900">{formatDateVN(s.scheduleDate)}</span>
              ),
            },
            {
              key: 'doctor',
              header: 'Bác sĩ & Khoa',
              render: (s) => (
                <div>
                  <p className="font-bold text-slate-900">{s.doctorName || '—'}</p>
                  <p className="text-xs text-slate-600">{s.departmentName || '—'}</p>
                </div>
              ),
            },
            {
              key: 'session',
              header: 'Buổi khám',
              render: (s) => (
                <span className="text-xs font-semibold text-slate-700">
                  {getSessionShortLabel(s.session)} ({s.startTime} - {s.endTime})
                </span>
              ),
            },
            {
              key: 'cap',
              header: 'Số lượt',
              render: (s) => (
                <span className="text-xs font-bold text-[#1D5BB8]">
                  {s.bookedCount} / {s.maxPatients} lượt
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (s) => (
                <Badge variant={s.isAvailable ? 'emerald' : 'slate'} size="sm" dot>
                  {s.isAvailable ? 'Đang mở' : 'Tạm ngưng'}
                </Badge>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (s) => (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                  onClick={() => void handleToggleSchedule(s)}
                >
                  {s.isAvailable ? 'Tạm ngưng' : 'Mở lại'}
                </Button>
              ),
            },
          ]}
        />
      )}

      {/* Doctor Modal */}
      <Modal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        size="lg"
        title={editingDoc ? 'Cập nhật Thông tin Bác sĩ' : 'Thêm Bác sĩ mới'}
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Họ và tên"
              required
              value={docForm.fullName}
              onChange={(e) => setDocForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <Input
              label="Mã bác sĩ"
              required
              disabled={Boolean(editingDoc)}
              value={docForm.doctorCode}
              onChange={(e) => setDocForm((f) => ({ ...f, doctorCode: e.target.value }))}
            />
            {!editingDoc && (
              <>
                <Input
                  label="Email đăng nhập"
                  type="email"
                  required
                  value={docForm.email}
                  onChange={(e) => setDocForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Input
                  label="Mật khẩu (mặc định 123456 nếu để trống)"
                  type="password"
                  value={docForm.password}
                  onChange={(e) => setDocForm((f) => ({ ...f, password: e.target.value }))}
                />
              </>
            )}
            <Input
              label="Học hàm / Danh xưng (VD: BS.CKII)"
              value={docForm.title}
              onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              label="Số điện thoại"
              value={docForm.phone}
              onChange={(e) => setDocForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Select
              label="Chuyên khoa"
              value={docForm.departmentId}
              onChange={(e) => setDocForm((f) => ({ ...f, departmentId: e.target.value }))}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Phòng khám phụ trách"
              value={docForm.roomId}
              onChange={(e) => setDocForm((f) => ({ ...f, roomId: e.target.value }))}
            >
              <option value="">-- Chưa phân phòng --</option>
              {rooms
                .filter((r) => r.roomType === 'EXAMINATION' || !docForm.departmentId || r.departmentId === docForm.departmentId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
            </Select>
            <Input
              label="Chuyên môn sâu"
              required
              value={docForm.specialty}
              onChange={(e) => setDocForm((f) => ({ ...f, specialty: e.target.value }))}
            />
            <Input
              label="Phí khám (VNĐ)"
              type="number"
              min={0}
              step={10000}
              value={docForm.consultationFee}
              onChange={(e) =>
                setDocForm((f) => ({ ...f, consultationFee: Number(e.target.value) }))
              }
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={docForm.isOnDuty}
                onChange={(e) => setDocForm((f) => ({ ...f, isOnDuty: e.target.checked }))}
                className="h-4 w-4 rounded text-[#1D5BB8]"
              />
              Đang trong ca trực (hiển thị trên Dashboard)
            </label>
            {editingDoc && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docForm.isActive}
                  onChange={(e) => setDocForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded text-[#1D5BB8]"
                />
                Tài khoản hoạt động
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDocModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu bác sĩ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Nurse Modal */}
      <Modal
        open={nurseModalOpen}
        onClose={() => setNurseModalOpen(false)}
        title={editingNurse ? 'Cập nhật Thông tin Điều dưỡng' : 'Thêm Điều dưỡng mới'}
      >
        <form onSubmit={handleSaveNurse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Họ và tên"
              required
              value={nurseForm.fullName}
              onChange={(e) => setNurseForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <Input
              label="Mã điều dưỡng"
              required
              disabled={Boolean(editingNurse)}
              value={nurseForm.nurseCode}
              onChange={(e) => setNurseForm((f) => ({ ...f, nurseCode: e.target.value }))}
            />
            {!editingNurse && (
              <>
                <Input
                  label="Email đăng nhập"
                  type="email"
                  required
                  value={nurseForm.email}
                  onChange={(e) => setNurseForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Input
                  label="Mật khẩu (mặc định 123456)"
                  type="password"
                  value={nurseForm.password}
                  onChange={(e) => setNurseForm((f) => ({ ...f, password: e.target.value }))}
                />
              </>
            )}
            <Select
              label="Khoa phụ trách"
              value={nurseForm.departmentId}
              onChange={(e) => setNurseForm((f) => ({ ...f, departmentId: e.target.value }))}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Input
              label="Ca trực"
              value={nurseForm.shift}
              onChange={(e) => setNurseForm((f) => ({ ...f, shift: e.target.value }))}
            />
            <Input
              label="Số điện thoại"
              value={nurseForm.phone}
              onChange={(e) => setNurseForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNurseModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu điều dưỡng
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Schedule Modal */}
      <Modal
        open={schedModalOpen}
        onClose={() => setSchedModalOpen(false)}
        title="Phân lịch Khám hàng loạt cho Bác sĩ"
        description="Tạo lịch theo khoảng ngày và Buổi Sáng / Buổi Chiều."
      >
        <form onSubmit={handleCreateBulkSchedule} className="space-y-4">
          <Select
            label="Chọn Bác sĩ"
            value={schedForm.doctorId}
            onChange={(e) => setSchedForm((f) => ({ ...f, doctorId: e.target.value }))}
            required
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.department.name}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Từ ngày"
              type="date"
              value={schedForm.fromDate}
              onChange={(e) => setSchedForm((f) => ({ ...f, fromDate: e.target.value }))}
              required
            />
            <Input
              label="Đến ngày"
              type="date"
              value={schedForm.toDate}
              onChange={(e) => setSchedForm((f) => ({ ...f, toDate: e.target.value }))}
              required
            />
            <Input
              label="Số lượt tối đa / buổi"
              type="number"
              min={1}
              max={60}
              value={schedForm.maxPatients}
              onChange={(e) =>
                setSchedForm((f) => ({ ...f, maxPatients: Number(e.target.value) }))
              }
            />
            <Input
              label="Phút TB / bệnh nhân"
              type="number"
              min={5}
              max={60}
              value={schedForm.avgMinutesPerPatient}
              onChange={(e) =>
                setSchedForm((f) => ({ ...f, avgMinutesPerPatient: Number(e.target.value) }))
              }
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={schedForm.morning}
                onChange={(e) => setSchedForm((f) => ({ ...f, morning: e.target.checked }))}
                className="h-4 w-4 rounded text-[#1D5BB8]"
              />
              Buổi Sáng (07:30 - 11:30)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={schedForm.afternoon}
                onChange={(e) => setSchedForm((f) => ({ ...f, afternoon: e.target.checked }))}
                className="h-4 w-4 rounded text-[#1D5BB8]"
              />
              Buổi Chiều (13:30 - 17:00)
            </label>
          </div>

          <Card className="bg-[#EDF3FB]">
            <CardContent className="p-3 text-xs text-slate-600">
              Các buổi đã tồn tại sẽ được giữ nguyên số lượng đã đặt (<code>lastQueueNumber</code>)
              và cập nhật cấu hình mới.
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSchedModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Tạo lịch khám
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
