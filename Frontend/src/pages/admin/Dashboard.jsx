import { useEffect, useState } from 'react';
import API from '../../services/api';
import { Users, Calendar, Clock, DollarSign, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    API.get('/dashboard/admin').then(res => setData(res.data));
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Company overview and insights</p>
        </div>
        <button onClick={getSummary} disabled={loadingSummary} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl">
          <Sparkles className="w-5 h-5" />
          {loadingSummary ? 'Analyzing...' : 'AI Insights'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.kpis.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Present Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.kpis.presentToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">On Leave</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.kpis.onLeaveToday}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Payroll Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">Rs {data.kpis.payrollCost.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
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
