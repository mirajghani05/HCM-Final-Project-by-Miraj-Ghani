import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/AuthShell';
import { Button, Field } from '../components/ui';
import API from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/auth/check-setup')
      .then((res) => {
        setNeedsSetup(!!res.data?.needsSetup);
      })
      .catch(() => {
        setNeedsSetup(false);
      });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      toast.success('Welcome back, ' + (data.user.firstName || 'there'));
      if (data.user.mustChangePassword) {
        navigate('/change-password');
      } else if (data.user.role === 'admin') {
        navigate('/admin');
      } else if (data.user.role === 'hr') {
        navigate('/hr');
      } else {
        navigate('/employee');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace to pick up where you left off."
      footer="© 2026 HCM Lite • Need access? Contact your administrator."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email address" htmlFor="email" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="email" type="email" autoComplete="email" placeholder="you@company.com" className="field pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
          </div>
        </Field>

        <Field label="Password" htmlFor="password" required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="field pl-10 pr-11" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" loading={loading} disabled={!email.trim() || !password} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500">
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {needsSetup ? (
        <div className="mt-4 text-center text-sm">
          <a href="/setup" id="create-company-link" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Create your company account</a>
        </div>
      ) : (
        <div className="mt-4 text-center text-xs text-subtle">Accounts are created by your administrator.</div>
      )}

      <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-subtle">
        <ShieldCheck className="h-3.5 w-3.5" />
        Protected by secure, role-based access
      </div>
    </AuthShell>
  );
}
