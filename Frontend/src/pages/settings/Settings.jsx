import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({ companyName: '', officeStartTime: '09:00', graceMinutes: 15 });
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [leaveForm, setLeaveForm] = useState({ name: '', quota: 0, isPaid: true });

  useEffect(() => {
    API.get('/settings').then(res => setSettings(res.data));
    API.get('/departments').then(res => setDepartments(res.data));
    API.get('/leave-types').then(res => setLeaveTypes(res.data));
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await API.put('/settings', settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed');
    }
  };

  const addDept = async (e) => {
    e.preventDefault();
    try {
      await API.post('/departments', deptForm);
      toast.success('Department added');
      setDeptForm({ name: '' });
      API.get('/departments').then(res => setDepartments(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  const addLeaveType = async (e) => {
    e.preventDefault();
    try {
      await API.post('/leave-types', leaveForm);
      toast.success('Leave type added');
      setLeaveForm({ name: '', quota: 0, isPaid: true });
      API.get('/leave-types').then(res => setLeaveTypes(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Company Settings</h2>
        <form onSubmit={saveSettings} className="grid grid-cols-2 gap-4">
          <input placeholder="Company Name" className="px-4 py-2 border rounded" value={settings.companyName} onChange={(e) => setSettings({...settings, companyName: e.target.value})} />
          <input placeholder="Office Start Time" className="px-4 py-2 border rounded" value={settings.officeStartTime} onChange={(e) => setSettings({...settings, officeStartTime: e.target.value})} />
          <input type="number" placeholder="Grace Minutes" className="px-4 py-2 border rounded" value={settings.graceMinutes} onChange={(e) => setSettings({...settings, graceMinutes: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white py-2 rounded">Save</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Departments</h2>
          <form onSubmit={addDept} className="flex gap-2 mb-4">
            <input placeholder="Department Name" className="flex-1 px-4 py-2 border rounded" value={deptForm.name} onChange={(e) => setDeptForm({name: e.target.value})} />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
          </form>
          <ul className="space-y-2">
            {departments.map(d => <li key={d._id} className="px-4 py-2 bg-gray-50 rounded">{d.name}</li>)}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Leave Types</h2>
          <form onSubmit={addLeaveType} className="flex gap-2 mb-4">
            <input placeholder="Name" className="flex-1 px-4 py-2 border rounded" value={leaveForm.name} onChange={(e) => setLeaveForm({...leaveForm, name: e.target.value})} />
            <input type="number" placeholder="Quota" className="w-20 px-4 py-2 border rounded" value={leaveForm.quota} onChange={(e) => setLeaveForm({...leaveForm, quota: e.target.value})} />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
          </form>
          <ul className="space-y-2">
            {leaveTypes.map(lt => <li key={lt._id} className="px-4 py-2 bg-gray-50 rounded">{lt.name} - {lt.quota} days</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
