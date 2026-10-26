import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  UsersRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SearchField,
  Skeleton,
  Textarea
} from '../../components/ui';
import { formatDate, initials, roleLabel } from '../../utils/format';

const roleOptions = [
  { value: 'admin', label: 'Admins' },
  { value: 'hr', label: 'HR' },
  { value: 'employee', label: 'Employees' }
];

const emptyForm = {
  title: '',
  content: '',
  targetRoles: ['admin', 'hr', 'employee']
};

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const canPost = user?.role === 'admin' || user?.role === 'hr';

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const toggleRole = (role) => {
    setFormData((current) => {
      const selected = current.targetRoles.includes(role);
      const targetRoles = selected
        ? current.targetRoles.filter((item) => item !== role)
        : [...current.targetRoles, role];

      return { ...current, targetRoles };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Add a title and message');
      return;
    }
    if (formData.targetRoles.length === 0) {
      toast.error('Select at least one audience');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/announcements', {
        title: formData.title.trim(),
        content: formData.content.trim(),
        targetRoles: formData.targetRoles
      });
      toast.success('Announcement posted');
      setShowForm(false);
      setFormData(emptyForm);
      await loadAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = announcements.filter(
    (announcement) =>
      !term ||
      announcement.title?.toLowerCase().includes(term) ||
      announcement.content?.toLowerCase().includes(term) ||
      `${announcement.postedBy?.firstName || ''} ${announcement.postedBy?.lastName || ''}`
        .toLowerCase()
        .includes(term)
  );

  return (
    <div>
      <PageHeader
        eyebrow="Company communication"
        title="Announcements"
        description="Share updates, reminders and important news with the right people."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadAnnouncements} loading={loading}>
              Refresh
            </Button>
            {canPost ? (
              <Button icon={Plus} onClick={() => setShowForm(true)}>Post announcement</Button>
            ) : null}
          </>
        }
      />

      <Card className="mb-4 p-3.5">
        <SearchField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search announcements..."
        />
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="flex gap-4">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title={search ? 'No matching announcements' : 'No announcements yet'}
            description={
              search
                ? 'Try a different search term.'
                : canPost
                  ? 'Post your first company update to get everyone aligned.'
                  : 'Company updates will appear here.'
            }
            action={
              canPost && !search ? (
                <Button icon={Plus} onClick={() => setShowForm(true)}>Post announcement</Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((announcement, index) => (
            <Card
              key={announcement._id}
              className={
                index === 0
                  ? 'relative overflow-hidden border-indigo-200 p-5 dark:border-indigo-500/20'
                  : 'p-5'
              }
            >
              {index === 0 ? (
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-100/70 blur-2xl dark:bg-indigo-500/10" />
              ) : null}
              <div className="relative flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                      {announcement.title}
                    </h2>
                    {index === 0 ? <Badge tone="indigo">Latest</Badge> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                    {announcement.content}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-subtle">
                    <span className="flex items-center gap-1.5">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {initials(announcement.postedBy?.firstName, announcement.postedBy?.lastName)}
                      </span>
                      {announcement.postedBy?.firstName} {announcement.postedBy?.lastName}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(announcement.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersRound className="h-3.5 w-3.5" />
                      {(announcement.targetRoles || []).map(roleLabel).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Post announcement"
        description="Choose who should see this update."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" form="announcement-form" loading={submitting} icon={Send}>
              Post announcement
            </Button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            name="title"
            placeholder="e.g. Office closed for public holiday"
            value={formData.title}
            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
            required
            autoFocus
          />
          <Textarea
            label="Message"
            name="content"
            rows={6}
            placeholder="Write a clear update for your team..."
            value={formData.content}
            onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
            required
          />

          <div>
            <p className="field-label">Audience</p>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((option) => {
                const selected = formData.targetRoles.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleRole(option.value)}
                    className={
                      selected
                        ? 'rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30'
                        : 'rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-subtle">
              <Search className="h-3 w-3" />
              Only selected roles will see this announcement.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
