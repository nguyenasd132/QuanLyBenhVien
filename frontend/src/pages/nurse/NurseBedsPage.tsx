import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { nurseApi } from '@/lib/api';
import { formatDateTimeVN } from '@/lib/format';
import type { BedDto, BedStatus, NurseBedsResponseDto, PatientSummaryDto } from '@/types';
import {
  Badge,
  BedStatusBadge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';

export const NurseBedsPage: React.FC = () => {
  const toast = useToast();

  const [data, setData] = useState<NurseBedsResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BedStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busyBedId, setBusyBedId] = useState<string | null>(null);

  // Admit modal
  const [admitBed, setAdmitBed] = useState<BedDto | null>(null);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patients, setPatients] = useState<PatientSummaryDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [admitNotes, setAdmitNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Transfer modal
  const [transferBed, setTransferBed] = useState<BedDto | null>(null);
  const [targetBedId, setTargetBedId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Discharge modal
  const [dischargeBed, setDischargeBed] = useState<BedDto | null>(null);
  const [dischargeNotes, setDischargeNotes] = useState<string>('');

  const loadBeds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nurseApi.getBeds({
        departmentId: selectedDepartmentId === 'ALL' ? undefined : selectedDepartmentId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      toast.error(
        'Không thể tải sơ đồ giường bệnh',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDepartmentId, statusFilter, searchQuery, toast]);

  useEffect(() => {
    void loadBeds();
  }, [loadBeds]);

  // Search patients when admit modal opens
  useEffect(() => {
    if (!admitBed) return;
    let cancelled = false;
    const fetchPatients = async () => {
      try {
        const res = await nurseApi.getPatients(patientSearch.trim() || undefined);
        if (!cancelled) {
          setPatients(res);
          if (res.length > 0 && !selectedPatientId) {
            setSelectedPatientId(res[0].id);
          }
        }
      } catch {
        // ignore
      }
    };
    void fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [admitBed, patientSearch, selectedPatientId]);

  // Load available beds for transfer modal
  const [availableBedsForTransfer, setAvailableBedsForTransfer] = useState<BedDto[]>([]);
  useEffect(() => {
    if (!transferBed) return;
    let cancelled = false;
    const fetchAvailBeds = async () => {
      try {
        const res = await nurseApi.getBeds({ status: 'AVAILABLE' });
        if (!cancelled) {
          setAvailableBedsForTransfer(res.beds);
          if (res.beds.length > 0) setTargetBedId(res.beds[0].id);
        }
      } catch {
        // ignore
      }
    };
    void fetchAvailBeds();
    return () => {
      cancelled = true;
    };
  }, [transferBed]);

  const groupedByDeptAndRoom = useMemo(() => {
    if (!data) return [];
    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        rooms: Map<
          string,
          { roomId: string; roomCode: string; roomName: string; floor: string | null; beds: BedDto[] }
        >;
      }
    >();

    data.beds.forEach((bed) => {
      if (!deptMap.has(bed.departmentId)) {
        deptMap.set(bed.departmentId, {
          departmentId: bed.departmentId,
          departmentName: bed.departmentName,
          rooms: new Map(),
        });
      }
      const deptEntry = deptMap.get(bed.departmentId)!;
      if (!deptEntry.rooms.has(bed.roomId)) {
        deptEntry.rooms.set(bed.roomId, {
          roomId: bed.roomId,
          roomCode: bed.roomCode,
          roomName: bed.roomName,
          floor: bed.floor,
          beds: [],
        });
      }
      deptEntry.rooms.get(bed.roomId)!.beds.push(bed);
    });

    return Array.from(deptMap.values()).map((d) => ({
      ...d,
      rooms: Array.from(d.rooms.values()),
    }));
  }, [data]);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitBed || !selectedPatientId) return;
    setSubmitting(true);
    try {
      await nurseApi.admitBed(admitBed.id, {
        patientId: selectedPatientId,
        notes: admitNotes.trim() || undefined,
      });
      toast.success(
        `Đã xếp giường ${admitBed.bedNumber}`,
        `Phòng ${admitBed.roomName} • ${admitBed.departmentName}`
      );
      setAdmitBed(null);
      setAdmitNotes('');
      await loadBeds();
    } catch (err) {
      toast.error(
        'Tiếp nhận giường bệnh thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferBed || !targetBedId) return;
    setSubmitting(true);
    try {
      await nurseApi.transferBed(transferBed.id, {
        targetBedId,
        notes: transferNotes.trim() || undefined,
      });
      toast.success(`Đã chuyển bệnh nhân từ giường ${transferBed.bedNumber}`);
      setTransferBed(null);
      setTransferNotes('');
      await loadBeds();
    } catch (err) {
      toast.error(
        'Chuyển giường thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeBed) return;
    setSubmitting(true);
    try {
      await nurseApi.dischargeBed(dischargeBed.id, {
        notes: dischargeNotes.trim() || undefined,
      });
      toast.success(`Đã xuất viện & trả giường ${dischargeBed.bedNumber}`);
      setDischargeBed(null);
      setDischargeNotes('');
      await loadBeds();
    } catch (err) {
      toast.error(
        'Xuất viện thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMaintenance = async (bed: BedDto) => {
    const nextStatus = bed.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    setBusyBedId(bed.id);
    try {
      await nurseApi.updateBedStatus(bed.id, {
        status: nextStatus,
        notes: nextStatus === 'MAINTENANCE' ? 'Đang bảo trì vệ sinh giường' : undefined,
      });
      toast.success(
        nextStatus === 'MAINTENANCE'
          ? `Giường ${bed.bedNumber} chuyển sang Bảo trì`
          : `Giường ${bed.bedNumber} đã sẵn sàng sử dụng`
      );
      await loadBeds();
    } catch (err) {
      toast.error(
        'Cập nhật trạng thái giường thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setBusyBedId(null);
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Giường bệnh Nội trú
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Theo dõi trực quan phòng bệnh theo khoa, tiếp nhận nhập viện, chuyển giường và xuất
            viện.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => void loadBeds()}
        >
          Làm mới
        </Button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-600">Tổng số giường</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-600">Đang sử dụng</p>
            <p className="text-2xl font-extrabold text-[#1D5BB8] mt-1">{summary.occupied}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-600">Giường trống</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{summary.available}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-600">Bảo trì</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1">{summary.maintenance}</p>
          </Card>
          <Card padding="sm" className="col-span-2 sm:col-span-1 bg-[#DCEAFB]/50">
            <p className="text-xs font-semibold text-[#1D5BB8]">Công suất lấp đầy</p>
            <p className="text-2xl font-extrabold text-[#1D5BB8] mt-1">
              {summary.occupancyRate}%
            </p>
          </Card>
        </div>
      )}

      {/* Department occupancy filter chips */}
      {data && data.byDepartment.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDepartmentId('ALL')}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
              selectedDepartmentId === 'ALL'
                ? 'bg-[#1D5BB8] text-white border-[#1D5BB8] shadow-sm'
                : 'bg-white text-slate-700 border-[#C7D6EA] hover:bg-[#EDF3FB]'
            }`}
          >
            Tất cả khoa ({summary?.occupied}/{summary?.total})
          </button>
          {data.byDepartment.map((dept) => (
            <button
              key={dept.departmentId}
              type="button"
              onClick={() => setSelectedDepartmentId(dept.departmentId)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                selectedDepartmentId === dept.departmentId
                  ? 'bg-[#1D5BB8] text-white border-[#1D5BB8] shadow-sm'
                  : 'bg-white text-slate-700 border-[#C7D6EA] hover:bg-[#EDF3FB]'
              }`}
            >
              {dept.departmentName} ({dept.occupied}/{dept.total} • {dept.occupancyRate}%)
            </button>
          ))}
        </div>
      )}

      {/* Status & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Tất cả trạng thái' },
            { id: 'AVAILABLE', label: 'Giường trống' },
            { id: 'OCCUPIED', label: 'Đang sử dụng' },
            { id: 'MAINTENANCE', label: 'Bảo trì' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id as 'ALL' | BedStatus)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                statusFilter === st.id
                  ? 'bg-[#DCEAFB] border-[#1D5BB8] text-[#1D5BB8]'
                  : 'bg-white border-[#C7D6EA] text-slate-600 hover:bg-[#EDF3FB]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Tìm số giường, phòng, tên BN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Visual Ward / Room / Bed Board */}
      {loading ? (
        <Spinner label="Đang tải sơ đồ giường bệnh..." />
      ) : groupedByDeptAndRoom.length === 0 ? (
        <EmptyState
          icon={<BedDouble className="h-6 w-6" />}
          title="Không tìm thấy giường bệnh phù hợp"
          description="Thử thay đổi bộ lọc khoa hoặc trạng thái giường."
        />
      ) : (
        <div className="space-y-6">
          {groupedByDeptAndRoom.map((dept) => (
            <Card key={dept.departmentId} className="overflow-hidden">
              <CardHeader className="bg-[#EDF3FB] py-3.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#1D5BB8]" />
                  <CardTitle className="text-base">{dept.departmentName}</CardTitle>
                </div>
                <Badge variant="blue" size="sm">
                  {dept.rooms.reduce((s, r) => s + r.beds.length, 0)} giường hiển thị
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                {dept.rooms.map((room) => (
                  <div key={room.roomId} className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      <span>
                        {room.roomName} ({room.roomCode})
                      </span>
                      {room.floor && <span className="text-slate-600">• {room.floor}</span>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {room.beds.map((bed) => {
                        const isOccupied = bed.status === 'OCCUPIED';
                        const isAvailable = bed.status === 'AVAILABLE';
                        const isMaint = bed.status === 'MAINTENANCE';

                        return (
                          <div
                            key={bed.id}
                            className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                              isOccupied
                                ? 'bg-[#EDF3FB] border-[#7BA7DF]'
                                : isAvailable
                                  ? 'bg-white border-emerald-300'
                                  : 'bg-amber-50/40 border-amber-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 font-extrabold text-sm text-slate-900">
                                  <BedDouble
                                    className={`h-4 w-4 ${
                                      isOccupied
                                        ? 'text-[#1D5BB8]'
                                        : isAvailable
                                          ? 'text-emerald-700'
                                          : 'text-amber-800'
                                    }`}
                                  />
                                  {bed.bedNumber}
                                </span>
                                <BedStatusBadge status={bed.status} />
                              </div>

                              {isOccupied && bed.currentPatient ? (
                                <div className="p-2.5 rounded-xl bg-white border border-[#C7D6EA] text-xs space-y-0.5">
                                  <p className="font-bold text-slate-900 truncate">
                                    {bed.currentPatient.fullName}
                                  </p>
                                  <p className="text-slate-600 font-mono text-[11px]">
                                    {bed.currentPatient.patientCode}
                                    {bed.currentPatient.phone
                                      ? ` • ${bed.currentPatient.phone}`
                                      : ''}
                                  </p>
                                  {bed.admittedAt && (
                                    <p className="text-[11px] text-slate-600">
                                      Nhập viện: {formatDateTimeVN(bed.admittedAt)}
                                    </p>
                                  )}
                                </div>
                              ) : isAvailable ? (
                                <p className="text-xs text-emerald-800 font-medium">
                                  Sẵn sàng tiếp nhận bệnh nhân nội trú.
                                </p>
                              ) : (
                                <p className="text-xs text-amber-800">
                                  {bed.notes || 'Giường đang bảo trì / vệ sinh.'}
                                </p>
                              )}

                              {isOccupied && bed.notes && (
                                <p className="text-[11px] text-slate-600 line-clamp-2">
                                  Ghi chú: {bed.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#C7D6EA]">
                              {isAvailable && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="xs"
                                    leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                                    onClick={() => setAdmitBed(bed)}
                                  >
                                    Nhập viện
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    loading={busyBedId === bed.id}
                                    leftIcon={<Wrench className="h-3.5 w-3.5" />}
                                    onClick={() => void handleToggleMaintenance(bed)}
                                  >
                                    Bảo trì
                                  </Button>
                                </>
                              )}
                              {isOccupied && (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                                    onClick={() => setTransferBed(bed)}
                                  >
                                    Chuyển giường
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    leftIcon={<LogOut className="h-3.5 w-3.5 text-rose-800" />}
                                    onClick={() => setDischargeBed(bed)}
                                  >
                                    Xuất viện
                                  </Button>
                                </>
                              )}
                              {isMaint && (
                                <Button
                                  variant="success"
                                  size="xs"
                                  loading={busyBedId === bed.id}
                                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                  onClick={() => void handleToggleMaintenance(bed)}
                                >
                                  Mở lại giường
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admit Modal */}
      <Modal
        open={Boolean(admitBed)}
        onClose={() => setAdmitBed(null)}
        title={`Tiếp nhận Bệnh nhân vào Giường ${admitBed?.bedNumber || ''}`}
        description={
          admitBed ? `${admitBed.roomName} • ${admitBed.departmentName}` : undefined
        }
      >
        <form onSubmit={handleAdmit} className="space-y-4">
          <Input
            label="Tìm bệnh nhân"
            placeholder="Nhập tên, mã BN hoặc SĐT..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            label="Chọn bệnh nhân nhập viện"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            required
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.patientCode}] {p.fullName} — {p.phone || p.email}
              </option>
            ))}
          </Select>
          <Textarea
            label="Ghi chú nhập viện / Chẩn đoán theo dõi"
            placeholder="Ví dụ: Theo dõi sốt xuất huyết ngày 3..."
            value={admitNotes}
            onChange={(e) => setAdmitNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdmitBed(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Xác nhận xếp giường
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        open={Boolean(transferBed)}
        onClose={() => setTransferBed(null)}
        title={`Chuyển giường cho ${transferBed?.currentPatient?.fullName || ''}`}
        description={
          transferBed
            ? `Từ giường ${transferBed.bedNumber} (${transferBed.roomName} • ${transferBed.departmentName})`
            : undefined
        }
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <Select
            label="Chọn giường đích còn trống"
            value={targetBedId}
            onChange={(e) => setTargetBedId(e.target.value)}
            required
          >
            {availableBedsForTransfer.map((b) => (
              <option key={b.id} value={b.id}>
                {b.departmentName} • {b.roomName} • Giường {b.bedNumber}
              </option>
            ))}
          </Select>
          <Textarea
            label="Lý do chuyển giường"
            placeholder="Ví dụ: Chuyển phòng theo dõi chuyên sâu..."
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransferBed(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={availableBedsForTransfer.length === 0}
            >
              Xác nhận chuyển giường
            </Button>
          </div>
        </form>
      </Modal>

      {/* Discharge Modal */}
      <Modal
        open={Boolean(dischargeBed)}
        onClose={() => setDischargeBed(null)}
        title={`Xuất viện & Trả giường ${dischargeBed?.bedNumber || ''}`}
        description={
          dischargeBed?.currentPatient
            ? `Bệnh nhân: ${dischargeBed.currentPatient.fullName} (${dischargeBed.currentPatient.patientCode})`
            : undefined
        }
      >
        <form onSubmit={handleDischarge} className="space-y-4">
          <Textarea
            label="Ghi chú xuất viện"
            placeholder="Tình trạng ổn định, hoàn tất thủ tục ra viện..."
            value={dischargeNotes}
            onChange={(e) => setDischargeNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDischargeBed(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Xác nhận xuất viện
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
