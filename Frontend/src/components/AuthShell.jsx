import { Building2, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ui';

const highlights = [
  'Role-based workspaces for admins, HR and employees',
  'Attendance, leave and payroll in one connected flow',
  'AI-assisted people insights when you need them'
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-600/10" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-600/10" />
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle className="bg-white/70 shadow-sm backdrop-blur dark:bg-slate-900/70" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-10 lg:py-12">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">HCM Lite</p>
                <p className="text-xs font-medium text-muted">Human Capital Management</p>
              </div>
            </div>

            <h2 className="mt-10 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white xl:text-5xl">
              A calmer way to run
              <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                your people operations.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted">
              One polished workspace for attendance, leave, payroll and employee records — built for teams that want clarity, not clutter.
            </p>

            <div className="mt-9 space-y-3.5">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Role-aware by design</p>
                <p className="mt-1 text-xs leading-5 text-muted">Every person sees exactly what they need.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Insight, not noise</p>
                <p className="mt-1 text-xs leading-5 text-muted">AI summaries turn KPIs into next steps.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">HCM Lite</p>
              <p className="text-[11px] font-medium text-muted">Human Capital Management</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-sm leading-6 text-muted">{subtitle}</p> : null}
            </div>
            {children}
          </div>

          {footer ? <div className="mt-5 text-center text-xs text-subtle">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
