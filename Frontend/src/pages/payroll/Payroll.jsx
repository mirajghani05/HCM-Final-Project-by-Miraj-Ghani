import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Inbox,
  Plus,
  RefreshCw,
  Wallet
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
  TableSkeleton
} from '../../components/ui';
import { formatCurrency, formatDate, titleCase } from '../../utils/format';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const periodLabel = (month, year) => `${MONTHS[Number(month) - 1] || month} ${year}`;

const buildPayslipText = (data) => `PAYSLIP

Period: ${MONTHS[Number(data.run.month) - 1]} ${data.run.year}
Employee: ${data.employee.firstName} ${data.employee.lastName} (${data.employee.employeeId})

EARNINGS
Basic: Rs ${data.earnings.basic}
Gross: Rs ${data.earnings.gross}

DEDUCTIONS
Absent: ${data.deductions.absent} days
Unpaid leave: ${data.deductions.unpaidLeave} days
Half days: ${data.deductions.halfDays}
Tax: Rs ${data.deductions.tax}
Total deductions: Rs ${data.deductions.total}

NET PAY: Rs ${data.netPay}`;

export default function Payroll() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalizingId, setFinalizingId] = useState('');
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [payslipDetail, setPayslipDetail] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const pageSize = 8;
  const isEmployee = user?.role === 'employee';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isEmployee) {
        const res = await API.get('/payroll/my/payslips');
        setPayslips(Array.isArray(res.data) ? res.data : []);
      } else {
        const res = await API.get('/payroll');
        setRuns(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load payroll data.');
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/payroll', {
        month: Number(formData.month),
        year: Number(formData.year)
      });
      toast.success('Payroll run created');
      setShowForm(false);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create payroll run');
    } finally {
      setSubmitting(false);
    }
  };

  const finalize = async (id) => {
    setFinalizingId(id);
    try {
      await API.put(`/payroll/${id}/finalize`);
      toast.success('Payroll finalized');
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not finalize payroll');
    } finally {
      setFinalizingId('');
    }
  };

  const fetchPayslip = async (payslip) => {
    const res = await API.get(`/payroll/${payslip.runId}/payslip`);
    return res.data;
  };

  const viewPayslip = async (payslip) => {
    setPayslipLoading(payslip.runId);
    try {
      const data = await fetchPayslip(payslip);
      setPayslipDetail(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load payslip');
    } finally {
      setPayslipLoading('');
    }
  };

  const downloadPayslip = async (payslip) => {
    setDownloadingId(payslip.runId);
    try {
      const data = await fetchPayslip(payslip);
      const blob = new Blob([buildPayslipText(data)], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `payslip_${payslip.month}_${payslip.year}.txt`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not download payslip');
    } finally {
      setDownloadingId('');
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source = isEmployee ? payslips : runs;

    return source.filter((item) => {
      const period = `${MONTHS[Number(item.month) - 1] || ''} ${item.year} ${item.month}/${item.year}`.toLowerCase();
      const matchesSearch = !term || period.includes(term);
      const matchesStatus = isEmployee || statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [isEmployee, payslips, runs, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const latestRun = runs[0];
  const latestPayslip = payslips[0];
  const finalizedCount = runs.filter((run) => run.status === 'finalized').length;
  const totalNet = runs.reduce((sum, run) => sum + Number(run.totalNet || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow={isEmployee ? 'Compensation' : 'Finance operations'}
        title={isEmployee ? 'My payslips' : 'Payroll'}
        description={
          isEmployee
            ? 'Download and review your finalized payslips.'
            : 'Create payroll runs, review totals and finalize each pay cycle.'
        }
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadData} loading={loading}>
              Refresh
            </Button>
            {!isEmployee ? (
              <Button icon={Plus} onClick={() => setShowForm(true)}>Create payroll run</Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Payroll unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadData}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isEmployee ? (
              <>
                <StatCard
                  title="Payslips"
                  value={payslips.length}
                  icon={FileText}
                  tone="indigo"
                  hint="Finalized payroll periods"
                  loading={loading}
                />
                <StatCard
                  title="Latest net pay"
                  value={formatCurrency(latestPayslip?.netPay)}
                  icon={Wallet}
                  tone="emerald"
                  hint={latestPayslip ? periodLabel(latestPayslip.month, latestPayslip.year) : 'No payslips yet'}
                  loading={loading}
                />
                <StatCard
                  title="Latest gross"
                  value={formatCurrency(latestPayslip?.gross)}
                  icon={CalendarDays}
                  tone="violet"
                  hint="Before deductions"
                  loading={loading}
                />
                <StatCard
                  title="Last period"
                  value={latestPayslip ? periodLabel(latestPayslip.month, latestPayslip.year) : '-'}
                  icon={Clock3}
                  tone="sky"
                  hint="Most recent finalized run"
                  loading={loading}
                />
              </>
            ) : (
              <>
                <StatCard
                  title="Payroll runs"
                  value={runs.length}
                  icon={FileText}
                  tone="indigo"
                  hint="All pay cycles"
                  loading={loading}
                />
                <StatCard
                  title="Finalized"
                  value={finalizedCount}
                  icon={CheckCircle2}
                  tone="emerald"
                  hint="Ready for payslips"
                  loading={loading}
                />
                <StatCard
                  title="Latest gross"
                  value={formatCurrency(latestRun?.totalGross)}
                  icon={Wallet}
                  tone="violet"
                  hint={latestRun ? periodLabel(latestRun.month, latestRun.year) : 'No runs yet'}
                  loading={loading}
                />
                <StatCard
                  title="Total net"
                  value={formatCurrency(totalNet)}
                  icon={CalendarDays}
                  tone="sky"
                  hint="Across all runs"
                  loading={loading}
                />
              </>
            )}
          </div>

          <Card className="mb-4 p-3.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by period, e.g. August 2026..."
                className="flex-1"
              />
              {!isEmployee ? (
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="field w-full sm:w-40"
                  aria-label="Filter payroll by status"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="finalized">Finalized</option>
                </select>
              ) : null}
            </div>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={isEmployee ? 4 : 6} />
          ) : (
            <Card className="overflow-hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={isEmployee ? 'No payslips available' : 'No payroll runs found'}
                  description={
                    isEmployee
                      ? 'Payslips appear here after payroll is finalized.'
                      : 'Create a payroll run or adjust your filters to see results.'
                  }
                  action={
                    !isEmployee ? <Button icon={Plus} onClick={() => setShowForm(true)}>Create payroll run</Button> : null
                  }
                />
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          {!isEmployee ? <th>Working days</th> : null}
                          <th>Gross</th>
                          <th>Net pay</th>
                          {!isEmployee ? <th>Status</th> : null}
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isEmployee
                          ? paginated.map((payslip) => (
                              <tr key={payslip.runId}>
                                <td className="whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                                  {periodLabel(payslip.month, payslip.year)}
                                </td>
                                <td className="whitespace-nowrap">{formatCurrency(payslip.gross)}</td>
                                <td className="whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(payslip.netPay)}
                                </td>
                                <td>
                                  <div className="flex gap-1.5">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      icon={Eye}
                                      loading={payslipLoading === payslip.runId}
                                      onClick={() => viewPayslip(payslip)}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      icon={Download}
                                      loading={downloadingId === payslip.runId}
                                      onClick={() => downloadPayslip(payslip)}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          : paginated.map((run) => (
                              <tr key={run._id}>
                                <td className="whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                                  {periodLabel(run.month, run.year)}
                                </td>
                                <td>{run.workingDays || 0}</td>
                                <td className="whitespace-nowrap">{formatCurrency(run.totalGross)}</td>
                                <td className="whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(run.totalNet)}
                                </td>
                                <td>
                                  <Badge tone={run.status === 'finalized' ? 'emerald' : 'amber'} dot>
                                    {titleCase(run.status)}
                                  </Badge>
                                </td>
                                <td>
                                  {run.status === 'draft' ? (
                                    <Button
                                      variant="success"
                                      size="sm"
                                      loading={finalizingId === run._id}
                                      onClick={() => finalize(run._id)}
                                    >
                                      Finalize
                                    </Button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Finalized
                                    </span>
                                  )}
                                </td>
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
        onClose={() => setShowForm(false)}
        title="Create payroll run"
        description="Choose the period. Salary structures and attendance will be used to calculate each item."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" form="payroll-form" loading={submitting} icon={Plus}>
              Create run
            </Button>
          </>
        }
      >
        <form id="payroll-form" onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Month"
            name="month"
            value={formData.month}
            onChange={(event) => setFormData((current) => ({ ...current, month: event.target.value }))}
            required
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </Select>
          <Input
            label="Year"
            name="year"
            type="number"
            min="2000"
            max="2100"
            value={formData.year}
            onChange={(event) => setFormData((current) => ({ ...current, year: event.target.value }))}
            required
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(payslipDetail)}
        onClose={() => setPayslipDetail(null)}
        title={payslipDetail ? `Payslip · ${periodLabel(payslipDetail.run.month, payslipDetail.run.year)}` : 'Payslip'}
        description="A read-only summary of this finalized pay period."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayslipDetail(null)}>Close</Button>
            {payslipDetail ? (
              <Button
                icon={Download}
                loading={Boolean(downloadingId)}
                onClick={() => downloadPayslip({
                  runId: payslips.find((item) => item.month === payslipDetail.run.month && item.year === payslipDetail.run.year)?.runId,
                  month: payslipDetail.run.month,
                  year: payslipDetail.run.year
                })}
              >
                Download payslip
              </Button>
            ) : null}
          </>
        }
      >
        {payslipDetail ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">Net pay</p>
              <p className="mt-1 text-3xl font-bold">{formatCurrency(payslipDetail.netPay)}</p>
              <p className="mt-1 text-xs text-indigo-100/80">
                {payslipDetail.employee?.firstName} {payslipDetail.employee?.lastName} · {payslipDetail.employee?.employeeId}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Earnings</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted">Basic</span><span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payslipDetail.earnings?.basic)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Gross</span><span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payslipDetail.earnings?.gross)}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Deductions</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted">Absent days</span><span className="font-semibold text-slate-900 dark:text-white">{payslipDetail.deductions?.absent}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Unpaid leave</span><span className="font-semibold text-slate-900 dark:text-white">{payslipDetail.deductions?.unpaidLeave} days</span></div>
                  <div className="flex justify-between"><span className="text-muted">Tax</span><span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(payslipDetail.deductions?.tax)}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800"><span className="text-muted">Total</span><span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(payslipDetail.deductions?.total)}</span></div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-subtle">
              Working days in period: {payslipDetail.workingDays} · Generated {formatDate(new Date())}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
