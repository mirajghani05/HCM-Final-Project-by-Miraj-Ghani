import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Users, Calendar, Clock, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HRDashboard() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    API.get('/dashboard/hr').then(res => setData(res.data));
  }, []);

  const getSummary = async () => {
    if (!data) return;
    setLoadingSummary(true);
    try {
      const res = await API.post('/ai/summarize', { kpis: data.kpis });
      setSummary(res.data.summary || []);
    } catch (e) {
      toast.error('Failed to get summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">HR Dashboard</h1>
        <button onClick={getSummary} disabled={loadingSummary} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
          <Sparkles className="w-4 h-4" />
          {loadingSummary ? 'Summarizing...' : 'AI Summarize'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Employees</p>
              <p className="text-2xl font-bold">{data.kpis.totalEmployees}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Present</p>
              <p className="text-2xl font-bold">{data.kpis.presentToday}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Late</p>
              <p className="text-2xl font-bold">{data.kpis.lateToday}</p>
            </div>
            <Clock className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">On Leave</p>
              <p className="text-2xl font-bold">{data.kpis.onLeaveToday}</p>
            </div>
            <FileText className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Leaves</p>
              <p className="text-2xl font-bold">{data.kpis.pendingLeaves}</p>
            </div>
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>
      {summary.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h2 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" /> AI Insights</h2>
          <ul className="space-y-1">
            {summary.map((s, i) => <li key={i} className="text-sm">• {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
