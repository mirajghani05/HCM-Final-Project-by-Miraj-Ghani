import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { Download, Eye } from 'lucide-react';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [payslips, setPayslips] = useState([]);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});

  useEffect(() => {
    API.get('/payroll').then(res => setRuns(res.data));
    if (user.role === 'employee') {
      API.get('/payroll/my/payslips').then(res => setPayslips(res.data));
    }
  }, []);

  const createRun = async (e) => {
    e.preventDefault();
    try {
      await API.post('/payroll', formData);
      toast.success('Payroll run created');
      setShowForm(false);
      API.get('/payroll').then(res => setRuns(res.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const finalize = async (id) => {
    try {
      await API.put(`/payroll/${id}/finalize`);
      toast.success('Payroll finalized');
      API.get('/payroll').then(res => setRuns(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payroll</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Create Payroll Run</button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={createRun} className="flex gap-4">
            <input type="number" placeholder="Month" className="px-4 py-2 border rounded" value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})} />
            <input type="number" placeholder="Year" className="px-4 py-2 border rounded" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">Create</button>
          </form>
        </div>
      )}

      {user.role === 'employee' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payslips.map(p => (
                <tr key={p.runId}>
                  <td className="px-6 py-4">{p.month}/{p.year}</td>
                  <td className="px-6 py-4">Rs {p.gross?.toLocaleString()}</td>
                  <td className="px-6 py-4">Rs {p.netPay?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={async () => {
                      try {
                        const res = await API.get(`/payroll/${p.runId}/payslip`);
                        const data = res.data;
                        const text = `PAYSLIP\n\nPeriod: ${data.run.month}/${data.run.year}\nEmployee: ${data.employee.firstName} ${data.employee.lastName} (${data.employee.employeeId})\n\nEARNINGS\nBasic: Rs ${data.earnings.basic}\nGross: Rs ${data.earnings.gross}\n\nDEDUCTIONS\nAbsent: ${data.deductions.absent} days\nUnpaid Leave: ${data.deductions.unpaidLeave} days\nHalf Days: ${data.deductions.halfDays}\nTax: Rs ${data.deductions.tax}\nTotal Deductions: Rs ${data.deductions.total}\n\nNET PAY: Rs ${data.netPay}`;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `payslip_${p.month}_${p.year}.txt`;
                        a.click();
                        toast.success('Payslip downloaded');
                      } catch(e) { toast.error('Failed'); }
                    }} className="flex items-center gap-1 text-blue-600 hover:underline"><Download className="w-4 h-4" /> Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gross</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Net</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map(run => (
                <tr key={run._id}>
                  <td className="px-6 py-4">{run.month}/{run.year}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${run.status === 'finalized' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{run.status}</span></td>
                  <td className="px-6 py-4">{run.workingDays}</td>
                  <td className="px-6 py-4">Rs {run.totalGross?.toLocaleString()}</td>
                  <td className="px-6 py-4">Rs {run.totalNet?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {run.status === 'draft' && <button onClick={() => finalize(run._id)} className="text-green-600 hover:underline">Finalize</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
