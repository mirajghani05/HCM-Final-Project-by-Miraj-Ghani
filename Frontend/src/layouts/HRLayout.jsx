import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  UsersRound,
  Wallet
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const navItems = [
  { path: '/hr', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/hr/employees', icon: UsersRound, label: 'Employees' },
  { path: '/hr/attendance', icon: CalendarDays, label: 'Attendance' },
  { path: '/hr/leave', icon: FileText, label: 'Leave' },
  { path: '/hr/payroll', icon: Wallet, label: 'Payroll' },
  { path: '/hr/announcements', icon: Megaphone, label: 'Announcements' },
  { path: '/hr/ai', icon: MessageSquare, label: 'AI Assistant' }
];

export default function HRLayout() {
  return <DashboardLayout navItems={navItems} workspaceLabel="HR Workspace" />;
}
