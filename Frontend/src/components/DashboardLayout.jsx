import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Building2, ChevronDown, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Badge, Button, ThemeToggle, cx } from './ui';
import { initials, roleLabel } from '../utils/format';

export default function DashboardLayout({ navItems, workspaceLabel }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    API.get('/notifications')
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const activeItem = [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const homePath = navItems[0]?.path || '/';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/95 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-[73px] items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
          <Link to={homePath} className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">
                HCM Lite
              </span>
              <span className="block truncate text-[11px] font-medium text-muted">
                {workspaceLabel}
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 pt-5">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3.5 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-violet-500/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="h-4 w-4" />
              {roleLabel(user?.role)} access
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-indigo-700/70 dark:text-indigo-300/70">
              Your workspace is scoped to your role and permissions.
            </p>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
            Workspace
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeItem?.path === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                )}
              >
                <span
                  className={cx(
                    'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                    active
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{item.label}</span>
                {item.badge ? (
                  <Badge tone="rose" className="ml-auto">
                    {item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
              {initials(user?.firstName, user?.lastName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[11px] text-muted">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
            icon={LogOut}
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto flex h-[73px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle sm:block">
                  {workspaceLabel}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {activeItem?.label || 'Dashboard'}
                </p>
              </div>
            </div>

            <div ref={menuRef} className="relative flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />

              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNotifications((open) => !open);
                    setShowUserMenu(false);
                  }}
                  aria-label="Open notifications"
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </Button>

                {showNotifications ? (
                  <div className="absolute right-0 top-12 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                        <p className="text-[11px] text-muted">{unreadCount} unread</p>
                      </div>
                      <Badge tone={unreadCount ? 'indigo' : 'neutral'}>{notifications.length} total</Badge>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm text-muted">You are all caught up.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((notification) => (
                          <div
                            key={notification._id}
                            className={cx(
                              'border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800',
                              !notification.read && 'bg-indigo-50/50 dark:bg-indigo-500/5'
                            )}
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
                              {notification.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu((open) => !open);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Open account menu"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20">
                    {initials(user?.firstName, user?.lastName)}
                  </span>
                  <span className="hidden text-left xl:block">
                    <span className="block max-w-32 truncate text-xs font-semibold text-slate-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="block text-[10px] text-muted">{roleLabel(user?.role)}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
                </button>

                {showUserMenu ? (
                  <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                    <div className="px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="truncate text-[11px] text-muted">{user?.email}</p>
                    </div>
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                    {user?.role === 'employee' ? (
                      <Link
                        to="/employee/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        My profile
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-50/70 to-transparent dark:from-indigo-500/5" />
          <div className="relative mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="page-fade">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
