import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState({ phone: '', address: '' });

  useEffect(() => {
    API.get('/employees/me').then(res => {
      setEmployee(res.data);
      setFormData({ phone: res.data.phone || '', address: res.data.address || '' });
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/employees/me/update', formData);
      setEmployee(res.data);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (!employee) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-xl font-bold">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{employee.firstName} {employee.lastName}</h2>
              <p className="text-gray-600">{employee.employeeId}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="w-5 h-5 text-gray-400" />
              <span>{employee.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>{employee.address || 'Not provided'}</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600">Department: {employee.department?.name || '-'}</p>
              <p className="text-sm text-gray-600">Designation: {employee.designation?.title || '-'}</p>
              <p className="text-sm text-gray-600">Join Date: {new Date(employee.joinDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Update Contact Info</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="text" className="input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea className="input h-24" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary">Update Profile</button>
          </form>
        </div>
      </div>
    </div>
  );
}
