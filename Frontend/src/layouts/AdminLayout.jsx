import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
  Wallet
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users', icon: UserCog, label: 'Users / HR' },
  { path: '/admin/employees', icon: UsersRound, label: 'Employees' },
  { path: '/admin/attendance', icon: CalendarDays, label: 'Attendance' },
  { path: '/admin/leave', icon: FileText, label: 'Leave' },
  { path: '/admin/payroll', icon: Wallet, label: 'Payroll' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
  { path: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { path: '/admin/audit', icon: ShieldCheck, label: 'Audit Logs' },
  { path: '/admin/ai', icon: MessageSquare, label: 'AI Assistant' }
];

export default function AdminLayout() {
  return <DashboardLayout navItems={navItems} workspaceLabel="Admin Workspace" />;
}
