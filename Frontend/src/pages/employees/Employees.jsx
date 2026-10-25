import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Download, Upload, FileCheck } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', designation: '', joinDate: '', basicSalary: ''
  });
  const [search, setSearch] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);

  useEffect(() => {
    API.get('/employees').then(res => setEmployees(res.data.employees));
    API.get('/departments').then(res => setDepartments(res.data));
    API.get('/designations').then(res => setDesignations(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/employees', formData);
      toast.success(`Employee created. Temp password: ${res.data.tempPassword}`);
      setShowForm(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', department: '', designation: '', joinDate: '', basicSalary: '' });
      API.get('/employees').then(res => setEmployees(res.data.employees));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const filtered = employees.filter(e => 
    e.firstName.toLowerCase().includes(search.toLowerCase()) ||
    e.lastName.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage employee records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.open('http://localhost:5000/api/employees/export', '_blank')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search employees..." className="flex-1 outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {showImport && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileCheck className="w-5 h-5" /> CSV Import (Dry Run)</h2>
          <p className="text-sm text-gray-600 mb-4">CSV should have: firstName, lastName, email, phone, department, designation, joinDate, basicSalary</p>
          <div className="flex gap-4 items-center mb-4">
            <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} className="flex-1" />
            <button onClick={async () => {
              if (!importFile) return toast.error('Select file');
              const fd = new FormData();
              fd.append('file', importFile);
              try {
                const res = await API.post('/employees/import/dry-run', fd, { headers: {'Content-Type': 'multipart/form-data'} });
                setDryRunResult(res.data);
                toast.success('Dry run complete');
              } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
            }} className="btn-primary">Run Dry Run</button>
          </div>
          {dryRunResult && (
            <div className="mt-4">
              <div className="flex gap-4 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Total: {dryRunResult.totalRows}</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">Valid: {dryRunResult.validRows}</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">Errors: {dryRunResult.errors.length}</span>
              </div>
              {dryRunResult.errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-2">Errors</h3>
                  {dryRunResult.errors.map((e,i) => <p key={i} className="text-sm text-red-700">Row {e.row}: {e.reason}</p>)}
                </div>
              )}
              {dryRunResult.validRows > 0 && (
                <button onClick={async () => {
                  const fd = new FormData();
                  fd.append('file', importFile);
                  try {
                    const res = await API.post('/employees/import/commit', fd, { headers: {'Content-Type': 'multipart/form-data'} });
                    toast.success(res.data.message);
                    setShowImport(false);
                    setDryRunResult(null);
                    setImportFile(null);
                    API.get('/employees').then(r => setEmployees(r.data.employees));
                  } catch(e) { toast.error('Failed'); }
                }} className="btn-success">Import {dryRunResult.validRows} Valid Rows</button>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Register New Employee</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="First Name" className="input" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
            <input placeholder="Last Name" className="input" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
            <input type="email" placeholder="Email" className="input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input placeholder="Phone" className="input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <select className="input" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <select className="input" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})}>
              <option value="">Select Designation</option>
              {designations.map(d => <option key={d._id} value={d._id}>{d.title}</option>)}
            </select>
            <input type="date" className="input" value={formData.joinDate} onChange={(e) => setFormData({...formData, joinDate: e.target.value})} required />
            <input type="number" placeholder="Basic Salary (Rs)" className="input" value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: e.target.value})} required />
            <button type="submit" className="btn-success md:col-span-2">Create Employee & Generate Login</button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(emp => (
              <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{emp.employeeId}</td>
                <td className="px-6 py-4">{emp.firstName} {emp.lastName}</td>
                <td className="px-6 py-4 text-gray-600">{emp.email}</td>
                <td className="px-6 py-4 text-gray-600">{emp.department?.name}</td>
                <td className="px-6 py-4 text-gray-600">{emp.designation?.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{emp.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No employees found</div>
        )}
      </div>
    </div>
  );
}
