import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [formData, setFormData] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [smartText, setSmartText] = useState('');
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    API.get('/leave').then(res => setLeaves(res.data));
    API.get('/leave-types').then(res => setLeaveTypes(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/leave/apply', formData);
      toast.success('Leave applied');
      setShowForm(false);
      API.get('/leave').then(res => setLeaves(res.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const approve = async (id) => {
    try {
      await API.put(`/leave/${id}/approve`);
      toast.success('Approved');
      API.get('/leave').then(res => setLeaves(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  const reject = async (id) => {
    try {
      await API.put(`/leave/${id}/reject`);
      toast.success('Rejected');
      API.get('/leave').then(res => setLeaves(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Apply and manage leave requests</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">Apply Leave</button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Smart Leave</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Need next Monday and Tuesday off for wedding"
                className="flex-1 px-4 py-2 border rounded"
                value={smartText}
                onChange={(e) => setSmartText(e.target.value)}
              />
              <button
                type="button"
                disabled={parsing}
                onClick={async () => {
                  if (!smartText.trim()) return;
                  setParsing(true);
                  try {
                    const res = await API.post('/ai/smart-leave', { text: smartText });
                    const data = res.data;
                    const typeMap = { casual: leaveTypes.find(t=>t.name.toLowerCase().includes('casual'))?._id, sick: leaveTypes.find(t=>t.name.toLowerCase().includes('sick'))?._id, annual: leaveTypes.find(t=>t.name.toLowerCase().includes('annual'))?._id, unpaid: leaveTypes.find(t=>t.name.toLowerCase().includes('unpaid'))?._id };
                    setFormData({
                      leaveTypeId: typeMap[data.type] || leaveTypes[0]?._id || '',
                      startDate: data.startDate || '',
                      endDate: data.endDate || '',
                      reason: data.reason || smartText
                    });
                    toast.success('Form pre-filled!');
                  } catch (e) {
                    toast.error('Failed to parse');
                  } finally {
                    setParsing(false);
                  }
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                {parsing ? 'Parsing...' : 'Parse'}
              </button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <select className="px-4 py-2 border rounded" value={formData.leaveTypeId} onChange={(e) => setFormData({...formData, leaveTypeId: e.target.value})} required>
              <option value="">Select Leave Type</option>
              {leaveTypes.map(lt => <option key={lt._id} value={lt._id}>{lt.name}</option>)}
            </select>
            <input type="date" className="px-4 py-2 border rounded" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required />
            <input type="date" className="px-4 py-2 border rounded" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required />
            <input placeholder="Reason" className="px-4 py-2 border rounded col-span-2" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} required />
            <button type="submit" className="col-span-2 bg-green-600 text-white py-2 rounded">Submit</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaves.map(leave => (
              <tr key={leave._id}>
                <td className="px-6 py-4">{leave.employee?.firstName} {leave.employee?.lastName}</td>
                <td className="px-6 py-4">{leave.leaveType?.name}</td>
                <td className="px-6 py-4">{new Date(leave.startDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">{new Date(leave.endDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">{leave.workingDays}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : leave.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{leave.status}</span></td>
                <td className="px-6 py-4">
                  {leave.status === 'pending' && (
                    <>
                      <button onClick={() => approve(leave._id)} className="text-green-600 hover:underline mr-2">Approve</button>
                      <button onClick={() => reject(leave._id)} className="text-red-600 hover:underline">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
