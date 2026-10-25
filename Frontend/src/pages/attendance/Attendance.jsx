import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    API.get('/attendance').then(res => setAttendance(res.data.attendance));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Track employee attendance</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {attendance.map(att => (
              <tr key={att._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{att.employee?.firstName} {att.employee?.lastName}</td>
                <td className="px-6 py-4 text-gray-600">{new Date(att.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-gray-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : '-'}</td>
                <td className="px-6 py-4 text-gray-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString() : '-'}</td>
                <td className="px-6 py-4"><span className={`px-3 py-1 text-xs rounded-full font-medium ${att.status === 'present' ? 'bg-green-100 text-green-800' : att.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{att.status}</span></td>
                <td className="px-6 py-4 text-gray-600">{att.hoursWorked || 0} hrs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
