import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Building2,
  CalendarPlus,
  MapPin,
  Search,
  Stethoscope,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import type { DepartmentDto, DoctorDto } from '@/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
} from '@/components/ui';

export const DoctorsDirectoryView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [onlyOnDuty, setOnlyOnDuty] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDto | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [depts, docs] = await Promise.all([
          publicApi.getDepartments(),
          publicApi.getDoctors(),
        ]);
        setDepartments(depts);
        setDoctors(docs);
      } catch {
        setError('Không thể tải danh sách bác sĩ.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (departmentId && d.department.id !== departmentId) return false;
      if (onlyOnDuty && !d.isOnDuty) return false;
      if (!q) return true;
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.department.name.toLowerCase().includes(q) ||
        d.doctorCode.toLowerCase().includes(q)
      );
    });
  }, [doctors, departmentId, onlyOnDuty, search]);

  const handleBookWithDoctor = (doc: DoctorDto) => {
    const targetUrl = `/patient/book?flow=BY_DOCTOR&doctorId=${doc.id}`;
    if (user?.role === 'PATIENT') {
      navigate(targetUrl);
    } else if (!user) {
      navigate('/login', { state: { from: targetUrl } });
    } else {
      navigate('/patient/book');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className={embedded ? 'text-xl sm:text-2xl font-extrabold text-slate-900' : 'text-2xl font-extrabold text-slate-900'}>
            Đội ngũ Bác sĩ An Tâm
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Tra cứu bác sĩ theo chuyên khoa, phòng khám và đặt lịch theo buổi nhanh chóng.
          </p>
        </div>
        <Badge variant="blue" className="self-start sm:self-auto">
          {filteredDoctors.length} bác sĩ
        </Badge>
      </div>

      {/* Filter Bar */}
      <Card padding="sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5">
            <Input
              placeholder="Tìm tên bác sĩ, mã BS, chuyên khoa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="md:col-span-4">
            <Select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[
                { value: '', label: 'Tất cả chuyên khoa' },
                ...departments.map((dep) => ({ value: dep.id, label: dep.name })),
              ]}
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-2">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOnDuty}
                onChange={(e) => setOnlyOnDuty(e.target.checked)}
                className="h-4 w-4 rounded border-[#9FB5D0] text-[#1D5BB8] focus:ring-[#1D5BB8]"
              />
              Đang trực hôm nay
            </label>
          </div>
        </div>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Đang tải danh sách bác sĩ..." />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Không tìm thấy bác sĩ phù hợp"
          description="Thử thay đổi từ khóa tìm kiếm hoặc bỏ lọc chuyên khoa."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setDepartmentId('');
                setOnlyOnDuty(false);
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDoctors.map((doc) => {
            const initials = doc.fullName
              .split(' ')
              .filter(Boolean)
              .slice(-2)
              .map((w) => w[0]?.toUpperCase())
              .join('');

            return (
              <Card key={doc.id} padding="md" className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC] font-extrabold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1D5BB8]">{doc.doctorCode}</p>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {doc.title ? `${doc.title} ` : ''}
                          {doc.fullName}
                        </h3>
                        <p className="text-xs text-slate-600 truncate">{doc.specialty}</p>
                      </div>
                    </div>
                    <Badge variant={doc.isOnDuty ? 'emerald' : 'slate'} dot={doc.isOnDuty} size="sm">
                      {doc.isOnDuty ? 'Đang trực' : 'Nghỉ'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-900">{doc.department.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>{doc.room ? `${doc.room.name} (${doc.room.floor || 'Tầng 1'})` : 'Chưa gán phòng'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>{doc.yearsOfExperience} năm kinh nghiệm</span>
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                      {doc.bio}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#C7D6EA] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-slate-600">Phí khám</p>
                    <p className="text-sm font-extrabold text-[#1D5BB8]">
                      {formatCurrencyVND(doc.consultationFee)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      Chi tiết
                    </Button>
                    {(!user || user.role === 'PATIENT') && (
                      <Button
                        size="sm"
                        leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                        onClick={() => handleBookWithDoctor(doc)}
                      >
                        Đặt lịch
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
        title={
          selectedDoctor
            ? `${selectedDoctor.title ? `${selectedDoctor.title} ` : ''}${selectedDoctor.fullName}`
            : ''
        }
        description={selectedDoctor ? `${selectedDoctor.specialty} • ${selectedDoctor.department.name}` : ''}
        footer={
          selectedDoctor && (
            <>
              <Button variant="outline" onClick={() => setSelectedDoctor(null)}>
                Đóng
              </Button>
              {(!user || user.role === 'PATIENT') && (
                <Button
                  leftIcon={<CalendarPlus className="h-4 w-4" />}
                  onClick={() => handleBookWithDoctor(selectedDoctor)}
                >
                  Đặt lịch với bác sĩ này
                </Button>
              )}
            </>
          )
        }
      >
        {selectedDoctor && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <div>
                <p className="text-xs text-slate-600">Mã bác sĩ</p>
                <p className="font-bold text-slate-900">{selectedDoctor.doctorCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Phòng khám</p>
                <p className="font-bold text-slate-900">
                  {selectedDoctor.room ? selectedDoctor.room.name : 'Đang cập nhật'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Kinh nghiệm</p>
                <p className="font-bold text-slate-900">{selectedDoctor.yearsOfExperience} năm</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Phí tư vấn khám</p>
                <p className="font-bold text-[#1D5BB8]">
                  {formatCurrencyVND(selectedDoctor.consultationFee)}
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Giới thiệu chuyên môn</h4>
              <p className="text-slate-600 leading-relaxed">
                {selectedDoctor.bio ||
                  'Bác sĩ giàu kinh nghiệm lâm sàng, tận tâm với người bệnh tại Bệnh viện Đa khoa An Tâm.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
