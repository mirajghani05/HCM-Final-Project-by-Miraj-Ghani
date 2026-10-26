import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Eye,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  UserRoundCheck
} from 'lucide-react';
import API from '../../services/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  SearchField,
  Skeleton,
  StatCard
} from '../../components/ui';
import { formatDateTime, roleLabel } from '../../utils/format';

const roleTones = {
  admin: 'violet',
  hr: 'indigo',
  employee: 'neutral'
};

const isToday = (value) => {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const pageSize = 10;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/audit-logs');
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, roleFilter]);

  const actions = useMemo(
    () => [...new Set(logs.map((log) => log.action).filter(Boolean))].sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const actor = `${log.actor?.firstName || ''} ${log.actor?.lastName || ''}`.toLowerCase();
      const matchesSearch =
        !term ||
        actor.includes(term) ||
        log.action?.toLowerCase().includes(term) ||
        log.entity?.toLowerCase().includes(term) ||
        log.ipAddress?.toLowerCase().includes(term);
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesRole = roleFilter === 'all' || log.actorRole === roleFilter;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [logs, search, actionFilter, roleFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const todayCount = logs.filter((log) => isToday(log.createdAt)).length;
  const actorCount = new Set(logs.map((log) => log.actor?._id).filter(Boolean)).size;
  const adminActions = logs.filter((log) => log.actorRole === 'admin').length;

  return (
    <div>
      <PageHeader
        eyebrow="Security & compliance"
        title="Audit logs"
        description="A permanent trail of important actions taken across your workspace."
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={loadLogs} loading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Audit logs unavailable"
            description={error}
            action={<Button icon={RefreshCw} onClick={loadLogs}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total events"
              value={logs.length}
              icon={ScrollText}
              tone="indigo"
              hint="Recorded activity"
              loading={loading}
            />
            <StatCard
              title="Today"
              value={todayCount}
              icon={Activity}
              tone="emerald"
              hint="Events since midnight"
              loading={loading}
            />
            <StatCard
              title="Active actors"
              value={actorCount}
              icon={UserRoundCheck}
              tone="violet"
              hint="Unique users in the log"
              loading={loading}
            />
            <StatCard
              title="Admin actions"
              value={adminActions}
              icon={ShieldCheck}
              tone="sky"
              hint="Performed by administrators"
              loading={loading}
            />
          </div>

          <Card className="mb-4 p-3.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
              <SearchField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actor, action, entity or IP address..."
                className="flex-1"
              />
              <div className="flex gap-2">
                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="field w-full lg:w-44"
                  aria-label="Filter by action"
                >
                  <option value="all">All actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="field w-full lg:w-36"
                  aria-label="Filter by role"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            </div>
          </Card>

          {loading ? (
            <Card className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {paginated.length === 0 ? (
                <EmptyState
                  icon={ScrollText}
                  title="No audit events found"
                  description="No activity matches your current filters."
                />
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Actor</th>
                          <th>Role</th>
                          <th>Action</th>
                          <th>Entity</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((log) => (
                          <tr key={log._id}>
                            <td className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                            <td className="whitespace-nowrap">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {log.actor?.firstName || 'System'} {log.actor?.lastName || ''}
                              </p>
                              {log.ipAddress ? (
                                <p className="text-[10px] text-subtle">{log.ipAddress}</p>
                              ) : null}
                            </td>
                            <td>
                              <Badge tone={roleTones[log.actorRole] || 'neutral'}>
                                {roleLabel(log.actorRole || 'system')}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                              {log.action}
                            </td>
                            <td className="whitespace-nowrap">{log.entity}</td>
                            <td>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Eye}
                                onClick={() => setSelectedLog(log)}
                              >
                                View
                              </Button>
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
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit event details"
        description={selectedLog ? formatDateTime(selectedLog.createdAt) : ''}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setSelectedLog(null)}>Close</Button>}
      >
        {selectedLog ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Actor</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedLog.actor?.firstName || 'System'} {selectedLog.actor?.lastName || ''}
                </p>
                <p className="text-[11px] text-muted">{roleLabel(selectedLog.actorRole || 'system')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Entity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{selectedLog.entity}</p>
                <p className="break-all text-[11px] text-muted">{selectedLog.entityId || 'No entity ID'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Action</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{selectedLog.action}</p>
              {selectedLog.ipAddress ? (
                <p className="mt-1 text-[11px] text-muted">IP address: {selectedLog.ipAddress}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-subtle">Before</p>
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-300">
                  {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : 'No previous state recorded'}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-subtle">After</p>
                <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-300">
                  {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : 'No new state recorded'}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
