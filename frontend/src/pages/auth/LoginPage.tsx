import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { DEMO_ACCOUNTS, getRoleHomePath, useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { Alert, Button, Card, Input, useToast } from '@/components/ui';
import type { Role } from '@/types';

const roleIconMap: Record<Role, React.ReactNode> = {
  PATIENT: <UserCheck className="h-4 w-4" />,
  DOCTOR: <Stethoscope className="h-4 w-4" />,
  NURSE: <HeartPulse className="h-4 w-4" />,
  ADMIN: <ShieldCheck className="h-4 w-4" />,
};

const roleColorMap: Record<Role, string> = {
  PATIENT: 'bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC]',
  DOCTOR: 'bg-teal-100 text-teal-900 border border-teal-300',
  NURSE: 'bg-violet-100 text-violet-900 border border-violet-300',
  ADMIN: 'bg-amber-100 text-amber-900 border border-amber-300',
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fromPath = (location.state as { from?: string } | null)?.from;

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await login(loginEmail.trim(), loginPass);
      toast.success(`Chào mừng ${loggedUser.fullName}`, 'Đăng nhập hệ thống thành công');
      const target = fromPath || getRoleHomePath(loggedUser.role);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      setDemoLoadingEmail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    await performLogin(email, password);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setDemoLoadingEmail(demoEmail);
    await performLogin(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen bg-[#EEF4FB] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[#C7D6EA] bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#1D5BB8] text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 block leading-tight">
                An Tâm
              </span>
              <span className="text-[11px] text-slate-600 block">
                Bệnh viện Đa khoa & Cổng Sức khỏe
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/doctors"
              className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-[#DCEAFB] hover:text-[#15458E] transition-colors"
            >
              Tìm bác sĩ
            </Link>
            <Link
              to="/help"
              className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-[#DCEAFB] hover:text-[#15458E] transition-colors"
            >
              Hỗ trợ
            </Link>
            <Link to="/register">
              <Button size="sm" variant="secondary">
                Đăng ký
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Hero Info + Demo Accounts */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-5">
            <div className="rounded-3xl bg-gradient-to-br from-[#1D5BB8] via-[#164996] to-[#0F3570] text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/30 text-xs font-semibold mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  Hệ thống Y tế Thông minh An Tâm
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Chăm sóc sức khỏe toàn diện, đặt lịch theo buổi & cấp STT tự động
                </h1>
                <p className="text-white/95 text-sm mt-3 leading-relaxed">
                  Kết nối liền mạch giữa Bệnh nhân, Bác sĩ, Điều dưỡng và Ban Giám đốc bệnh viện
                  trên một nền tảng thống nhất.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 border border-white/30">
                    <CalendarCheck2 className="h-5 w-5 text-blue-50 mb-1.5" />
                    <p className="text-xs font-bold">Đặt lịch 3 luồng</p>
                    <p className="text-[11px] text-white/95 mt-0.5">
                      Theo khoa, bác sĩ hoặc ngày • Buổi Sáng / Chiều
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 border border-white/30">
                    <Users className="h-5 w-5 text-blue-50 mb-1.5" />
                    <p className="text-xs font-bold">4 Cổng chuyên biệt</p>
                    <p className="text-[11px] text-white/95 mt-0.5">
                      Bệnh nhân • Bác sĩ • Điều dưỡng • Giám đốc
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 1-Click Demo Selector */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Đăng nhập nhanh tài khoản Demo
                  </h2>
                  <p className="text-xs text-slate-600">
                    Chọn 1 chạm để trải nghiệm từng vai trò (mật khẩu mặc định:{' '}
                    <code className="px-1.5 py-0.5 rounded bg-[#E8F0FA] border border-[#C7D6EA] text-[#15458E] font-bold">
                      123456
                    </code>
                    )
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isBusy = demoLoadingEmail === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onClick={() => void handleDemoLogin(acc.email, acc.password)}
                      className="text-left p-3 rounded-2xl border border-[#C7D6EA] bg-[#EDF3FB] hover:bg-[#DCEAFB] hover:border-[#7B99BE] transition-all group disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${roleColorMap[acc.role]}`}
                        >
                          {roleIconMap[acc.role]}
                          {acc.roleLabel}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-[#1D5BB8] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {isBusy ? 'Đang đăng nhập...' : acc.name}
                      </p>
                      <p className="text-[11px] text-slate-700 truncate mt-0.5">{acc.note}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Login Form */}
          <Card className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Đăng nhập</h2>
              <p className="text-sm text-slate-600 mt-1">
                Truy cập Cổng Sức khỏe hoặc Cổng Nghiệp vụ Bệnh viện An Tâm
              </p>
            </div>

            {error && (
              <Alert variant="error" className="mb-5">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email tài khoản"
                type="email"
                placeholder="name@antam.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                required
              />

              <Input
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-slate-600 hover:text-slate-900"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="current-password"
                required
              />

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                loading={loading && !demoLoadingEmail}
              >
                Đăng nhập vào hệ thống
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#C7D6EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="text-slate-600">Chưa có tài khoản bệnh nhân?</span>
              <Link
                to="/register"
                className="font-bold text-[#1D5BB8] hover:underline inline-flex items-center gap-1"
              >
                Đăng ký tài khoản mới
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};
