import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Clock, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    API.get('/dashboard/employee').then(res => {
      setData(res.data);
      if (res.data.attendanceToday?.checkIn && !res.data.attendanceToday?.checkOut) {
        setCheckedIn(true);
      }
    });
  }, []);

  const handleCheckIn = async () => {
    try {
      await API.post('/attendance/check-in');
      toast.success('Checked in successfully');
      setCheckedIn(true);
      API.get('/dashboard/employee').then(res => setData(res.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post('/attendance/check-out');
      toast.success('Checked out successfully');
      setCheckedIn(false);
      API.get('/dashboard/employee').then(res => setData(res.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    }
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Attendance</h2>
          <p className="text-sm text-gray-600 mb-4">
            Status: {data.attendanceToday?.status || 'Not checked in'}
          </p>
          {!checkedIn ? (
            <button onClick={handleCheckIn} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
              Check In
            </button>
          ) : (
            <button onClick={handleCheckOut} className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
              Check Out
            </button>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Hours This Week</p>
              <p className="text-2xl font-bold">{data.hoursThisWeek} hrs</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-gray-500 text-sm">Leave Balances</p>
            </div>
            <FileText className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="space-y-1">
            {data.leaveBalances?.slice(0,3).map(b => (
              <div key={b._id} className="flex justify-between text-sm">
                <span>{b.leaveType?.name}</span>
                <span className="font-medium">{b.remaining}/{b.quota}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
