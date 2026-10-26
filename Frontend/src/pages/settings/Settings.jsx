import { useEffect, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Layers,
  LocateFixed,
  MapPin,
  Plus,
  Save,
  Settings2,
  ShieldCheck
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
  Skeleton
} from '../../components/ui';

const tabs = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'departments', label: 'Departments', icon: Layers },
  { id: 'leave', label: 'Leave types', icon: CalendarDays }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locatingOffice, setLocatingOffice] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    officeStartTime: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    officeLat: '',
    officeLng: '',
    officeRadius: 150
  });
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [leaveForm, setLeaveForm] = useState({ name: '', quota: 0, isPaid: true });
  const hasOfficeLocation =
    settings.officeLat !== '' &&
    settings.officeLat != null &&
    settings.officeLng !== '' &&
    settings.officeLng != null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, departmentsRes, leaveTypesRes] = await Promise.all([
        API.get('/settings'),
        API.get('/departments'),
        API.get('/leave-types')
      ]);
      setSettings((current) => ({ ...current, ...settingsRes.data }));
      setDepartments(Array.isArray(departmentsRes.data) ? departmentsRes.data : []);
      setLeaveTypes(Array.isArray(leaveTypesRes.data) ? leaveTypesRes.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!settings.companyName?.trim()) {
      toast.error('Company name is required');
      return;
    }

    const hasLat = settings.officeLat !== '' && settings.officeLat != null;
    const hasLng = settings.officeLng !== '' && settings.officeLng != null;
    if (hasLat !== hasLng) {
      toast.error('Enter both office latitude and longitude');
      return;
    }

    const lat = Number(settings.officeLat);
    const lng = Number(settings.officeLng);
    const radius = Number(settings.officeRadius);
    if (hasLat && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (hasLng && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    if (!Number.isFinite(radius) || radius < 10 || radius > 5000) {
      toast.error('Geofence radius must be between 10 and 5000 meters');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...settings,
        graceMinutes: Number(settings.graceMinutes),
        halfDayHours: Number(settings.halfDayHours),
        officeRadius: radius
      };
      if (hasLat) {
        payload.officeLat = lat;
        payload.officeLng = lng;
      } else {
        delete payload.officeLat;
        delete payload.officeLng;
      }
      await API.put('/settings', payload);
      toast.success('Company settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported in this browser');
      return;
    }

    setLocatingOffice(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings((current) => ({
          ...current,
          officeLat: Number(position.coords.latitude.toFixed(6)),
          officeLng: Number(position.coords.longitude.toFixed(6))
        }));
        setLocatingOffice(false);
        toast.success('Office coordinates filled from your current location');
      },
      () => {
        setLocatingOffice(false);
        toast.error('Could not get your current location');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const addDepartment = async (event) => {
    event.preventDefault();
    if (!deptForm.name.trim()) {
      toast.error('Enter a department name');
      return;
    }
    try {
      await API.post('/departments', { name: deptForm.name.trim() });
      toast.success('Department added');
      setDeptForm({ name: '' });
      const res = await API.get('/departments');
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add department');
    }
  };

  const addLeaveType = async (event) => {
    event.preventDefault();
    if (!leaveForm.name.trim()) {
      toast.error('Enter a leave type name');
      return;
    }
    try {
      await API.post('/leave-types', {
        ...leaveForm,
        name: leaveForm.name.trim(),
        quota: Number(leaveForm.quota)
      });
      toast.success('Leave type added');
      setLeaveForm({ name: '', quota: 0, isPaid: true });
      const res = await API.get('/leave-types');
      setLeaveTypes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add leave type');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workspace configuration"
        title="Settings"
        description="Manage company details, teams and the leave policies that power your workflows."
        actions={<Button variant="secondary" icon={ShieldCheck}>Admin only</Button>}
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? 'inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20'
                : 'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 px-2 text-[11px] text-subtle sm:flex">
          <Settings2 className="h-3.5 w-3.5" />
          Changes apply across the workspace
        </div>
      </div>

      {activeTab === 'company' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Company profile</h2>
                <p className="text-[11px] text-muted">How your organisation appears across HCM Lite</p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Company name"
                  name="companyName"
                  value={settings.companyName || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, companyName: event.target.value }))}
                  required
                  className="sm:col-span-2"
                />
                <Input
                  label="Office start time"
                  name="officeStartTime"
                  type="time"
                  value={settings.officeStartTime || '09:00'}
                  onChange={(event) => setSettings((current) => ({ ...current, officeStartTime: event.target.value }))}
                  required
                />
                <Input
                  label="Grace period (minutes)"
                  name="graceMinutes"
                  type="number"
                  min="0"
                  max="120"
                  value={settings.graceMinutes ?? 15}
                  onChange={(event) => setSettings((current) => ({ ...current, graceMinutes: event.target.value }))}
                  required
                />
                <Input
                  label="Half day threshold (hours)"
                  name="halfDayHours"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={settings.halfDayHours ?? 5}
                  onChange={(event) => setSettings((current) => ({ ...current, halfDayHours: event.target.value }))}
                  hint="Used when calculating half-day attendance."
                  required
                />
                <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Camera attendance geofence</h3>
                        <p className="mt-0.5 text-[11px] leading-5 text-muted">
                          Employees must be inside this radius to use face check-in.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      icon={LocateFixed}
                      onClick={useCurrentLocation}
                      loading={locatingOffice}
                    >
                      Use current location
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Input
                      label="Latitude"
                      name="officeLat"
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      placeholder="24.860700"
                      value={settings.officeLat ?? ''}
                      onChange={(event) => setSettings((current) => ({ ...current, officeLat: event.target.value }))}
                    />
                    <Input
                      label="Longitude"
                      name="officeLng"
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      placeholder="67.001100"
                      value={settings.officeLng ?? ''}
                      onChange={(event) => setSettings((current) => ({ ...current, officeLng: event.target.value }))}
                    />
                    <Input
                      label="Radius (meters)"
                      name="officeRadius"
                      type="number"
                      min="10"
                      max="5000"
                      value={settings.officeRadius ?? 150}
                      onChange={(event) => setSettings((current) => ({ ...current, officeRadius: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button type="submit" loading={saving} icon={Save} className="w-full sm:w-auto">
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Workspace summary</h2>
            <p className="mt-1 text-xs text-muted">A quick look at your configuration.</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Departments
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{departments.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <CalendarDays className="h-4 w-4 text-violet-500" />
                  Leave types
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{leaveTypes.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Clock3 className="h-4 w-4 text-emerald-500" />
                  Office hours
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {settings.officeStartTime || '09:00'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-950/40">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-sky-500" />
                  Camera geofence
                </span>
                <Badge tone={hasOfficeLocation ? 'emerald' : 'amber'}>
                  {hasOfficeLocation ? `${settings.officeRadius || 150} m` : 'Not set'}
                </Badge>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs leading-5 text-indigo-900/70 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-200/70">
              Attendance is marked late after the grace period. Keep these values aligned with your HR policy.
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'departments' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Departments</h2>
                <p className="mt-1 text-xs text-muted">Teams available when assigning employees.</p>
              </div>
              <Badge tone="indigo">{departments.length} total</Badge>
            </div>

            {loading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No departments yet"
                description="Add your first department using the form."
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {departments.map((department) => (
                  <div
                    key={department._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-800"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Layers className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">
                      {department.name}
                    </p>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add department</h2>
            <p className="mt-1 text-xs text-muted">Create a new team for your organisation.</p>
            <form onSubmit={addDepartment} className="mt-4 space-y-3">
              <Input
                label="Department name"
                name="departmentName"
                placeholder="e.g. Engineering"
                value={deptForm.name}
                onChange={(event) => setDeptForm({ name: event.target.value })}
                required
              />
              <Button type="submit" icon={Plus} className="w-full">Add department</Button>
            </form>
          </Card>
        </div>
      ) : null}

      {activeTab === 'leave' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Leave types</h2>
                <p className="mt-1 text-xs text-muted">Policies employees can choose when applying.</p>
              </div>
              <Badge tone="violet">{leaveTypes.length} total</Badge>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : leaveTypes.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No leave types configured"
                description="Add leave types before employees can submit requests."
              />
            ) : (
              <div className="space-y-2">
                {leaveTypes.map((type) => (
                  <div
                    key={type._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-800"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{type.name}</p>
                      <p className="text-[11px] text-muted">{type.quota || 0} days per year</p>
                    </div>
                    <Badge tone={type.isPaid === false ? 'amber' : 'emerald'}>
                      {type.isPaid === false ? 'Unpaid' : 'Paid'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add leave type</h2>
            <p className="mt-1 text-xs text-muted">Define a new leave allowance.</p>
            <form onSubmit={addLeaveType} className="mt-4 space-y-3">
              <Input
                label="Leave type name"
                name="leaveTypeName"
                placeholder="e.g. Annual leave"
                value={leaveForm.name}
                onChange={(event) => setLeaveForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <Input
                label="Annual quota (days)"
                name="quota"
                type="number"
                min="0"
                max="365"
                value={leaveForm.quota}
                onChange={(event) => setLeaveForm((current) => ({ ...current, quota: event.target.value }))}
                required
              />
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={leaveForm.isPaid}
                  onChange={(event) => setLeaveForm((current) => ({ ...current, isPaid: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Paid leave</span>
              </label>
              <Button type="submit" icon={Plus} className="w-full">Add leave type</Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
