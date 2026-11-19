import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { getRoleHomePath, useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/types';
import { Spinner } from '@/components/ui';
import { LoginPage, RegisterPage } from '@/pages/auth';
import { DoctorsDirectoryView, HelpCenterView, PublicPageShell } from '@/pages/public';
import { PatientRoutes } from '@/pages/patient';
import { DoctorRoutes } from '@/pages/doctor';
import { NurseRoutes } from '@/pages/nurse';
import { AdminRoutes } from '@/pages/admin';

const FullPageLoading: React.FC = () => (
  <div className="min-h-screen bg-[#EEF4FB] flex flex-col items-center justify-center p-6">
    <div className="h-12 w-12 rounded-2xl bg-[#1D5BB8] text-white flex items-center justify-center shadow-md mb-3">
      <HeartPulse className="h-6 w-6" />
    </div>
    <Spinner label="Đang tải hệ thống An Tâm..." className="py-2" />
  </div>
);

const RequireRole: React.FC<{ allowedRoles: Role[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoading />;
  if (user) return <Navigate to={getRoleHomePath(user.role)} replace />;
  return <Navigate to="/login" replace />;
};

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoading />;
  if (user) return <Navigate to={getRoleHomePath(user.role)} replace />;
  return <>{children}</>;
};

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/login"
        element={
          <AuthGate>
            <LoginPage />
          </AuthGate>
        }
      />
      <Route
        path="/register"
        element={
          <AuthGate>
            <RegisterPage />
          </AuthGate>
        }
      />

      <Route
        path="/doctors"
        element={
          <PublicPageShell>
            <DoctorsDirectoryView />
          </PublicPageShell>
        }
      />
      <Route
        path="/help"
        element={
          <PublicPageShell>
            <HelpCenterView />
          </PublicPageShell>
        }
      />

      <Route
        path="/patient/*"
        element={
          <RequireRole allowedRoles={['PATIENT']}>
            <PatientRoutes />
          </RequireRole>
        }
      />
      <Route
        path="/doctor/*"
        element={
          <RequireRole allowedRoles={['DOCTOR']}>
            <DoctorRoutes />
          </RequireRole>
        }
      />
      <Route
        path="/nurse/*"
        element={
          <RequireRole allowedRoles={['NURSE']}>
            <NurseRoutes />
          </RequireRole>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RequireRole allowedRoles={['ADMIN']}>
            <AdminRoutes />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
