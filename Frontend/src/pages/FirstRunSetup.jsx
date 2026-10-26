import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Mail,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/AuthShell';
import { Button, Input } from '../components/ui';

const steps = [
  { id: 1, title: 'Company', icon: Building2 },
  { id: 2, title: 'Admin account', icon: UserRound },
  { id: 3, title: 'Confirm', icon: CheckCircle2 }
];

export default function FirstRunSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    adminEmail: '',
    adminPassword: '',
    firstName: '',
    lastName: ''
  });
  const { setup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/auth/check-setup')
      .then((res) => {
        if (!res.data.needsSetup) navigate('/login');
      })
      .catch(() => {});
  }, [navigate]);

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (step === 1) {
      if (!formData.companyName.trim()) {
        toast.error('Enter your company name to continue');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.adminEmail.trim() || !formData.adminPassword) {
        toast.error('Email and password are required');
        return;
      }
      if (formData.adminPassword.length < 8) {
        toast.error('Use at least 8 characters for your password');
        return;
      }
      setStep(3);
      return;
    }

    setLoading(true);
    try {
      await setup(formData);
      toast.success('Setup completed successfully');
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Set up your workspace"
      subtitle="A few details and you'll be ready to run your first HR cycle."
      footer="Powered by HCM Lite"
    >
      <div className="mb-7 flex items-center">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const complete = step > item.id;
          const active = step === item.id;

          return (
            <div key={item.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={
                    active || complete
                      ? 'grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                  }
                >
                  {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span
                  className={
                    active
                      ? 'text-[10px] font-semibold text-indigo-600 dark:text-indigo-400'
                      : 'text-[10px] font-medium text-subtle'
                  }
                >
                  {item.title}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div className="mx-2 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: complete ? '100%' : '0%' }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Company details</h2>
              <p className="mt-1 text-xs text-muted">This name appears across your workspace and payslips.</p>
            </div>
            <Input
              label="Company name"
              name="companyName"
              placeholder="e.g. Northstar Technologies"
              value={formData.companyName}
              onChange={updateField('companyName')}
              required
              autoFocus
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Administrator account</h2>
              <p className="mt-1 text-xs text-muted">You'll use this account to configure the workspace.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="First name"
                name="firstName"
                placeholder="Ayesha"
                value={formData.firstName}
                onChange={updateField('firstName')}
                autoFocus
              />
              <Input
                label="Last name"
                name="lastName"
                placeholder="Khan"
                value={formData.lastName}
                onChange={updateField('lastName')}
              />
            </div>
            <Input
              label="Email address"
              name="adminEmail"
              type="email"
              placeholder="admin@company.com"
              value={formData.adminEmail}
              onChange={updateField('adminEmail')}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              name="adminPassword"
              type="password"
              placeholder="At least 8 characters"
              value={formData.adminPassword}
              onChange={updateField('adminPassword')}
              hint="Use a strong password you don't use elsewhere."
              required
              minLength={8}
              autoComplete="new-password"
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review and confirm</h2>
              <p className="mt-1 text-xs text-muted">Everything look right? You can go back to make changes.</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-3.5 w-3.5" />
                Company
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {formData.companyName || '-'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">
                <UserRound className="h-3.5 w-3.5" />
                Administrator
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {formData.firstName || formData.lastName
                  ? `${formData.firstName} ${formData.lastName}`.trim()
                  : 'Administrator'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Mail className="h-3.5 w-3.5" />
                {formData.adminEmail || '-'}
              </p>
            </div>
          </>
        ) : null}

        <div className="flex gap-2 pt-2">
          {step > 1 ? (
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            loading={loading}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
          >
            {step === 3 ? 'Complete setup' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
