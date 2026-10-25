import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, FileText, DollarSign, MessageSquare, LayoutDashboard, LogOut, User, Megaphone, Bell } from 'lucide-react';

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employee/attendance', icon: Calendar, label: 'My Attendance' },
    { path: '/employee/leave', icon: FileText, label: 'My Leave' },
    { path: '/employee/payroll', icon: DollarSign, label: 'Payslips' },
    { path: '/employee/announcements', icon: Megaphone, label: 'Announcements' },
    { path: '/employee/profile', icon: User, label: 'My Profile' },
    { path: '/employee/ai', icon: MessageSquare, label: 'AI Assistant' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gradient-to-b from-green-900 to-emerald-900 text-white shadow-xl">
        <div className="p-6 border-b border-green-700">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">HCM Lite</h2>
          <p className="text-sm text-green-300 mt-1">Employee Portal</p>
        </div>
        <nav className="mt-4 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 ${active ? 'bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg' : 'hover:bg-green-800/50'}`}>
                <Icon className="w-5 h-5 mr-3" /> 
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-green-700 bg-green-900/50">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-green-300 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4 mr-2" /> Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Welcome, {user?.firstName}</h1>
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
