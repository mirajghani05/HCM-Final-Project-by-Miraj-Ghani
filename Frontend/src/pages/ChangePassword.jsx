import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ChangePassword() {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    try {
      await API.put('/auth/change-password', { currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      toast.success('Password changed successfully');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'hr') navigate('/hr');
      else navigate('/employee');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Change Password</h2>
        <p className="text-gray-600 text-center mb-6">You must change your password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!user?.mustChangePassword && (
            <input
              type="password"
              placeholder="Current Password"
              className="w-full px-4 py-2 border rounded-lg"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              required
            />
          )}
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-4 py-2 border rounded-lg"
            value={formData.newPassword}
            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            className="w-full px-4 py-2 border rounded-lg"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
