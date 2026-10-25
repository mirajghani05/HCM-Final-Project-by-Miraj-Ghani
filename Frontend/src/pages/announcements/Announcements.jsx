import { useState, useEffect } from 'react';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Megaphone } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', targetRoles: ['admin', 'hr', 'employee'] });
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});

  useEffect(() => {
    API.get('/announcements').then(res => setAnnouncements(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/announcements', formData);
      toast.success('Announcement posted');
      setShowForm(false);
      setFormData({ title: '', content: '', targetRoles: ['admin', 'hr', 'employee'] });
      API.get('/announcements').then(res => setAnnouncements(res.data));
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Company-wide updates</p>
        </div>
        {(user.role === 'admin' || user.role === 'hr') && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input placeholder="Title" className="input" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            <textarea placeholder="Content" className="input h-32" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} required />
            <button type="submit" className="btn-success">Post</button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann._id} className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{ann.title}</h2>
                <p className="text-gray-600 mt-2 whitespace-pre-wrap">{ann.content}</p>
                <p className="text-sm text-gray-500 mt-4">Posted by {ann.postedBy?.firstName} {ann.postedBy?.lastName} • {new Date(ann.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="card p-8 text-center text-gray-500">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  );
}
