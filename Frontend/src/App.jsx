import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
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

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
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
        <Toaster position="top-right" />
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
