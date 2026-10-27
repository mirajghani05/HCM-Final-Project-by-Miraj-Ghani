import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserRound,
  UserRoundCheck,
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
  Pagination,
  SearchField,
  StatCard,
  TableSkeleton
} from '../../components/ui';
import { formatDate, initials, roleLabel } from '../../utils/format';
import { buildUserPayload } from '../../utils/payload';

const roleTones = {
  admin: 'violet',
  hr: 'indigo',
  employee: 'neutral'
};

const emptyForm = { email: '', password: '', firstName: '', lastName: '' };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [tempCredentials, setTempCredentials] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.password.length < 8) {
      toast.error('Use at least 8 characters for the password');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/users/hr', buildUserPayload(formData));
      toast.success('HR user created');
      setShowForm(false);
      setFormData(emptyForm);
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create user');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (user) => {
    setActionId(`reset-${user._id}`);
    try {
      const res = await API.put(`/users/${user._id}/reset-password`);
      setTempCredentials({ email: user.email, password: res.data.tempPassword });
      toast.success('Temporary password generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setActionId('');
    }
  };

  const toggleStatus = async (user) => {
    setActionId(`status-${user._id}`);
    try {
      const res = await API.put(`/users/${user._id}/toggle-status`);
      toast.success(res.data.message || 'User status updated');
      await loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    } finally {
      setActionId('');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const matchesSearch = !term || name.includes(term) || user.email?.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = users.filter((user) => user.isActive).length;
  const hrCount = users.filter((user) => user.role === 'hr').length;
  const adminCount = users.filter((user) => user.role === 'admin').length;

  return (
    <div>
      <PageHeader
        eyebrow="Access control"
        title="Users & access"
        description="Manage sign-in accounts, roles and account recovery for your team."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadUsers} loading={loading}>
              Refresh
            </Button>
            <Button icon={Plus} onClick={() => setShowForm(true)}>Create HR user</Button>
          </>
        }
      />

      {tempCredentials ? (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Temporary password for {tempCredentials.email}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                The user must change this password at their next sign-in.
              </p>
            </div>
            <code className="w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-300 dark:ring-emerald-500/30">
              {tempCredentials.password}
            </code>
            <Button variant="ghost" size="sm" onClick={() => setTempCredentials(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Users unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadUsers}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total users"
              value={users.length}
              icon={UsersRound}
              tone="indigo"
              hint="All sign-in accounts"
              loading={loading}
            />
            <StatCard
              title="Active"
              value={activeCount}
              icon={UserRoundCheck}
              tone="emerald"
              hint="Can sign in today"
              loading={loading}
            />
            <StatCard
              title="HR users"
              value={hrCount}
              icon={UserCog}
              tone="violet"
              hint="People operations access"
              loading={loading}
            />
            <StatCard
              title="Admins"
              value={adminCount}
              icon={ShieldCheck}
              tone="sky"
              hint="Full workspace access"
              loading={loading}
            />
          </div>

          <Card className="mb-4 p-3.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <SearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email..."
                className="flex-1"
              />
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="field w-full sm:w-36"
                  aria-label="Filter by role"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="field w-full sm:w-36"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <Card className="overflow-hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={UserRound}
                  title="No users found"
                  description="Try a different search or filter."
                  action={<Button icon={Plus} onClick={() => setShowForm(true)}>Create HR user</Button>}
                />
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((user) => {
                          const isSelf = user._id === currentUser?.id || user.email === currentUser?.email;

                          return (
                            <tr key={user._id}>
                              <td>
                                <div className="flex items-center gap-3">
                                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                                    {initials(user.firstName, user.lastName)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900 dark:text-white">
                                      {user.firstName} {user.lastName}
                                      {isSelf ? <Badge tone="indigo">You</Badge> : null}
                                    </p>
                                    <p className="truncate text-[11px] text-muted">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <Badge tone={roleTones[user.role] || 'neutral'}>{roleLabel(user.role)}</Badge>
                              </td>
                              <td>
                                <Badge tone={user.isActive ? 'emerald' : 'rose'} dot>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap">{formatDate(user.createdAt)}</td>
                              <td>
                                <div className="flex flex-wrap gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={KeyRound}
                                    loading={actionId === `reset-${user._id}`}
                                    onClick={() => resetPassword(user)}
                                  >
                                    Reset
                                  </Button>
                                  <Button
                                    variant={user.isActive ? 'danger-soft' : 'soft'}
                                    size="sm"
                                    loading={actionId === `status-${user._id}`}
                                    onClick={() => toggleStatus(user)}
                                    disabled={isSelf}
                                    title={isSelf ? 'You cannot deactivate your own account' : undefined}
                                  >
                                    {user.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={filtered.length}
                    onPageChange={setPage}
                  />
                </>
              )}
            </Card>
          )}
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Create HR user"
        description="This user will have access to employees, attendance, leave and payroll."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" form="hr-user-form" loading={submitting} icon={Plus}>
              Create user
            </Button>
          </>
        }
      >
        <form id="hr-user-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            placeholder="Ayesha"
            value={formData.firstName}
            onChange={(event) => setFormData((current) => ({ ...current, firstName: event.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Last name"
            name="lastName"
            placeholder="Khan"
            value={formData.lastName}
            onChange={(event) => setFormData((current) => ({ ...current, lastName: event.target.value }))}
            required
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="hr@company.com"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            required
            className="sm:col-span-2"
          />
          <Input
            label="Temporary password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            hint="They will be asked to change it after signing in."
            minLength={8}
            required
            className="sm:col-span-2"
          />
        </form>
      </Modal>
    </div>
  );
}
