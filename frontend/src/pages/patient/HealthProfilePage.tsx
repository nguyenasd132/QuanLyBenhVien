import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  HeartPulse,
  Phone,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, patientApi } from '@/lib/api';
import { formatDateVN } from '@/lib/format';
import type {
  AllergyItem,
  ChronicConditionItem,
  Gender,
  MedicalRecordDto,
  PatientSummaryDto,
  PrescriptionDto,
} from '@/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PrescriptionStatusBadge,
  Select,
  Spinner,
  useToast,
} from '@/components/ui';

export const HealthProfilePage: React.FC = () => {
  const { refreshUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<PatientSummaryDto | null>(null);
  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [bloodType, setBloodType] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [address, setAddress] = useState('');

  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [newAllergyName, setNewAllergyName] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState<'MILD' | 'MODERATE' | 'SEVERE'>(
    'MODERATE'
  );
  const [newAllergyReaction, setNewAllergyReaction] = useState('');

  const [chronicConditions, setChronicConditions] = useState<ChronicConditionItem[]>([]);
  const [newCondName, setNewCondName] = useState('');
  const [newCondYear, setNewCondYear] = useState('');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prof, recs, rxs] = await Promise.all([
          patientApi.getProfile(),
          patientApi.getRecords(),
          patientApi.getPrescriptions(),
        ]);
        setProfile(prof);
        setRecords(recs);
        setPrescriptions(rxs);

        setFullName(prof.fullName || '');
        setPhone(prof.phone || '');
        setDateOfBirth(prof.dateOfBirth ? prof.dateOfBirth.slice(0, 10) : '');
        setGender(prof.gender || 'FEMALE');
        setBloodType(prof.bloodType || '');
        setNationalId(prof.nationalId || '');
        setInsuranceNumber(prof.insuranceNumber || '');
        setAddress(prof.address || '');
        setAllergies(prof.allergies || []);
        setChronicConditions(prof.chronicConditions || []);
        setEmergencyName(prof.emergencyContact?.name || '');
        setEmergencyRel(prof.emergencyContact?.relationship || '');
        setEmergencyPhone(prof.emergencyContact?.phone || '');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Không thể tải hồ sơ sức khỏe.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleAddAllergy = () => {
    if (!newAllergyName.trim()) return;
    setAllergies((prev) => [
      ...prev,
      {
        name: newAllergyName.trim(),
        severity: newAllergySeverity,
        reaction: newAllergyReaction.trim() || undefined,
      },
    ]);
    setNewAllergyName('');
    setNewAllergyReaction('');
  };

  const handleAddCondition = () => {
    if (!newCondName.trim()) return;
    setChronicConditions((prev) => [
      ...prev,
      {
        name: newCondName.trim(),
        diagnosedYear: newCondYear ? Number(newCondYear) : undefined,
      },
    ]);
    setNewCondName('');
    setNewCondYear('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await patientApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || null,
        gender,
        bloodType: bloodType || null,
        nationalId: nationalId.trim() || null,
        insuranceNumber: insuranceNumber.trim() || null,
        address: address.trim() || null,
        allergies,
        chronicConditions,
        emergencyContact:
          emergencyName.trim() && emergencyPhone.trim()
            ? {
                name: emergencyName.trim(),
                relationship: emergencyRel.trim() || 'Người thân',
                phone: emergencyPhone.trim(),
              }
            : null,
      });
      setProfile(updated);
      await refreshUser();
      toast.success('Đã lưu hồ sơ sức khỏe', 'Thông tin dị ứng và BHYT đã được cập nhật.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner label="Đang tải hồ sơ sức khỏe..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hồ sơ sức khỏe điện tử</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Mã bệnh nhân: <strong className="text-[#1D5BB8]">{profile?.patientCode}</strong> •
            Thông tin dị ứng được bác sĩ kiểm tra tự động khi kê đơn thuốc.
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Personal Info */}
        <Card padding="md">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[#1D5BB8]" />
            Thông tin cá nhân & Bảo hiểm Y tế
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input
              label="Ngày sinh"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <Select
              label="Giới tính"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              options={[
                { value: 'FEMALE', label: 'Nữ' },
                { value: 'MALE', label: 'Nam' },
                { value: 'OTHER', label: 'Khác' },
              ]}
            />
            <Select
              label="Nhóm máu"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              options={[
                { value: '', label: 'Chưa xác định' },
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
              ]}
            />
            <Input label="Số CCCD" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
            <Input
              label="Số thẻ BHYT"
              placeholder="Ví dụ: GD4791234567890"
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Địa chỉ thường trú"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Allergies & Chronic Conditions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                Tiền sử dị ứng (thuốc, thực phẩm)
              </h2>
              <Badge variant={allergies.length > 0 ? 'rose' : 'slate'}>
                {allergies.length} mục
              </Badge>
            </div>

            {allergies.length === 0 ? (
              <p className="text-xs text-slate-600 p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                Chưa ghi nhận dị ứng. Nếu bạn dị ứng với kháng sinh (ví dụ Penicillin, Amoxicillin)
                hãy thêm vào đây để bác sĩ nhận cảnh báo tức thì.
              </p>
            ) : (
              <div className="space-y-2">
                {allergies.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-100/75 border border-rose-300"
                  >
                    <div>
                      <p className="text-sm font-bold text-rose-900">{item.name}</p>
                      <p className="text-xs text-rose-800">
                        Mức độ: {item.severity || 'MODERATE'}
                        {item.reaction ? ` • Phản ứng: ${item.reaction}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllergies((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-200/70"
                      aria-label="Xóa dị ứng"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#C7D6EA] grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-5">
                <Input
                  label="Tên chất / thuốc dị ứng"
                  placeholder="VD: Penicillin"
                  value={newAllergyName}
                  onChange={(e) => setNewAllergyName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Select
                  label="Mức độ"
                  value={newAllergySeverity}
                  onChange={(e) =>
                    setNewAllergySeverity(e.target.value as 'MILD' | 'MODERATE' | 'SEVERE')
                  }
                  options={[
                    { value: 'MILD', label: 'Nhẹ' },
                    { value: 'MODERATE', label: 'Trung bình' },
                    { value: 'SEVERE', label: 'Nặng' },
                  ]}
                />
              </div>
              <div className="sm:col-span-4 flex gap-2">
                <Input
                  label="Biểu hiện"
                  placeholder="Phát ban..."
                  value={newAllergyReaction}
                  onChange={(e) => setNewAllergyReaction(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="self-end shrink-0"
                  onClick={handleAddAllergy}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Bệnh lý nền / Mãn tính
              </h2>
              <Badge variant={chronicConditions.length > 0 ? 'amber' : 'slate'}>
                {chronicConditions.length} mục
              </Badge>
            </div>

            {chronicConditions.length === 0 ? (
              <p className="text-xs text-slate-600 p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                Chưa ghi nhận bệnh mãn tính (tăng huyết áp, tiểu đường, hen suyễn...).
              </p>
            ) : (
              <div className="space-y-2">
                {chronicConditions.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-100/75 border border-amber-300"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      {item.diagnosedYear && (
                        <p className="text-xs text-slate-700">Năm phát hiện: {item.diagnosedYear}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setChronicConditions((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-200/70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#C7D6EA] grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-7">
                <Input
                  label="Tên bệnh nền"
                  placeholder="VD: Tăng huyết áp"
                  value={newCondName}
                  onChange={(e) => setNewCondName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Năm chẩn đoán"
                  type="number"
                  placeholder="2022"
                  value={newCondYear}
                  onChange={(e) => setNewCondYear(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="button" variant="secondary" onClick={handleAddCondition}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Emergency Contact + Save */}
        <Card padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#1D5BB8]" />
              Liên hệ khẩn cấp
            </h2>
            <Button type="submit" loading={saving} leftIcon={<Save className="h-4 w-4" />}>
              Lưu thay đổi hồ sơ
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Họ tên người liên hệ"
              placeholder="Nguyễn Thị Hoa"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
            <Input
              label="Mối quan hệ"
              placeholder="Mẹ / Vợ / Chồng / Anh..."
              value={emergencyRel}
              onChange={(e) => setEmergencyRel(e.target.value)}
            />
            <Input
              label="Số điện thoại khẩn cấp"
              placeholder="0909888777"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </Card>
      </form>

      {/* Visit & Prescription History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#1D5BB8]" />
              Lịch sử khám bệnh ({records.length})
            </h2>
            <Link to="/patient/records" className="text-xs font-semibold text-[#1D5BB8] hover:underline">
              Xem chi tiết →
            </Link>
          </div>
          {records.length === 0 ? (
            <EmptyState title="Chưa có hồ sơ khám bệnh" />
          ) : (
            <div className="space-y-2.5">
              {records.slice(0, 5).map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1D5BB8]">{r.recordCode}</span>
                    <span className="text-xs text-slate-600">{formatDateVN(r.appointmentDate)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{r.diagnosis}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {r.departmentName} • {r.doctorName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">
              Lịch sử đơn thuốc ({prescriptions.length})
            </h2>
            <Link to="/patient/records" className="text-xs font-semibold text-[#1D5BB8] hover:underline">
              Xem tất cả →
            </Link>
          </div>
          {prescriptions.length === 0 ? (
            <EmptyState title="Chưa có đơn thuốc nào" />
          ) : (
            <div className="space-y-2.5">
              {prescriptions.slice(0, 5).map((rx) => (
                <div key={rx.id} className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{rx.prescriptionCode}</span>
                    <PrescriptionStatusBadge status={rx.status} />
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    BS. {rx.doctorName} • {rx.items.length} loại thuốc
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatDateVN(rx.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
