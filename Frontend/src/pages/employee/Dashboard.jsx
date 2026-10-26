import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  FileText,
  LogIn,
  LogOut,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import toast from 'react-hot-toast';
import API from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge,
  Button,
  Card,
  ChartCard,
  EmptyState,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatCard
} from '../../components/ui';
import { ChartTooltip, axisTick } from '../../components/charts';
import FaceVerification from '../../components/FaceVerification';
import { formatTime, titleCase } from '../../utils/format';

const statusTones = {
  present: 'emerald',
  late: 'amber',
  half_day: 'amber',
  absent: 'rose',
  on_leave: 'violet'
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [cameraMode, setCameraMode] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await API.get('/dashboard/employee');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your dashboard right now.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async () => {
    setActionLoading('in');
    try {
      const res = await API.post('/attendance/check-in', { source: 'web' });
      const attendanceToday = res.data?.attendanceToday ?? res.data?.attendance;
      if (attendanceToday) {
        setData((current) => (current ? { ...current, attendanceToday } : current));
      }
      toast.success(res.data?.message || 'Checked in successfully');
      await loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleCheckOut = async () => {
    setActionLoading('out');
    try {
      const res = await API.post('/attendance/check-out', { source: 'web' });
      const attendanceToday = res.data?.attendanceToday ?? res.data?.attendance;
      if (attendanceToday) {
        setData((current) => (current ? { ...current, attendanceToday } : current));
      }
      toast.success(res.data?.message || 'Checked out successfully');
      await loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading('');
    }
  };

  const attendance = data?.attendanceToday;
  const checkIn = attendance?.checkIn;
  const checkOut = attendance?.checkOut;
  const isCheckedIn = Boolean(checkIn && !checkOut);
  const isComplete = Boolean(checkOut);
  const status = attendance?.status || 'not_checked_in';
  const leaveBalances = data?.leaveBalances || [];
  const totalLeaveRemaining = leaveBalances.reduce(
    (sum, balance) => sum + Number(balance.remaining || 0),
    0
  );

  const leaveChartData = leaveBalances.map((balance) => {
    const quota = Number(balance.quota || 0);
    const remaining = Number(balance.remaining || 0);
    const used = balance.used != null ? Number(balance.used) : Math.max(quota - remaining, 0);

    return {
      name: balance.leaveType?.name || 'Leave',
      remaining,
      used
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Employee portal"
        title={`Welcome back, ${user?.firstName || 'there'}`}
        description="Your attendance, leave balance and weekly hours — all in one place."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={() => loadData()} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Dashboard unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={() => loadData()}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="relative mb-4 overflow-hidden border-0 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-5 text-white shadow-xl shadow-indigo-500/20 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white backdrop-blur">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">
                    Today's attendance
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  {isComplete ? 'Your day is complete' : isCheckedIn ? 'You are checked in' : 'Ready to start your day?'}
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-indigo-100/85">
                  {isComplete
                    ? 'Your check-in and check-out are recorded for today.'
                    : isCheckedIn
                      ? `Checked in at ${formatTime(checkIn)}. Remember to check out at the end of your shift.`
                      : 'Check in to start tracking today’s hours and attendance.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {status === 'not_checked_in' ? 'Not checked in' : titleCase(status)}
                  </span>
                  {checkIn ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-indigo-50 backdrop-blur">
                      In: {formatTime(checkIn)}
                    </span>
                  ) : null}
                  {checkOut ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-indigo-50 backdrop-blur">
                      Out: {formatTime(checkOut)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                {!checkIn ? (
                  <>
                    <Button
                      icon={Camera}
                      onClick={() => setCameraMode('check-in')}
                      className="bg-white text-indigo-700 shadow-lg shadow-indigo-900/20 hover:bg-indigo-50"
                    >
                      Face check-in
                    </Button>
                    <Button
                      icon={LogIn}
                      loading={actionLoading === 'in'}
                      onClick={handleCheckIn}
                      className="bg-white/15 text-white shadow-none ring-1 ring-inset ring-white/30 backdrop-blur hover:bg-white/25"
                    >
                      Check in now
                    </Button>
                  </>
                ) : null}
                {isCheckedIn ? (
                  <>
                    <Button
                      icon={Camera}
                      onClick={() => setCameraMode('check-out')}
                      className="bg-white text-indigo-700 shadow-lg shadow-indigo-900/20 hover:bg-indigo-50"
                    >
                      Face check-out
                    </Button>
                    <Button
                      icon={LogOut}
                      loading={actionLoading === 'out'}
                      onClick={handleCheckOut}
                      className="bg-white/15 text-white shadow-none ring-1 ring-inset ring-white/30 backdrop-blur hover:bg-white/25"
                    >
                      Check out
                    </Button>
                  </>
                ) : null}
                {isComplete ? (
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                    <CalendarCheck2 className="h-4 w-4" />
                    Completed for today
                  </span>
                ) : null}
                <Link
                  to="/employee/leave"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <FileText className="h-4 w-4" />
                  Request leave
                </Link>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Hours this week"
              value={`${data?.hoursThisWeek || 0} hrs`}
              icon={Clock3}
              tone="sky"
              hint="Based on recorded attendance"
              loading={loading}
            />
            <StatCard
              title="Leave remaining"
              value={`${totalLeaveRemaining} days`}
              icon={CalendarDays}
              tone="violet"
              hint={`${leaveBalances.length} leave type${leaveBalances.length === 1 ? '' : 's'}`}
              loading={loading}
            />
            <StatCard
              title="Today's status"
              value={status === 'not_checked_in' ? 'Not checked in' : titleCase(status)}
              icon={CalendarCheck2}
              tone={statusTones[status] || 'indigo'}
              hint={isComplete ? 'Attendance complete' : isCheckedIn ? 'Currently on the clock' : 'No attendance yet'}
              loading={loading}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Leave balance overview"
              description="Used and remaining days by leave type"
              className="xl:col-span-2"
              height="h-72"
              action={
                <div className="flex items-center gap-3 text-[10px] font-medium text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" /> Used
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Remaining
                  </span>
                </div>
              }
            >
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : leaveChartData.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No leave balances yet"
                  description="Your leave balances will appear here once they are assigned."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveChartData} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                      content={<ChartTooltip valueFormatter={(value) => `${value} days`} />}
                    />
                    <Bar dataKey="used" name="Used" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="remaining" name="Remaining" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <Card className="flex flex-col p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">My leave balances</h3>
                  <p className="mt-1 text-xs text-muted">Available days this year</p>
                </div>
                <Badge tone="violet">{totalLeaveRemaining} days</Badge>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : leaveBalances.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing assigned yet"
                  description="Contact HR if you believe your balances are missing."
                />
              ) : (
                <div className="space-y-4">
                  {leaveBalances.slice(0, 5).map((balance) => {
                    const quota = Number(balance.quota || 0);
                    const remaining = Number(balance.remaining || 0);
                    const percent = quota ? Math.round((remaining / quota) * 100) : 0;

                    return (
                      <div key={balance._id}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                            {balance.leaveType?.name || 'Leave'}
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
                            {remaining} / {quota} days
                          </span>
                        </div>
                        <ProgressBar value={percent} tone="violet" />
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                to="/employee/leave"
                className="mt-auto pt-5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
              >
                View leave history and requests
              </Link>
            </Card>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-xs text-muted dark:border-slate-800 dark:bg-slate-900/40">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
            Need help with policies or leave? Ask the AI assistant from the sidebar.
            <Link to="/employee/ai" className="ml-auto shrink-0 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Open assistant
            </Link>
          </div>
        </>
      )}

      <FaceVerification
        open={Boolean(cameraMode)}
        mode={cameraMode || 'check-in'}
        onClose={() => setCameraMode(null)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
