import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  ClipboardList,
  Clock3,
  FileText,
  RefreshCw,
  Sparkles,
  Timer,
  UsersRound,
  Wallet
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
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
import { CHART_COLORS, ChartTooltip } from '../../components/charts';
import { formatDate } from '../../utils/format';

const quickActions = [
  {
    title: 'Employee directory',
    description: 'Search, review and update staff records.',
    to: '/hr/employees',
    icon: UsersRound
  },
  {
    title: 'Attendance register',
    description: 'Mark, review and correct daily attendance.',
    to: '/hr/attendance',
    icon: CalendarCheck2
  },
  {
    title: 'Leave queue',
    description: 'Clear pending requests and keep teams covered.',
    to: '/hr/leave',
    icon: FileText
  }
];

export default function HRDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/dashboard/hr');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the HR dashboard right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSummary = async () => {
    if (!data) return;
    setLoadingSummary(true);
    try {
      const res = await API.post('/ai/summarize', { kpis: data.kpis });
      setSummary(res.data.summary || []);
    } catch {
      toast.error('Failed to generate AI insights');
    } finally {
      setLoadingSummary(false);
    }
  };

  const kpis = data?.kpis || {};
  const totalEmployees = kpis.totalEmployees || 0;
  const presentToday = kpis.presentToday || 0;
  const lateToday = kpis.lateToday || 0;
  const onLeaveToday = kpis.onLeaveToday || 0;
  const pendingLeaves = kpis.pendingLeaves || 0;
  const unaccounted = Math.max(totalEmployees - presentToday - onLeaveToday, 0);
  const presentRate = totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0;

  const attendanceData = [
    { name: 'Present', value: presentToday, color: CHART_COLORS[1] },
    { name: 'On leave', value: onLeaveToday, color: CHART_COLORS[2] },
    { name: 'Not checked in', value: unaccounted, color: CHART_COLORS[3] }
  ].filter((entry) => entry.value > 0);

  return (
    <div>
      <PageHeader
        eyebrow="HR overview"
        title={`People operations, ${user?.firstName || 'HR'}`}
        description={`${formatDate(new Date())} · Stay ahead of attendance, leave requests and payroll readiness.`}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadData} loading={loading}>
              Refresh
            </Button>
            <Button
              icon={Sparkles}
              onClick={getSummary}
              loading={loadingSummary}
              disabled={!data}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-500/20 hover:from-violet-500 hover:to-fuchsia-500"
            >
              AI summary
            </Button>
          </>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Dashboard unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadData}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Total employees"
              value={totalEmployees}
              icon={UsersRound}
              tone="indigo"
              hint="Active workforce"
              loading={loading}
            />
            <StatCard
              title="Present today"
              value={presentToday}
              icon={CalendarCheck2}
              tone="emerald"
              hint={`${presentRate}% attendance rate`}
              loading={loading}
            />
            <StatCard
              title="Late today"
              value={lateToday}
              icon={Timer}
              tone="rose"
              hint="Needs a closer look"
              loading={loading}
            />
            <StatCard
              title="On leave"
              value={onLeaveToday}
              icon={Clock3}
              tone="amber"
              hint={`${unaccounted} not checked in`}
              loading={loading}
            />
            <StatCard
              title="Pending leave"
              value={pendingLeaves}
              icon={ClipboardList}
              tone="violet"
              hint="Awaiting your review"
              loading={loading}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Today's attendance"
              description="A real-time split of your workforce"
              className="xl:col-span-2"
              height="h-80"
              action={
                <Badge tone={lateToday > 0 ? 'rose' : 'emerald'} dot>
                  {lateToday > 0 ? `${lateToday} late` : 'On track'}
                </Badge>
              }
            >
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : totalEmployees === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No employees yet"
                  description="Once employees are added, today's attendance will appear here."
                />
              ) : (
                <div className="grid h-full min-h-0 gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="88%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {attendanceData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} employees`} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{presentRate}%</span>
                      <span className="text-[11px] font-medium text-muted">present</span>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-col justify-center gap-3 overflow-y-auto">
                    {attendanceData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                          {entry.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{entry.value}</span>
                      </div>
                    ))}
                    <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Attendance</p>
                      <ProgressBar value={presentRate} tone="emerald" className="mt-2" />
                    </div>
                  </div>
                </div>
              )}
            </ChartCard>

            <Card className="flex flex-col p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your action queue</h3>
                  <p className="mt-1 text-xs text-muted">Items that need a decision</p>
                </div>
                <Badge tone={pendingLeaves > 0 ? 'amber' : 'emerald'} dot>
                  {pendingLeaves > 0 ? 'Action needed' : 'Clear'}
                </Badge>
              </div>

              <div className="space-y-2.5">
                <Link
                  to="/hr/leave"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-amber-200 hover:bg-amber-50/50 dark:border-slate-800 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-white">Pending leave requests</span>
                    <span className="block text-[11px] text-muted">Review and respond</span>
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{pendingLeaves}</span>
                </Link>

                <Link
                  to="/hr/attendance"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-rose-200 hover:bg-rose-50/50 dark:border-slate-800 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    <Timer className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-white">Late arrivals today</span>
                    <span className="block text-[11px] text-muted">Check the attendance register</span>
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{lateToday}</span>
                </Link>

                <Link
                  to="/hr/payroll"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-white">Payroll readiness</span>
                    <span className="block text-[11px] text-muted">Prepare this month's run</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-auto rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
                  Team pulse
                </p>
                <p className="mt-1.5 text-xs leading-5 text-indigo-900/70 dark:text-indigo-200/70">
                  {pendingLeaves > 0
                    ? `${pendingLeaves} leave request${pendingLeaves === 1 ? '' : 's'} need attention before they affect team coverage.`
                    : 'No pending leave requests. Your queue is clear for now.'}
                </p>
              </div>
            </Card>
          </div>

          {summary.length > 0 ? (
            <Card className="mt-4 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 dark:border-violet-500/20 dark:from-violet-500/5 dark:to-fuchsia-500/5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-400">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI insights</h2>
                  <p className="text-[11px] text-muted">A quick briefing based on today's KPIs</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {summary.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-2.5 rounded-xl bg-white/70 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="surface group flex items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:hover:border-indigo-500/30"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400">
                  <action.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {action.title}
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
