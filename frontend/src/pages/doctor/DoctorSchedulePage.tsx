import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Plus,
  Power,
  Users,
} from 'lucide-react';
import { doctorApi } from '@/lib/api';
import { formatDateVN, getSessionShortLabel, getTodayISODate } from '@/lib/format';
import type { DoctorScheduleDto, SessionType } from '@/types';
import {
  Badge,
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

function addDaysISO(baseIso: string, delta: number): string {
  const d = new Date(`${baseIso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DoctorSchedulePage: React.FC = () => {
  const toast = useToast();
  const [startDate, setStartDate] = useState<string>(getTodayISODate());
  const [schedules, setSchedules] = useState<DoctorScheduleDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorScheduleDto | null>(null);
  const [formDate, setFormDate] = useState<string>(getTodayISODate());
  const [formSession, setFormSession] = useState<SessionType>('MORNING');
  const [formMaxPatients, setFormMaxPatients] = useState<number>(20);
  const [formAvgMinutes, setFormAvgMinutes] = useState<number>(12);
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const endDate = useMemo(() => addDaysISO(startDate, 6), [startDate]);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await doctorApi.getSchedules({ from: startDate, to: endDate });
      setSchedules(data);
    } catch (err) {
      toast.error(
        'Không thể tải lịch làm việc',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysISO(startDate, i));
  }, [startDate]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, DoctorScheduleDto>();
    schedules.forEach((s) => {
      map.set(`${s.scheduleDate}_${s.session}`, s);
    });
    return map;
  }, [schedules]);

  const openCreateModal = (date: string, session: SessionType) => {
    setEditingSchedule(null);
    setFormDate(date);
    setFormSession(session);
    setFormMaxPatients(20);
    setFormAvgMinutes(12);
    setFormAvailable(true);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEditModal = (s: DoctorScheduleDto) => {
    setEditingSchedule(s);
    setFormDate(s.scheduleDate);
    setFormSession(s.session);
    setFormMaxPatients(s.maxPatients);
    setFormAvgMinutes(s.avgMinutesPerPatient);
    setFormAvailable(s.isAvailable);
    setFormNotes(s.notes || '');
    setModalOpen(true);
  };

  const handleToggleAvailability = async (s: DoctorScheduleDto) => {
    setSavingId(s.id);
    try {
      await doctorApi.updateSchedule(s.id, { isAvailable: !s.isAvailable });
      toast.success(
        !s.isAvailable ? 'Đã mở lại buổi khám' : 'Đã tạm ngưng buổi khám',
        `${formatDateVN(s.scheduleDate)} • ${getSessionShortLabel(s.session)}`
      );
      await loadSchedules();
    } catch (err) {
      toast.error(
        'Cập nhật lịch thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSchedule) {
        await doctorApi.updateSchedule(editingSchedule.id, {
          maxPatients: Number(formMaxPatients),
          avgMinutesPerPatient: Number(formAvgMinutes),
          isAvailable: formAvailable,
          notes: formNotes.trim() || undefined,
        });
        toast.success('Đã cập nhật cấu hình buổi khám');
      } else {
        await doctorApi.upsertSchedule({
          date: formDate,
          session: formSession,
          maxPatients: Number(formMaxPatients),
          avgMinutesPerPatient: Number(formAvgMinutes),
          isAvailable: formAvailable,
          notes: formNotes.trim() || undefined,
        });
        toast.success('Đã tạo / cập nhật lịch khám mới');
      }
      setModalOpen(false);
      await loadSchedules();
    } catch (err) {
      toast.error(
        'Không thể lưu lịch khám',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra lại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Lịch làm việc theo Buổi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Điều chỉnh trạng thái mở nhận bệnh và giới hạn lượt khám tối đa cho từng Buổi Sáng /
            Buổi Chiều.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => setStartDate((d) => addDaysISO(d, -7))}
          >
            Tuần trước
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(getTodayISODate())}>
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight className="h-4 w-4" />}
            onClick={() => setStartDate((d) => addDaysISO(d, 7))}
          >
            Tuần sau
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => openCreateModal(startDate, 'MORNING')}
          >
            Mở buổi khám
          </Button>
        </div>
      </div>

      <Card padding="sm" className="bg-[#EDF3FB]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Calendar className="h-4 w-4 text-[#1D5BB8]" />
            <span>
              Khoảng hiển thị: {formatDateVN(startDate)} – {formatDateVN(endDate)}
            </span>
          </div>
          <span>Buổi Sáng: 07:30 - 11:30 • Buổi Chiều: 13:30 - 17:00</span>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Đang tải lịch làm việc..." />
      ) : weekDates.length === 0 ? (
        <EmptyState title="Không có lịch" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {weekDates.map((dateStr) => {
            const morning = scheduleMap.get(`${dateStr}_MORNING`);
            const afternoon = scheduleMap.get(`${dateStr}_AFTERNOON`);
            const dayName = new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN', {
              weekday: 'long',
            });
            const isToday = dateStr === getTodayISODate();

            return (
              <Card key={dateStr} className={isToday ? 'border-[#1D5BB8] ring-1 ring-[#1D5BB8]/20' : ''}>
                <CardHeader className="py-3.5 bg-[#EDF3FB]">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm capitalize">{dayName}</CardTitle>
                      {isToday && (
                        <Badge variant="blue" size="sm">
                          Hôm nay
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{formatDateVN(dateStr)}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {(['MORNING', 'AFTERNOON'] as SessionType[]).map((sess) => {
                    const item = sess === 'MORNING' ? morning : afternoon;
                    if (!item) {
                      return (
                        <div
                          key={sess}
                          className="p-3 rounded-xl border border-dashed border-[#9EC0EC] bg-[#EDF3FB] flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {getSessionShortLabel(sess)}
                            </p>
                            <p className="text-[11px] text-slate-600">Chưa mở lịch khám</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="xs"
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => openCreateModal(dateStr, sess)}
                          >
                            Mở lịch
                          </Button>
                        </div>
                      );
                    }

                    const pct = item.maxPatients
                      ? Math.min(100, Math.round((item.bookedCount / item.maxPatients) * 100))
                      : 0;

                    return (
                      <div
                        key={sess}
                        className={`p-3.5 rounded-xl border transition-colors ${
                          item.isAvailable
                            ? 'bg-white border-[#C7D6EA]'
                            : 'bg-slate-50 border-slate-300 opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#1D5BB8]" />
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {getSessionShortLabel(sess)}
                            </span>
                            <span className="text-[11px] text-slate-600">
                              ({item.startTime} - {item.endTime})
                            </span>
                          </div>
                          <Badge variant={item.isAvailable ? 'emerald' : 'slate'} size="sm" dot>
                            {item.isAvailable ? 'Đang mở' : 'Tạm nghỉ'}
                          </Badge>
                        </div>

                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-slate-600" />
                              Đã đặt: <strong>{item.bookedCount}</strong> / {item.maxPatients} lượt
                            </span>
                            <span className="text-[11px] text-slate-600">
                              ~{item.avgMinutesPerPatient} phút/BN
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#DCEAFB] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1D5BB8] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-slate-600 mt-2 italic">"{item.notes}"</p>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={<Edit3 className="h-3 w-3" />}
                            onClick={() => openEditModal(item)}
                          >
                            Điều chỉnh
                          </Button>
                          <Button
                            variant={item.isAvailable ? 'ghost' : 'secondary'}
                            size="xs"
                            leftIcon={<Power className="h-3 w-3" />}
                            loading={savingId === item.id}
                            onClick={() => void handleToggleAvailability(item)}
                          >
                            {item.isAvailable ? 'Tạm nghỉ' : 'Mở lại'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchedule ? 'Điều chỉnh lịch buổi khám' : 'Mở buổi khám mới'}
        description={`${formatDateVN(formDate)} • ${getSessionShortLabel(formSession)}`}
      >
        <form onSubmit={handleSaveModal} className="space-y-4">
          {!editingSchedule && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ngày khám"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
              <Select
                label="Buổi khám"
                value={formSession}
                onChange={(e) => setFormSession(e.target.value as SessionType)}
                options={[
                  { value: 'MORNING', label: 'Buổi Sáng (07:30 - 11:30)' },
                  { value: 'AFTERNOON', label: 'Buổi Chiều (13:30 - 17:00)' },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Số lượt khám tối đa (maxPatients)"
              type="number"
              min={1}
              max={60}
              value={formMaxPatients}
              onChange={(e) => setFormMaxPatients(Number(e.target.value))}
              required
            />
            <Input
              label="Thời gian TB mỗi BN (phút)"
              type="number"
              min={5}
              max={60}
              value={formAvgMinutes}
              onChange={(e) => setFormAvgMinutes(Number(e.target.value))}
              required
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] cursor-pointer">
            <input
              type="checkbox"
              checked={formAvailable}
              onChange={(e) => setFormAvailable(e.target.checked)}
              className="h-4 w-4 rounded text-[#1D5BB8] focus:ring-[#1D5BB8]"
            />
            <span className="text-sm font-semibold text-slate-800">
              Mở cho phép bệnh nhân đặt lịch trong buổi này
            </span>
          </label>

          <Textarea
            label="Ghi chú lịch khám"
            placeholder="Ví dụ: Khám ưu tiên tái khám tim mạch..."
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Lưu cấu hình
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
