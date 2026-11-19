import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUserDto, Role } from '@/types';
import {
  authApi,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
  type RegisterPayload,
} from '@/lib/api';

export interface DemoAccountInfo {
  role: Role;
  roleLabel: string;
  name: string;
  email: string;
  password: string;
  note: string;
}

export const DEMO_ACCOUNTS: DemoAccountInfo[] = [
  {
    role: 'PATIENT',
    roleLabel: 'Bệnh nhân',
    name: 'Lê Minh Anh',
    email: 'minhanh.patient@antam.vn',
    password: '123456',
    note: 'BN-08250 • Cổng sức khỏe cá nhân',
  },
  {
    role: 'DOCTOR',
    roleLabel: 'Bác sĩ',
    name: 'BS. Hoàng Minh Long',
    email: 'long.doctor@antam.vn',
    password: '123456',
    note: 'BS-001 • Nội tổng quát • Phòng 201',
  },
  {
    role: 'NURSE',
    roleLabel: 'Điều dưỡng',
    name: 'ĐD. Phạm Thị Mai',
    email: 'mai.nurse@antam.vn',
    password: '123456',
    note: 'DD-001 • Tiếp nhận, Thu ngân & Giường bệnh',
  },
  {
    role: 'ADMIN',
    roleLabel: 'Giám đốc BV',
    name: 'Minh Anh',
    email: 'admin@antam.vn',
    password: '123456',
    note: 'Quản trị toàn diện & Dashboard bệnh viện',
  },
];

interface AuthContextValue {
  user: AuthUserDto | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUserDto>;
  register: (payload: RegisterPayload) => Promise<AuthUserDto>;
  logout: () => void;
  refreshUser: () => Promise<AuthUserDto | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getRoleHomePath(role: Role): string {
  switch (role) {
    case 'PATIENT':
      return '/patient';
    case 'DOCTOR':
      return '/doctor';
    case 'NURSE':
      return '/nurse';
    case 'ADMIN':
      return '/admin';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const refreshUser = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }
    try {
      const res = await authApi.me();
      setUser(res.user);
      setToken(activeToken);
      return res.user;
    } catch {
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (getStoredToken()) {
      void refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authApi.register(payload);
    setStoredToken(res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
