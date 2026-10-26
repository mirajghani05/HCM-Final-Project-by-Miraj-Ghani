import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  UserRound,
  Wallet
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const navItems = [
  { path: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/employee/attendance', icon: CalendarDays, label: 'My Attendance' },
  { path: '/employee/leave', icon: FileText, label: 'My Leave' },
  { path: '/employee/payroll', icon: Wallet, label: 'Payslips' },
  { path: '/employee/announcements', icon: Megaphone, label: 'Announcements' },
  { path: '/employee/profile', icon: UserRound, label: 'My Profile' },
  { path: '/employee/ai', icon: MessageSquare, label: 'AI Assistant' }
];

export default function EmployeeLayout() {
  return <DashboardLayout navItems={navItems} workspaceLabel="Employee Portal" />;
}
