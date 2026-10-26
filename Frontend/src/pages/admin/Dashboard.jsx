import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  Clock3,
  FileText,
  RefreshCw,
  Sparkles,
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
import { formatCurrency, formatDate } from '../../utils/format';

const quickActions = [
  {
    title: 'Manage people',
    description: 'Add employees, update records and review the directory.',
    to: '/admin/employees',
    icon: UsersRound
  },
  {
    title: 'Review requests',
    description: 'Approve leave and keep the request queue moving.',
    to: '/admin/leave',
    icon: FileText
  },
  {
    title: 'Run payroll',
    description: 'Prepare the monthly payroll cycle and review totals.',
    to: '/admin/payroll',
    icon: Wallet
  }
];

export default function AdminDashboard() {
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
      const res = await API.get('/dashboard/admin');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the dashboard right now.');
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
  const onLeaveToday = kpis.onLeaveToday || 0;
  const unaccounted = Math.max(totalEmployees - presentToday - onLeaveToday, 0);
  const presentRate = totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0;

  const departments = (data?.employeesByDepartment || [])
    .map((entry) => ({
      name: entry.dept?.name || 'Unassigned',
      value: entry.count || 0
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader
        eyebrow="Admin overview"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.firstName || 'Admin'}`}
        description={`${formatDate(new Date())} · A live view of your workforce, attendance and payroll.`}
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
              AI insights
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total employees"
              value={totalEmployees}
              icon={UsersRound}
              tone="indigo"
              hint="Active and probation staff"
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
              title="On leave today"
              value={onLeaveToday}
              icon={Clock3}
              tone="amber"
              hint={`${unaccounted} not yet accounted for`}
              loading={loading}
            />
            <StatCard
              title="Payroll cost"
              value={formatCurrency(kpis.payrollCost)}
              icon={Wallet}
              tone="violet"
              hint="Latest finalized run this month"
              loading={loading}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <ChartCard
              title="Headcount by department"
              description="Active and probation employees across your teams"
              className="xl:col-span-2"
              height="h-80"
              action={<Badge tone="indigo">{totalEmployees} people</Badge>}
            >
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : departments.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No department data"
                  description="Add employees and assign departments to see the distribution."
                />
              ) : (
                <div className="grid h-full min-h-0 gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departments}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="88%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {departments.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} employees`} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalEmployees}</span>
                      <span className="text-[11px] font-medium text-muted">employees</span>
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-col justify-center gap-2.5 overflow-y-auto">
                    {departments.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                          {entry.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {entry.value}
                        </span>
                        <span className="w-9 text-right text-[10px] text-subtle">
                          {Math.round((entry.value / Math.max(totalEmployees, 1)) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            <Card className="p-5">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today at a glance</h3>
                  <p className="mt-1 text-xs text-muted">Live attendance snapshot</p>
                </div>
                <Badge tone={presentRate >= 80 ? 'emerald' : 'amber'} dot>
                  {presentRate}% present
                </Badge>
              </div>

              {loading ? (
                <div className="space-y-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Present</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{presentToday}</span>
                    </div>
                    <ProgressBar value={presentRate} tone="emerald" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">On leave</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{onLeaveToday}</span>
                    </div>
                    <ProgressBar value={totalEmployees ? (onLeaveToday / totalEmployees) * 100 : 0} tone="amber" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Not checked in</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{unaccounted}</span>
                    </div>
                    <ProgressBar value={totalEmployees ? (unaccounted / totalEmployees) * 100 : 0} tone="rose" />
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
                      Attendance health
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-indigo-900/70 dark:text-indigo-200/70">
                      {presentRate >= 80
                        ? 'Strong turnout today. Keep an eye on unaccounted team members.'
                        : 'Attendance is below the usual target. Review absences and open leave.'}
                    </p>
                  </div>
                </div>
              )}
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
