import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = () => {
    API.get('/users').then(res => setUsers(res.data));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/users/hr', formData);
      toast.success('HR user created');
      setShowForm(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const resetPassword = async (id) => {
    try {
      const res = await API.put(`/users/${id}/reset-password`);
      toast.success(`Password reset. Temp: ${res.data.tempPassword}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Create HR User
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input placeholder="First Name" className="px-4 py-2 border rounded" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
            <input placeholder="Last Name" className="px-4 py-2 border rounded" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
            <input type="email" placeholder="Email" className="px-4 py-2 border rounded" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" className="px-4 py-2 border rounded" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded">Create</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user._id}>
                <td className="px-6 py-4">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{user.role}</span></td>
                <td className="px-6 py-4">{user.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => resetPassword(user._id)} className="text-blue-600 hover:underline mr-2">Reset Password</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
