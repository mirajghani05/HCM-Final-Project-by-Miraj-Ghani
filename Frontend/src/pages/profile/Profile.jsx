import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  Textarea
} from '../../components/ui';
import FaceEnrollment from '../../components/FaceEnrollment';
import { formatDate, initials, titleCase } from '../../utils/format';

export default function Profile() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ phone: '', address: '' });

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/employees/me');
      setEmployee(res.data);
      setFormData({
        phone: res.data.phone || '',
        address: res.data.address || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/employees/me/update', formData);
      setEmployee(res.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const tenure = (() => {
    if (!employee?.joinDate) return '-';
    const start = new Date(employee.joinDate);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    months = Math.max(months, 0);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) return `${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
    return `${years} yr ${remainingMonths ? `${remainingMonths} mo` : ''}`.trim();
  })();

  return (
    <div>
      <PageHeader
        eyebrow="Personal details"
        title="My profile"
        description="Keep your contact information up to date and review your employment details."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={loadProfile} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Profile unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadProfile}>Try again</Button>}
          />
        </Card>
      ) : loading ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-2xl xl:col-span-2" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 space-y-4 xl:col-span-2">
            <Card className="relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-500/10" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-bold text-white shadow-xl shadow-indigo-500/25">
                  {initials(employee.firstName, employee.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {employee.firstName} {employee.lastName}
                    </h2>
                    <Badge tone={employee.status === 'active' ? 'emerald' : 'amber'} dot>
                      {titleCase(employee.status || 'active')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {employee.designation?.title || 'Employee'} · {employee.department?.name || 'Unassigned'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-subtle">
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-3.5 w-3.5" />
                      {employee.employeeId}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Joined {formatDate(employee.joinDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      {titleCase(employee.employmentType || 'full-time')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Contact information</h3>
                  <p className="text-[11px] text-muted">How your team can reach you</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Email</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-white">{employee.email}</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Phone</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-white">{employee.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3.5 sm:col-span-2 dark:bg-slate-950/40">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Address</p>
                    <p className="mt-0.5 break-words text-sm font-medium leading-5 text-slate-900 dark:text-white">{employee.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </Card>

            <FaceEnrollment />
          </div>

          <div className="min-w-0 space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Employment</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">Department</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{employee.department?.name || 'Unassigned'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <BriefcaseBusiness className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">Designation</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{employee.designation?.title || 'Employee'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">Tenure</p>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{tenure}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Update contact info</h3>
              <p className="mt-1 text-xs text-muted">Keep your details current for HR records.</p>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <Input
                  label="Phone number"
                  name="phone"
                  type="tel"
                  placeholder="+92 300 0000000"
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                />
                <Textarea
                  label="Address"
                  name="address"
                  rows={3}
                  placeholder="Your current address"
                  value={formData.address}
                  onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                />
                <Button type="submit" icon={Save} loading={saving} className="w-full">
                  Save changes
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
