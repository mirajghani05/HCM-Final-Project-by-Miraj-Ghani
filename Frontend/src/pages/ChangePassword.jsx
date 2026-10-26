import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AuthShell from '../components/AuthShell';
import { Button, Input } from '../components/ui';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const checks = [
    { label: '8+ characters', valid: formData.newPassword.length >= 8 },
    { label: 'Upper & lowercase', valid: /[a-z]/.test(formData.newPassword) && /[A-Z]/.test(formData.newPassword) },
    { label: 'A number', valid: /\d/.test(formData.newPassword) }
  ];

  const passwordChecksValid = checks.every((check) => check.valid);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!passwordChecksValid) {
      toast.error('Use at least 8 characters, including uppercase, lowercase, and a number');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });
      updateUser({ mustChangePassword: false });
      toast.success('Password changed successfully');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'hr') navigate('/hr');
      else navigate('/employee');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={user?.mustChangePassword ? 'Create a new password' : 'Change your password'}
      subtitle={
        user?.mustChangePassword
          ? 'Your account is using a temporary password. Set a new one to continue.'
          : 'Choose a strong, unique password to keep your account secure.'
      }
      footer="You'll stay signed in after updating your password."
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <p className="text-xs leading-5 text-indigo-900/70 dark:text-indigo-200/70">
          Passwords are hashed before storage. Nobody on your team can see your new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!user?.mustChangePassword ? (
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            placeholder="Enter your current password"
            value={formData.currentPassword}
            onChange={updateField('currentPassword')}
            autoComplete="current-password"
            required
            autoFocus
          />
        ) : null}

        <Input
          label="New password"
          name="newPassword"
          type="password"
          placeholder="At least 8 characters"
          value={formData.newPassword}
          onChange={updateField('newPassword')}
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus={user?.mustChangePassword}
        />

        <div className="grid gap-1.5 sm:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className={
                check.valid
                  ? 'flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }
            >
              <Check className={check.valid ? 'h-3 w-3' : 'h-3 w-3 opacity-40'} />
              {check.label}
            </div>
          ))}
        </div>

        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your new password"
          value={formData.confirmPassword}
          onChange={updateField('confirmPassword')}
          autoComplete="new-password"
          required
          error={
            formData.confirmPassword && formData.newPassword !== formData.confirmPassword
              ? 'Passwords do not match'
              : undefined
          }
        />

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={formData.newPassword !== formData.confirmPassword || !passwordChecksValid}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          Update password
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}
