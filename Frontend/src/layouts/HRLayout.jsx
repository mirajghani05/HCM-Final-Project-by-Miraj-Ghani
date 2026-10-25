import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Calendar, FileText, DollarSign, MessageSquare, LayoutDashboard, LogOut, Megaphone, Bell } from 'lucide-react';

export default function HRLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/hr', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/hr/employees', icon: Users, label: 'Employees' },
    { path: '/hr/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/hr/leave', icon: FileText, label: 'Leave' },
    { path: '/hr/payroll', icon: DollarSign, label: 'Payroll' },
    { path: '/hr/announcements', icon: Megaphone, label: 'Announcements' },
    { path: '/hr/ai', icon: MessageSquare, label: 'AI Assistant' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white shadow-xl">
        <div className="p-6 border-b border-blue-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">HCM Lite</h2>
          <p className="text-sm text-blue-300 mt-1">HR Panel</p>
        </div>
        <nav className="mt-4 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/hr' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${active ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg' : 'hover:bg-blue-800/50'}`}>
                <Icon className="w-5 h-5 mr-3" /> 
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-blue-700 bg-blue-900/50">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-blue-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4 mr-2" /> Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">HR Dashboard</h1>
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
