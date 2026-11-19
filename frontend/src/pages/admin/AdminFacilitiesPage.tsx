import React, { useCallback, useEffect, useState } from 'react';
import { BedDouble, Building2, DoorOpen, Edit3, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { adminApi, apiClient } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/format';
import type { BedDto, BedStatus, DepartmentDto, RoomDto, RoomType } from '@/types';
import {
  Badge,
  BedStatusBadge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  EXAMINATION: 'Phòng khám',
  INPATIENT_WARD: 'Phòng bệnh nội trú',
  TRIAGE: 'Phòng phân loại / Sinh hiệu',
  PHARMACY: 'Quầy thuốc',
  LAB: 'Phòng xét nghiệm / CLS',
};

export const AdminFacilitiesPage: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState<'DEPARTMENTS' | 'ROOMS' | 'BEDS'>('DEPARTMENTS');
  const [loading, setLoading] = useState<boolean>(true);

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [beds, setBeds] = useState<BedDto[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('');

  // Department Modal
  const [deptModalOpen, setDeptModalOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<DepartmentDto | null>(null);
  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    description: '',
    location: '',
    consultationFee: 150000,
    isActive: true,
  });

  // Room Modal
  const [roomModalOpen, setRoomModalOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<RoomDto | null>(null);
  const [roomForm, setRoomForm] = useState({
    code: '',
    name: '',
    roomType: 'EXAMINATION' as RoomType,
    floor: 'Tầng 2',
    departmentId: '',
    isActive: true,
  });

  // Bed Modal
  const [bedModalOpen, setBedModalOpen] = useState<boolean>(false);
  const [editingBed, setEditingBed] = useState<BedDto | null>(null);
  const [bedForm, setBedForm] = useState({
    bedNumber: '',
    roomId: '',
    status: 'AVAILABLE' as BedStatus,
    notes: '',
  });

  const [saving, setSaving] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptsRes, roomsRes, bedsRes] = await Promise.all([
        adminApi.getDepartments(),
        adminApi.getRooms({ departmentId: deptFilter || undefined }),
        adminApi.getBeds({ departmentId: deptFilter || undefined }),
      ]);
      setDepartments(deptsRes);
      setRooms(roomsRes);
      setBeds(bedsRes);
    } catch (err) {
      toast.error(
        'Không thể tải dữ liệu cơ sở vật chất',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [deptFilter, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDept) {
        await adminApi.updateDepartment(editingDept.id, {
          name: deptForm.name,
          description: deptForm.description || null,
          location: deptForm.location || null,
          consultationFee: Number(deptForm.consultationFee),
          isActive: deptForm.isActive,
        });
        toast.success('Đã cập nhật chuyên khoa');
      } else {
        await adminApi.createDepartment({
          code: deptForm.code,
          name: deptForm.name,
          description: deptForm.description || undefined,
          location: deptForm.location || undefined,
          consultationFee: Number(deptForm.consultationFee),
        });
        toast.success('Đã tạo chuyên khoa mới');
      }
      setDeptModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Lưu chuyên khoa thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra mã khoa'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRoom) {
        await adminApi.updateRoom(editingRoom.id, {
          name: roomForm.name,
          roomType: roomForm.roomType,
          floor: roomForm.floor || null,
          departmentId: roomForm.departmentId,
          isActive: roomForm.isActive,
        });
        toast.success('Đã cập nhật phòng');
      } else {
        await adminApi.createRoom({
          code: roomForm.code,
          name: roomForm.name,
          roomType: roomForm.roomType,
          floor: roomForm.floor || undefined,
          departmentId: roomForm.departmentId,
        });
        toast.success('Đã tạo phòng mới');
      }
      setRoomModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Lưu phòng thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra mã phòng'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const roomDeptId = rooms.find((r) => r.id === bedForm.roomId)?.departmentId;
    try {
      if (editingBed) {
        const updatePayload: {
          bedNumber?: string;
          roomId?: string;
          status?: BedStatus;
          notes?: string;
        } = {
          bedNumber: bedForm.bedNumber,
          roomId: bedForm.roomId,
          notes: bedForm.notes || undefined,
        };
        if (editingBed.status !== 'OCCUPIED') {
          updatePayload.status = bedForm.status;
        }
        await adminApi.updateBed(editingBed.id, updatePayload);
        toast.success('Đã cập nhật giường bệnh');
      } else {
        await apiClient.post<BedDto>('/admin/beds', {
          bedNumber: bedForm.bedNumber,
          roomId: bedForm.roomId,
          departmentId: roomDeptId,
          status: bedForm.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE',
          notes: bedForm.notes || undefined,
        });
        toast.success('Đã thêm giường bệnh mới');
      }
      setBedModalOpen(false);
      await loadAll();
    } catch (err) {
      toast.error(
        'Lưu giường bệnh thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBed = async (bed: BedDto) => {
    try {
      await adminApi.deleteBed(bed.id);
      toast.info(`Đã xóa giường ${bed.bedNumber}`);
      await loadAll();
    } catch (err) {
      toast.error(
        'Không thể xóa giường đang sử dụng',
        err instanceof Error ? err.message : 'Vui lòng trả giường trước'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Khoa, Phòng & Giường bệnh
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Cấu hình cơ cấu chuyên khoa, phòng khám ngoại trú, phòng bệnh nội trú và danh sách
            giường.
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
          {tab === 'DEPARTMENTS' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingDept(null);
                setDeptForm({
                  code: '',
                  name: '',
                  description: '',
                  location: '',
                  consultationFee: 150000,
                  isActive: true,
                });
                setDeptModalOpen(true);
              }}
            >
              Thêm Chuyên khoa
            </Button>
          )}
          {tab === 'ROOMS' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingRoom(null);
                setRoomForm({
                  code: '',
                  name: '',
                  roomType: 'EXAMINATION',
                  floor: 'Tầng 2',
                  departmentId: departments[0]?.id || '',
                  isActive: true,
                });
                setRoomModalOpen(true);
              }}
            >
              Thêm Phòng
            </Button>
          )}
          {tab === 'BEDS' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingBed(null);
                setBedForm({
                  bedNumber: '',
                  roomId:
                    rooms.find((r) => r.roomType === 'INPATIENT_WARD')?.id || rooms[0]?.id || '',
                  status: 'AVAILABLE',
                  notes: '',
                });
                setBedModalOpen(true);
              }}
            >
              Thêm Giường
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          activeId={tab}
          onChange={(id) => setTab(id as 'DEPARTMENTS' | 'ROOMS' | 'BEDS')}
          items={[
            {
              id: 'DEPARTMENTS',
              label: 'Chuyên khoa',
              count: departments.length,
              icon: <Building2 className="h-4 w-4" />,
            },
            {
              id: 'ROOMS',
              label: 'Phòng khám & Nội trú',
              count: rooms.length,
              icon: <DoorOpen className="h-4 w-4" />,
            },
            {
              id: 'BEDS',
              label: 'Giường bệnh',
              count: beds.length,
              icon: <BedDouble className="h-4 w-4" />,
            },
          ]}
        />

        {tab !== 'DEPARTMENTS' && (
          <div className="w-full sm:w-60">
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Tất cả chuyên khoa</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner label="Đang tải dữ liệu cơ sở vật chất..." />
      ) : tab === 'DEPARTMENTS' ? (
        <Table
          data={departments}
          rowKey={(d) => d.id}
          emptyState={<EmptyState title="Chưa có chuyên khoa nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã khoa',
              render: (d) => (
                <span className="font-mono text-xs font-bold text-[#1D5BB8] bg-[#DCEAFB] px-2 py-1 rounded-lg">
                  {d.code}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Tên chuyên khoa',
              render: (d) => (
                <div>
                  <p className="font-bold text-slate-900">{d.name}</p>
                  {d.description && (
                    <p className="text-xs text-slate-600 line-clamp-1">{d.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'location',
              header: 'Vị trí',
              render: (d) => <span className="text-xs text-slate-600">{d.location || '—'}</span>,
            },
            {
              key: 'fee',
              header: 'Giá khám',
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
                <Badge variant={d.isActive ? 'emerald' : 'slate'} size="sm" dot>
                  {d.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                </Badge>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (d) => (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingDept(d);
                    setDeptForm({
                      code: d.code,
                      name: d.name,
                      description: d.description || '',
                      location: d.location || '',
                      consultationFee: Number(d.consultationFee),
                      isActive: d.isActive,
                    });
                    setDeptModalOpen(true);
                  }}
                >
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      ) : tab === 'ROOMS' ? (
        <Table
          data={rooms}
          rowKey={(r) => r.id}
          emptyState={<EmptyState title="Chưa có phòng nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã phòng',
              render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span>,
            },
            {
              key: 'name',
              header: 'Tên phòng',
              render: (r) => <span className="font-bold text-slate-900">{r.name}</span>,
            },
            {
              key: 'type',
              header: 'Loại phòng',
              render: (r) => (
                <Badge variant="blue" size="sm">
                  {ROOM_TYPE_LABELS[r.roomType] || r.roomType}
                </Badge>
              ),
            },
            {
              key: 'dept',
              header: 'Chuyên khoa / Tầng',
              render: (r) => (
                <span className="text-xs text-slate-600">
                  {r.departmentName || '—'} {r.floor ? `• ${r.floor}` : ''}
                </span>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (r) => (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditingRoom(r);
                    setRoomForm({
                      code: r.code,
                      name: r.name,
                      roomType: r.roomType,
                      floor: r.floor || '',
                      departmentId: r.departmentId,
                      isActive: r.isActive,
                    });
                    setRoomModalOpen(true);
                  }}
                >
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Table
          data={beds}
          rowKey={(b) => b.id}
          emptyState={<EmptyState title="Chưa có giường bệnh nào" />}
          columns={[
            {
              key: 'bed',
              header: 'Số giường',
              render: (b) => <span className="font-bold text-slate-900">{b.bedNumber}</span>,
            },
            {
              key: 'room',
              header: 'Phòng / Khoa',
              render: (b) => (
                <div className="text-xs">
                  <p className="font-semibold text-slate-800">{b.roomName}</p>
                  <p className="text-slate-600">{b.departmentName}</p>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (b) => <BedStatusBadge status={b.status} />,
            },
            {
              key: 'patient',
              header: 'Bệnh nhân hiện tại',
              render: (b) =>
                b.currentPatient ? (
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{b.currentPatient.fullName}</p>
                    <p className="text-slate-600">{b.currentPatient.patientCode}</p>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">Trống</span>
                ),
            },
            {
              key: 'action',
              header: '',
              render: (b) => (
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditingBed(b);
                      setBedForm({
                        bedNumber: b.bedNumber,
                        roomId: b.roomId,
                        status: b.status,
                        notes: b.notes || '',
                      });
                      setBedModalOpen(true);
                    }}
                  >
                    Sửa
                  </Button>
                  {b.status !== 'OCCUPIED' && (
                    <Button variant="ghost" size="xs" onClick={() => void handleDeleteBed(b)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Dept Modal */}
      <Modal
        open={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editingDept ? 'Cập nhật Chuyên khoa' : 'Thêm Chuyên khoa mới'}
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mã khoa"
              required
              disabled={Boolean(editingDept)}
              value={deptForm.code}
              onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Tên chuyên khoa"
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Vị trí"
              value={deptForm.location}
              onChange={(e) => setDeptForm((f) => ({ ...f, location: e.target.value }))}
            />
            <Input
              label="Phí khám cơ bản (VNĐ)"
              type="number"
              min={0}
              step={10000}
              value={deptForm.consultationFee}
              onChange={(e) =>
                setDeptForm((f) => ({ ...f, consultationFee: Number(e.target.value) }))
              }
            />
          </div>
          <Textarea
            label="Mô tả chuyên khoa"
            value={deptForm.description}
            onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeptModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu chuyên khoa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Room Modal */}
      <Modal
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title={editingRoom ? 'Cập nhật Phòng' : 'Thêm Phòng mới'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mã phòng"
              required
              disabled={Boolean(editingRoom)}
              value={roomForm.code}
              onChange={(e) => setRoomForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Tên phòng"
              required
              value={roomForm.name}
              onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              label="Chuyên khoa"
              value={roomForm.departmentId}
              onChange={(e) => setRoomForm((f) => ({ ...f, departmentId: e.target.value }))}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Loại phòng"
              value={roomForm.roomType}
              onChange={(e) => setRoomForm((f) => ({ ...f, roomType: e.target.value as RoomType }))}
              options={Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Input
              label="Tầng / Khu vực"
              value={roomForm.floor}
              onChange={(e) => setRoomForm((f) => ({ ...f, floor: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoomModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu phòng
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bed Modal */}
      <Modal
        open={bedModalOpen}
        onClose={() => setBedModalOpen(false)}
        title={editingBed ? 'Cập nhật Giường bệnh' : 'Thêm Giường bệnh mới'}
      >
        <form onSubmit={handleSaveBed} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Số / Mã giường"
              required
              placeholder="VD: G-201-01"
              value={bedForm.bedNumber}
              onChange={(e) => setBedForm((f) => ({ ...f, bedNumber: e.target.value }))}
            />
            <Select
              label="Thuộc phòng"
              value={bedForm.roomId}
              onChange={(e) => setBedForm((f) => ({ ...f, roomId: e.target.value }))}
              required
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.departmentName})
                </option>
              ))}
            </Select>
          </div>
          {editingBed?.status === 'OCCUPIED' ? (
            <div className="p-3 rounded-xl border border-[#9EC0EC] bg-[#DCEAFB]/70 text-xs text-[#15458E]">
              Giường hiện <strong>đang có bệnh nhân nằm viện</strong>. Trạng thái giường không thể
              chỉnh trực tiếp tại đây — vui lòng thực hiện Chuyển giường hoặc Xuất viện tại Cổng Điều
              dưỡng.
            </div>
          ) : (
            <Select
              label="Trạng thái"
              value={bedForm.status}
              onChange={(e) => setBedForm((f) => ({ ...f, status: e.target.value as BedStatus }))}
              options={[
                { value: 'AVAILABLE', label: 'Trống (AVAILABLE)' },
                { value: 'MAINTENANCE', label: 'Bảo trì (MAINTENANCE)' },
              ]}
            />
          )}
          <Textarea
            label="Ghi chú"
            value={bedForm.notes}
            onChange={(e) => setBedForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBedModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu giường
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
