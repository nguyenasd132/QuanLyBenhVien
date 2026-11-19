import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HeartPulse, HelpCircle, LogIn, Stethoscope } from 'lucide-react';
import { useAuth, getRoleHomePath } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export const PublicPageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#EEF4FB] flex flex-col">
      <header className="sticky top-0 z-30 border-b border-[#C7D6EA] bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#1D5BB8] text-white flex items-center justify-center shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-slate-900 block leading-tight">
                An Tâm
              </span>
              <span className="text-[11px] text-slate-600 hidden sm:block">
                Bệnh viện Đa khoa & Cổng Sức khỏe
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/doctors"
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC]'
                    : 'text-slate-700 hover:bg-[#EDF3FB] hover:text-slate-900'
                )
              }
            >
              <Stethoscope className="h-4 w-4" />
              <span>Tìm bác sĩ</span>
            </NavLink>
            <NavLink
              to="/help"
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC]'
                    : 'text-slate-700 hover:bg-[#EDF3FB] hover:text-slate-900'
                )
              }
            >
              <HelpCircle className="h-4 w-4" />
              <span>Hỗ trợ</span>
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <Link to={getRoleHomePath(user.role)}>
                <Button size="sm">Vào Cổng của tôi</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" leftIcon={<LogIn className="h-4 w-4" />}>
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
};
