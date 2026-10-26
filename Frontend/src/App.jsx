import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { Spinner } from './components/ui';
import FirstRunSetup from './pages/FirstRunSetup';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import AdminLayout from './layouts/AdminLayout';
import HRLayout from './layouts/HRLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import AdminDashboard from './pages/admin/Dashboard';
import HRDashboard from './pages/hr/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import Employees from './pages/employees/Employees';
import Attendance from './pages/attendance/Attendance';
import Leave from './pages/leave/Leave';
import Payroll from './pages/payroll/Payroll';
import Settings from './pages/settings/Settings';
import Users from './pages/users/Users';
import AIChat from './pages/ai/AIChat';
import AuditLogs from './pages/audit/AuditLogs';
import Announcements from './pages/announcements/Announcements';
import Profile from './pages/profile/Profile';

const AppToaster = () => {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: dark ? '#0f172a' : '#ffffff',
          color: dark ? '#e2e8f0' : '#0f172a',
          border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
          borderRadius: '12px',
          fontSize: '13px',
          boxShadow: dark
            ? '0 16px 40px -12px rgba(0,0,0,0.65)'
            : '0 16px 40px -12px rgba(15,23,42,0.18)'
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } }
      }}
    />
  );
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
            H
          </span>
          <Spinner className="h-5 w-5 text-indigo-500" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  if (user.mustChangePassword) return <Navigate to="/change-password" />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'hr') return <Navigate to="/hr" />;
  if (user?.role === 'employee') return <Navigate to="/employee" />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppToaster />
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/setup" element={<FirstRunSetup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="ai" element={<AIChat />} />
          </Route>
          
          <Route path="/hr" element={<ProtectedRoute roles={['hr']}><HRLayout /></ProtectedRoute>}>
            <Route index element={<HRDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="ai" element={<AIChat />} />
          </Route>
          
          <Route path="/employee" element={<ProtectedRoute roles={['employee']}><EmployeeLayout /></ProtectedRoute>}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
            <Route path="ai" element={<AIChat />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
