import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Inbox,
  RefreshCw,
  ShieldCheck,
  Timer
} from 'lucide-react';
import API from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  SearchField,
  StatCard,
  TableSkeleton
} from '../../components/ui';
import { formatDate, formatTime, initials, titleCase } from '../../utils/format';

const statusTones = {
  present: 'emerald',
  late: 'amber',
  half_day: 'amber',
  absent: 'rose',
  on_leave: 'violet'
};

const dateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export default function Attendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const isEmployee = user?.role === 'employee';

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/attendance', { params: { limit: 500 } });
      setAttendance(res.data.attendance || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return attendance.filter((record) => {
      const name = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.toLowerCase();
      const matchesSearch =
        !term ||
        name.includes(term) ||
        record.employee?.employeeId?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesDate = !dateFilter || dateKey(record.date) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [attendance, search, statusFilter, dateFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const presentCount = filtered.filter((record) => record.status === 'present' || record.status === 'late').length;
  const lateCount = filtered.filter((record) => record.status === 'late').length;
  const totalHours = filtered.reduce((sum, record) => sum + Number(record.hoursWorked || 0), 0);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
  };

  return (
    <div>
      <PageHeader
        eyebrow={isEmployee ? 'My records' : 'Time and attendance'}
        title={isEmployee ? 'My attendance' : 'Attendance register'}
        description={
          isEmployee
            ? 'Review your check-in history, hours and status.'
            : 'Track daily attendance, late arrivals and hours across the team.'
        }
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={loadAttendance} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Attendance unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadAttendance}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Records"
              value={filtered.length}
              icon={CalendarDays}
              tone="indigo"
              hint="Matching your filters"
              loading={loading}
            />
            <StatCard
              title="Present"
              value={presentCount}
              icon={CalendarCheck2}
              tone="emerald"
              hint="Including late arrivals"
              loading={loading}
            />
            <StatCard
              title="Late arrivals"
              value={lateCount}
              icon={Timer}
              tone="amber"
              hint="Past the start time"
              loading={loading}
            />
            <StatCard
              title="Hours logged"
              value={`${Math.round(totalHours * 10) / 10} hrs`}
              icon={Clock3}
              tone="violet"
              hint="Across matching records"
              loading={loading}
            />
          </div>

          <Card className="mb-4 p-3.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              {!isEmployee ? (
                <SearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee by name or ID..."
                  className="flex-1"
                />
              ) : <div className="flex-1" />}
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="field w-36"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half day</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On leave</option>
                </select>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="field w-40"
                  aria-label="Filter by date"
                />
                <Button variant="ghost" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {loading ? (
            <TableSkeleton rows={8} columns={isEmployee ? 5 : 7} />
          ) : (
            <Card className="overflow-hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No attendance records"
                  description="There are no records matching your current filters."
                />
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {!isEmployee ? <th>Employee</th> : null}
                          <th>Date</th>
                          <th>Check in</th>
                          <th>Check out</th>
                          {!isEmployee ? <th>Face verification</th> : null}
                          <th>Status</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((record) => (
                          <tr key={record._id}>
                            {!isEmployee ? (
                              <td>
                                <div className="flex items-center gap-3">
                                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {initials(record.employee?.firstName, record.employee?.lastName)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                                      {record.employee?.firstName} {record.employee?.lastName}
                                    </p>
                                    <p className="text-[11px] text-muted">{record.employee?.employeeId}</p>
                                  </div>
                                </div>
                              </td>
                            ) : null}
                            <td className="whitespace-nowrap">{formatDate(record.date)}</td>
                            <td className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {formatTime(record.checkIn)}
                                {record.faceVerified ? (
                                  <span title="Face and location verified" className="text-emerald-500">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="whitespace-nowrap">{formatTime(record.checkOut)}</td>
                            {!isEmployee ? (
                              <td>
                                {record.faceVerified || record.checkOutFaceVerified ? (
                                  <div className="flex flex-col gap-1.5">
                                    {record.faceVerified ? (
                                      <Badge tone="emerald">
                                        In {Math.round(Number(record.faceConfidence || 0) * 100)}%
                                      </Badge>
                                    ) : null}
                                    {record.checkOutFaceVerified ? (
                                      <Badge tone="indigo">
                                        Out {Math.round(Number(record.checkOutFaceConfidence || 0) * 100)}%
                                      </Badge>
                                    ) : null}
                                  </div>
                                ) : (
                                  <Badge tone="neutral">Not verified</Badge>
                                )}
                              </td>
                            ) : null}
                            <td>
                              <Badge tone={statusTones[record.status] || 'neutral'} dot>
                                {titleCase(record.status)}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                              {Number(record.hoursWorked || 0).toFixed(1)} hrs
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
    </div>
  );
}
