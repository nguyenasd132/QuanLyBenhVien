import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  HeartPulse,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi } from '@/lib/api';
import type { NotificationDto, Role } from '@/types';
import { formatDateTimeVN } from '@/lib/format';

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: string | number;
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface AppShellProps {
  portalTitle: string;
  portalSubtitle?: string;
  navItems: NavItem[];
  mobileNavItems?: NavItem[];
  breadcrumbs?: BreadcrumbItem[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  headerActions?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

const roleBadgeLabels: Record<Role, string> = {
  PATIENT: 'Bệnh nhân',
  DOCTOR: 'Bác sĩ',
  NURSE: 'Điều dưỡng',
  ADMIN: 'Giám đốc BV',
};

export const AppShell: React.FC<AppShellProps> = ({
  portalTitle,
  portalSubtitle = 'Bệnh viện Đa khoa An Tâm',
  navItems,
  mobileNavItems,
  breadcrumbs,
  searchPlaceholder = 'Tìm kiếm nhanh...',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  headerActions,
  sidebarFooter,
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localSearch, setLocalSearch] = useState(searchValue || '');

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchValue !== undefined) {
      setLocalSearch(searchValue);
    }
  }, [searchValue]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationsApi.list({ limit: 12 });
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore background notification fetch error
    }
  };

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.fullName || 'AT')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const bottomTabs = (mobileNavItems || navItems).slice(0, 5);

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border',
              isActive
                ? 'bg-[#DCEAFB] text-[#15458E] border-[#9EC0EC] shadow-soft'
                : 'border-transparent text-slate-700 hover:bg-[#EDF3FB] hover:text-slate-900'
            )
          }
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </span>
          {item.badge !== undefined && item.badge !== null && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#1D5BB8] text-white shrink-0">
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#EEF4FB] text-slate-900 flex">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 xl:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-[#C7D6EA] z-30">
        <div className="h-16 px-5 border-b border-[#C7D6EA] flex items-center gap-3 shrink-0">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[#1D5BB8] text-white flex items-center justify-center shadow-sm shrink-0">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-slate-900 leading-tight truncate">
                An Tâm
              </p>
              <p className="text-[11px] font-medium text-slate-600 truncate">{portalSubtitle}</p>
            </div>
          </Link>
        </div>

        <div className="px-4 pt-4 pb-1">
          <div className="px-3 py-2 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA] flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#15458E] truncate">{portalTitle}</span>
            {user && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-[#C7D6EA]">
                {roleBadgeLabels[user.role]}
              </span>
            )}
          </div>
        </div>

        {renderNavLinks(false)}

        <div className="p-3 border-t border-[#C7D6EA] space-y-2 shrink-0">
          {sidebarFooter}
          {user && (
            <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC] font-bold text-xs flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-[11px] text-slate-600 truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-100 transition-colors shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-[#C7D6EA] shadow-2xl z-10">
            <div className="h-16 px-4 border-b border-[#C7D6EA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#1D5BB8] text-white flex items-center justify-center">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">An Tâm</p>
                  <p className="text-[11px] text-slate-600">{portalTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-600 hover:bg-[#EDF3FB]"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(true)}
            {user && (
              <div className="p-3 border-t border-[#C7D6EA]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-700 bg-rose-100/80 border border-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-[#C7D6EA] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-[#EDF3FB] border border-[#9FB5D0]"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#1D5BB8] text-white flex items-center justify-center shrink-0">
                <HeartPulse className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 truncate">An Tâm</span>
            </div>

            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={`${crumb.label}-${idx}`}>
                    {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
                    {crumb.to ? (
                      <Link
                        to={crumb.to}
                        className="text-slate-600 hover:text-[#1D5BB8] font-medium truncate"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-bold text-slate-900 truncate">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            ) : (
              <div className="hidden md:block">
                <h1 className="text-sm font-bold text-slate-900">{portalTitle}</h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {(onSearchChange || onSearchSubmit) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchSubmit?.(localSearch);
                }}
                className="hidden sm:flex items-center relative w-52 md:w-64"
              >
                <Search className="h-4 w-4 text-slate-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    onSearchChange?.(e.target.value);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#9FB5D0] bg-[#EDF3FB] text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white focus:border-[#1D5BB8]"
                />
              </form>
            )}

            {headerActions}

            {/* Notification Bell Popover */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((o) => !o);
                    if (!notifOpen) void loadNotifications();
                  }}
                  className="relative p-2 rounded-xl border border-[#9FB5D0] bg-white hover:bg-[#EDF3FB] text-slate-700 transition-colors"
                  aria-label="Thông báo"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#C7D6EA] shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[#C7D6EA] flex items-center justify-between bg-[#EDF3FB]">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Thông báo</p>
                        <p className="text-[11px] text-slate-600">
                          {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D5BB8] hover:underline"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#C7D6EA]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-600">
                          Chưa có thông báo mới.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              if (!n.isRead) void handleMarkRead(n.id);
                            }}
                            className={cn(
                              'w-full text-left px-4 py-3 hover:bg-[#EDF3FB] transition-colors flex items-start gap-2.5',
                              !n.isRead && 'bg-[#DCEAFB]/55'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-1.5 h-2 w-2 rounded-full shrink-0',
                                n.isRead ? 'bg-slate-300' : 'bg-[#1D5BB8]'
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[11px] text-slate-600 mt-1">
                                {formatDateTimeVN(n.createdAt)}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Avatar Menu */}
            {user && (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-[#9FB5D0] bg-white hover:bg-[#EDF3FB] transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-[#DCEAFB] text-[#15458E] text-xs font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#C7D6EA] shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#C7D6EA]">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                      <p className="text-[11px] text-slate-600 truncate">{user.email}</p>
                    </div>
                    {user.role === 'PATIENT' && (
                      <Link
                        to="/patient/profile"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-[#EDF3FB]"
                      >
                        <UserIcon className="h-4 w-4 text-slate-600" />
                        Hồ sơ sức khỏe
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Tab Navigation */}
        {bottomTabs.length > 0 && (
          <nav
            className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[#C7D6EA] px-1 py-1.5 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${bottomTabs.length}, minmax(0, 1fr))` }}
          >
          {bottomTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-semibold transition-colors',
                  isActive ? 'text-[#15458E] bg-[#DCEAFB]' : 'text-slate-600 hover:text-slate-900'
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate max-w-full">{item.shortLabel || item.label}</span>
            </NavLink>
          ))}
        </nav>
        )}
      </div>
    </div>
  );
};
