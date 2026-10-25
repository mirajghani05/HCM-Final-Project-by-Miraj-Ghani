import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    API.get('/audit-logs').then(res => setLogs(res.data));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">Track all system activities</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium">{log.actor?.firstName} {log.actor?.lastName}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{log.actorRole}</span></td>
                <td className="px-6 py-4 text-gray-700">{log.action}</td>
                <td className="px-6 py-4 text-gray-600">{log.entity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
