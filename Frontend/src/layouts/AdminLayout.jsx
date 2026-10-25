import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Users, Calendar, FileText, DollarSign, Settings, MessageSquare, LayoutDashboard, LogOut, Shield, Bell, Megaphone, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import API from '../services/api';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (user) {
      API.get('/notifications').then(res => setNotifications(res.data));
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users/HR' },
    { path: '/admin/employees', icon: Users, label: 'Employees' },
    { path: '/admin/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/admin/leave', icon: FileText, label: 'Leave' },
    { path: '/admin/payroll', icon: DollarSign, label: 'Payroll' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
    { path: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
    { path: '/admin/audit', icon: Shield, label: 'Audit Logs' },
    { path: '/admin/ai', icon: MessageSquare, label: 'AI Assistant' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">HCM Lite</h2>
          <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
        </div>
        <nav className="mt-4 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${active ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-gray-700/50'}`}>
                <Icon className="w-5 h-5 mr-3" /> 
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4 mr-2" /> Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Welcome back, {user?.firstName}</h1>
          <div className="flex items-center gap-4 relative">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                <div className="p-4 border-b"><h3 className="font-semibold">Notifications</h3></div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? <p className="p-4 text-sm text-gray-500">No notifications</p> : notifications.slice(0,5).map(n => (
                    <div key={n._id} className={`p-3 border-b hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-600">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
