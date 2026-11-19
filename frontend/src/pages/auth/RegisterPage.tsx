import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartPulse, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { Alert, Button, Card, Input, Select, useToast } from '@/components/ui';
import type { Gender } from '@/types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: 'FEMALE' as Gender,
    address: '',
    nationalId: '',
    insuranceNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('Mật khẩu cần tối thiểu 6 ký tự.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        address: form.address.trim() || undefined,
        nationalId: form.nationalId.trim() || undefined,
        insuranceNumber: form.insuranceNumber.trim() || undefined,
      });
      toast.success('Đăng ký thành công', 'Tài khoản Bệnh nhân An Tâm đã sẵn sàng');
      navigate('/patient', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể đăng ký lúc này. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF4FB] flex flex-col">
      <header className="border-b border-[#C7D6EA] bg-white/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#1D5BB8] text-white flex items-center justify-center">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 block leading-tight">
                An Tâm
              </span>
              <span className="text-[11px] text-slate-600 block">Đăng ký Cổng Bệnh nhân</span>
            </div>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Về đăng nhập
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-2xl w-full p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Đăng ký tài khoản Bệnh nhân
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Tạo hồ sơ sức khỏe điện tử để đặt lịch khám trực tuyến và theo dõi STT theo thời gian
              thực.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn An"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                required
              />
              <Input
                label="Số điện thoại"
                placeholder="0901234567"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="nguyenvanan@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Ngày sinh"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
              <Select
                label="Giới tính"
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                options={[
                  { value: 'FEMALE', label: 'Nữ' },
                  { value: 'MALE', label: 'Nam' },
                  { value: 'OTHER', label: 'Khác' },
                ]}
              />
              <Input
                label="Số CCCD"
                placeholder="079095001234"
                value={form.nationalId}
                onChange={(e) => handleChange('nationalId', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Số thẻ BHYT (nếu có)"
                placeholder="GD4791234567890"
                value={form.insuranceNumber}
                onChange={(e) => handleChange('insuranceNumber', e.target.value)}
              />
              <Input
                label="Địa chỉ liên hệ"
                placeholder="Quận 3, TP. Hồ Chí Minh"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
              Hoàn tất đăng ký
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-slate-600 mt-5">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-[#1D5BB8] hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
};
