import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  Inbox,
  Plus,
  RefreshCw,
  Sparkles,
  X
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
  Select,
  StatCard,
  TableSkeleton,
  Textarea
} from '../../components/ui';
import { formatDate, initials, titleCase } from '../../utils/format';

const statusTones = {
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'neutral'
};

const emptyForm = {
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  reason: ''
};

export default function Leave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [smartText, setSmartText] = useState('');
  const [parsing, setParsing] = useState(false);
  const pageSize = 8;
  const isEmployee = user?.role === 'employee';
  const canApprove = user?.role === 'admin' || user?.role === 'hr';

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/leave');
      setLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
    API.get('/leave-types')
      .then((res) => setLeaveTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLeaveTypes([]));
  }, [loadLeaves]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData(emptyForm);
    setSmartText('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.leaveTypeId) {
      toast.error('Select a leave type');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Choose your leave dates');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before the start date');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('Add a short reason for your request');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/leave/apply', formData);
      toast.success('Leave request submitted');
      closeForm();
      await loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const processLeave = async (id, action) => {
    setActionId(`${action}-${id}`);
    try {
      await API.put(`/leave/${id}/${action}`);
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected');
      await loadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || `Could not ${action} leave request`);
    } finally {
      setActionId('');
    }
  };

  const parseSmartLeave = async () => {
    if (!smartText.trim()) {
      toast.error('Describe the leave you need first');
      return;
    }
    if (leaveTypes.length === 0) {
      toast.error('No leave types are configured yet');
      return;
    }

    setParsing(true);
    try {
      const res = await API.post('/ai/smart-leave', { text: smartText });
      const parsed = res.data || {};
      const typeMap = {
        casual: leaveTypes.find((type) => type.name.toLowerCase().includes('casual'))?._id,
        sick: leaveTypes.find((type) => type.name.toLowerCase().includes('sick'))?._id,
        annual: leaveTypes.find((type) => type.name.toLowerCase().includes('annual'))?._id,
        unpaid: leaveTypes.find((type) => type.name.toLowerCase().includes('unpaid'))?._id
      };
      setFormData({
        leaveTypeId: typeMap[parsed.type] || leaveTypes[0]?._id || '',
        startDate: parsed.startDate || '',
        endDate: parsed.endDate || '',
        reason: parsed.reason || smartText
      });
      toast.success('Form pre-filled from your description');
    } catch {
      toast.error('Could not understand that request. Fill the form manually.');
    } finally {
      setParsing(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leaves.filter((leave) => {
      const employeeName = `${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}`.toLowerCase();
      const matchesSearch =
        !term ||
        employeeName.includes(term) ||
        leave.leaveType?.name?.toLowerCase().includes(term) ||
        leave.reason?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaves, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pendingCount = leaves.filter((leave) => leave.status === 'pending').length;
  const approvedCount = leaves.filter((leave) => leave.status === 'approved').length;
  const rejectedCount = leaves.filter((leave) => leave.status === 'rejected').length;
  const totalDays = leaves
    .filter((leave) => leave.status === 'approved')
    .reduce((sum, leave) => sum + Number(leave.workingDays || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow={isEmployee ? 'Time off' : 'Leave operations'}
        title={isEmployee ? 'My leave' : 'Leave requests'}
        description={
          isEmployee
            ? 'Apply for time off and follow the status of your requests.'
            : 'Review, approve and keep track of every leave request.'
        }
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadLeaves} loading={loading}>
              Refresh
            </Button>
            {isEmployee ? (
              <Button icon={Plus} onClick={() => setShowForm(true)}>Apply for leave</Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Leave requests unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadLeaves}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Pending"
              value={pendingCount}
              icon={Clock3}
              tone="amber"
              hint="Awaiting a decision"
              loading={loading}
            />
            <StatCard
              title="Approved"
              value={approvedCount}
              icon={Check}
              tone="emerald"
              hint={`${totalDays} approved days`}
              loading={loading}
            />
            <StatCard
              title="Rejected"
              value={rejectedCount}
              icon={X}
              tone="rose"
              hint="Closed requests"
              loading={loading}
            />
            <StatCard
              title="Total requests"
              value={leaves.length}
              icon={ClipboardList}
              tone="indigo"
              hint="All-time requests"
              loading={loading}
            />
          </div>

          <Card className="mb-4 p-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isEmployee ? 'Search your requests...' : 'Search by employee, type or reason...'}
                className="flex-1"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="field w-full sm:w-40"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </Card>

          {loading ? (
            <TableSkeleton rows={8} columns={isEmployee ? 5 : 7} />
          ) : (
            <Card className="overflow-hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No leave requests found"
                  description={
                    isEmployee
                      ? 'You have no leave requests matching these filters.'
                      : 'No requests match the current filters.'
                  }
                  action={
                    isEmployee ? (
                      <Button icon={Plus} onClick={() => setShowForm(true)}>Apply for leave</Button>
                    ) : null
                  }
                />
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {!isEmployee ? <th>Employee</th> : null}
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th className="hidden xl:table-cell">Reason</th>
                          {canApprove ? <th>Actions</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((leave) => (
                          <tr key={leave._id}>
                            {!isEmployee ? (
                              <td>
                                <div className="flex items-center gap-3">
                                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {initials(leave.employee?.firstName, leave.employee?.lastName)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      {leave.employee?.firstName} {leave.employee?.lastName}
                                    </p>
                                    <p className="text-[11px] text-muted">{leave.employee?.employeeId}</p>
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            <td className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                              {leave.leaveType?.name || '-'}
                            </td>
                            <td className="whitespace-nowrap">
                              {formatDate(leave.startDate)}
                              <span className="mx-1 text-subtle">→</span>
                              {formatDate(leave.endDate)}
                            </td>
                            <td className="whitespace-nowrap">{leave.workingDays || 0} day{leave.workingDays === 1 ? '' : 's'}</td>
                            <td>
                              <Badge tone={statusTones[leave.status] || 'neutral'} dot>
                                {titleCase(leave.status)}
                              </Badge>
                            </td>
                            <td className="hidden max-w-52 xl:table-cell">
                              <span className="line-clamp-1 text-xs text-muted">{leave.reason || '-'}</span>
                            </td>
                            {canApprove ? (
                              <td>
                                {leave.status === 'pending' ? (
                                  <div className="flex gap-1.5">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      loading={actionId === `approve-${leave._id}`}
                                      onClick={() => processLeave(leave._id, 'approve')}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="danger-soft"
                                      size="sm"
                                      loading={actionId === `reject-${leave._id}`}
                                      onClick={() => processLeave(leave._id, 'reject')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-subtle">Processed</span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))}
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
        onClose={closeForm}
        title="Apply for leave"
        description="Describe your request in plain language or fill in the details yourself."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button
              type="submit"
              form="leave-form"
              loading={submitting}
              disabled={leaveTypes.length === 0}
              icon={Plus}
            >
              Submit request
            </Button>
          </>
        }
      >
        <div className="mb-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 dark:border-violet-500/20 dark:from-violet-500/5 dark:to-fuchsia-500/5">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
            Smart leave
          </div>
          <p className="mt-1 text-[11px] leading-5 text-violet-900/60 dark:text-violet-200/60">
            Try “I need next Monday and Tuesday off for a wedding”.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={smartText}
              onChange={(event) => setSmartText(event.target.value)}
              placeholder="Describe the time off you need..."
              className="field flex-1 bg-white/80 dark:bg-slate-900/80"
            />
            <Button
              variant="soft"
              loading={parsing}
              onClick={parseSmartLeave}
              disabled={leaveTypes.length === 0}
              className="shrink-0"
            >
              Parse
            </Button>
          </div>
        </div>

        {leaveTypes.length === 0 ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Leave types have not been configured yet. Ask an administrator to add them before applying.
          </div>
        ) : null}

        <form id="leave-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Leave type"
            name="leaveTypeId"
            value={formData.leaveTypeId}
            onChange={updateField('leaveTypeId')}
            required
            className="sm:col-span-2"
          >
            <option value="">Select leave type</option>
            {leaveTypes.map((type) => (
              <option key={type._id} value={type._id}>
                {type.name}
              </option>
            ))}
          </Select>
          <Input
            label="Start date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={updateField('startDate')}
            required
          />
          <Input
            label="End date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={updateField('endDate')}
            min={formData.startDate || undefined}
            required
          />
          <Textarea
            label="Reason"
            name="reason"
            rows={4}
            placeholder="Add a short reason for your request..."
            value={formData.reason}
            onChange={updateField('reason')}
            required
            className="sm:col-span-2"
          />
          <p className="flex items-center gap-1.5 text-[11px] text-subtle sm:col-span-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Working days are calculated automatically, excluding weekends and holidays.
          </p>
        </form>
      </Modal>
    </div>
  );
}
