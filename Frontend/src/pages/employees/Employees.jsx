import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck,
  Inbox,
  KeyRound,
  Plus,
  RefreshCw,
  Upload,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../services/api';
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
  cx
} from '../../components/ui';
import { formatDate, initials, titleCase } from '../../utils/format';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  joinDate: '',
  basicSalary: ''
};

const statusTones = {
  active: 'emerald',
  probation: 'amber',
  inactive: 'rose',
  resigned: 'neutral',
  terminated: 'rose'
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [importFile, setImportFile] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [tempCredentials, setTempCredentials] = useState(null);
  const pageSize = 8;

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/employees');
      setEmployees(res.data.employees || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    API.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => {});
    API.get('/designations').then((res) => setDesignations(res.data || [])).catch(() => {});
  }, [loadEmployees]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, departmentFilter]);

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await API.post('/employees', formData);
      setTempCredentials({
        email: formData.email,
        password: res.data.tempPassword
      });
      toast.success('Employee created and login generated');
      setShowForm(false);
      setFormData(emptyForm);
      await loadEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !term ||
        employee.firstName?.toLowerCase().includes(term) ||
        employee.lastName?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.employeeId?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesDepartment =
        departmentFilter === 'all' || employee.department?._id === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, search, statusFilter, departmentFilter]);

  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const probationCount = employees.filter((employee) => employee.status === 'probation').length;
  const departmentCount = new Set(
    employees.map((employee) => employee.department?._id).filter(Boolean)
  ).size;

  const runDryRun = async () => {
    if (!importFile) {
      toast.error('Select a CSV file first');
      return;
    }
    setImporting(true);
    try {
      const data = new FormData();
      data.append('file', importFile);
      const res = await API.post('/employees/import/dry-run', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDryRunResult(res.data);
      toast.success('Dry run complete');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import check failed');
    } finally {
      setImporting(false);
    }
  };

  const commitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const data = new FormData();
      data.append('file', importFile);
      const res = await API.post('/employees/import/commit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Employees imported');
      closeImport();
      await loadEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => {
    setShowImport(false);
    setDryRunResult(null);
    setImportFile(null);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDepartmentFilter('all');
  };

  return (
    <div>
      <PageHeader
        eyebrow="People directory"
        title="Employees"
        description="Create, import and maintain every employee record in one place."
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => window.open('http://localhost:5000/api/employees/export', '_blank')}
            >
              Export
            </Button>
            <Button variant="secondary" icon={Upload} onClick={() => setShowImport(true)}>
              Import
            </Button>
            <Button icon={Plus} onClick={() => setShowForm(true)}>
              Add employee
            </Button>
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
                Temporary login created for {tempCredentials.email}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Share this temporary password securely. It is only shown once.
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

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total employees"
          value={employees.length}
          icon={UsersRound}
          tone="indigo"
          hint="All records in the directory"
          loading={loading}
        />
        <StatCard
          title="Active"
          value={activeCount}
          icon={UserRoundCheck}
          tone="emerald"
          hint="Currently working"
          loading={loading}
        />
        <StatCard
          title="On probation"
          value={probationCount}
          icon={CheckCircle2}
          tone="amber"
          hint={`${departmentCount} departments represented`}
          loading={loading}
        />
      </div>

      <Card className="mb-4 p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <SearchField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or employee ID..."
            className="flex-1"
          />
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="field w-full sm:w-40"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="inactive">Inactive</option>
              <option value="resigned">Resigned</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="field w-full sm:w-44"
              aria-label="Filter by department"
            >
              <option value="all">All departments</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="icon" onClick={resetFilters} aria-label="Reset filters" title="Reset filters">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2.5 px-1 text-[11px] text-subtle">
          Showing {filteredEmployees.length} of {employees.length} employees
        </p>
      </Card>

      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <Card className="overflow-hidden">
          {paginatedEmployees.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No employees found"
              description="Try adjusting your filters, or add a new employee to get started."
              action={<Button icon={Plus} onClick={() => setShowForm(true)}>Add employee</Button>}
            />
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white shadow-sm shadow-indigo-500/20">
                              {initials(employee.firstName, employee.lastName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-white">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                {employee.employeeId} · {employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{employee.department?.name || 'Unassigned'}</td>
                        <td className="whitespace-nowrap">{employee.designation?.title || '-'}</td>
                        <td className="whitespace-nowrap">{formatDate(employee.joinDate)}</td>
                        <td>
                          <Badge tone={statusTones[employee.status] || 'neutral'} dot>
                            {titleCase(employee.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filteredEmployees.length}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Register new employee"
        description="A login and temporary password will be generated automatically."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" form="employee-form" loading={submitting} icon={Plus}>
              Create employee
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            placeholder="Ayesha"
            value={formData.firstName}
            onChange={updateField('firstName')}
            required
            autoFocus
          />
          <Input
            label="Last name"
            name="lastName"
            placeholder="Khan"
            value={formData.lastName}
            onChange={updateField('lastName')}
            required
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="employee@company.com"
            value={formData.email}
            onChange={updateField('email')}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+92 300 0000000"
            value={formData.phone}
            onChange={updateField('phone')}
          />
          <Select
            label="Department"
            name="department"
            value={formData.department}
            onChange={updateField('department')}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
              </option>
            ))}
          </Select>
          <Select
            label="Designation"
            name="designation"
            value={formData.designation}
            onChange={updateField('designation')}
          >
            <option value="">Select designation</option>
            {designations.map((designation) => (
              <option key={designation._id} value={designation._id}>
                {designation.title}
              </option>
            ))}
          </Select>
          <Input
            label="Join date"
            name="joinDate"
            type="date"
            value={formData.joinDate}
            onChange={updateField('joinDate')}
            required
          />
          <Input
            label="Basic salary (Rs)"
            name="basicSalary"
            type="number"
            min="0"
            step="1000"
            placeholder="75000"
            value={formData.basicSalary}
            onChange={updateField('basicSalary')}
            required
          />
        </form>
      </Modal>

      <Modal
        open={showImport}
        onClose={closeImport}
        title="Import employees from CSV"
        description="Run a dry run first, then commit only the valid rows."
        size="lg"
        footer={
          dryRunResult?.validRows > 0 ? (
            <>
              <Button variant="secondary" onClick={closeImport}>Cancel</Button>
              <Button variant="success" loading={importing} onClick={commitImport} icon={FileCheck}>
                Import {dryRunResult.validRows} valid row{dryRunResult.validRows === 1 ? '' : 's'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={closeImport}>Cancel</Button>
              <Button loading={importing} onClick={runDryRun} icon={CheckCircle2}>
                Run dry run
              </Button>
            </>
          )
        }
      >
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center dark:border-slate-700 dark:bg-slate-950/30">
          <Upload className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
            Choose a CSV file
          </p>
          <p className="mt-1 text-xs text-muted">
            Required columns: firstName, lastName, email, phone, department, designation, joinDate, basicSalary
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(event) => {
              setImportFile(event.target.files?.[0] || null);
              setDryRunResult(null);
            }}
            className="mx-auto mt-4 block w-full max-w-sm text-sm text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-400 dark:file:bg-indigo-500/10 dark:file:text-indigo-300"
          />
          {importFile ? (
            <p className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
              Selected: {importFile.name}
            </p>
          ) : null}
        </div>

        {dryRunResult ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-100 p-3 text-center dark:bg-slate-800">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{dryRunResult.totalRows}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">Rows</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-500/10">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{dryRunResult.validRows}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">Valid</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-center dark:bg-rose-500/10">
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{dryRunResult.errors?.length || 0}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-rose-600/70 dark:text-rose-400/70">Errors</p>
              </div>
            </div>

            {dryRunResult.errors?.length > 0 ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                  Rows that need attention
                </p>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {dryRunResult.errors.map((error, index) => (
                    <p key={index} className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                      Row {error.row}: {error.reason}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cx('flex items-center gap-2 rounded-xl p-3 text-xs font-medium', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300')}>
                <CheckCircle2 className="h-4 w-4" />
                Every row passed validation and is ready to import.
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
