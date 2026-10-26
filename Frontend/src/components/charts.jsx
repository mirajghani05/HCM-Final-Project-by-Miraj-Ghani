export const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

export function ChartTooltip({ active, payload, label, valueFormatter = (value) => value }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      {label ? <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p> : null}
      {payload.map((entry) => (
        <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill || '#6366f1' }}
          />
          <span className="text-muted">{entry.name}</span>
          <span className="ml-auto font-semibold text-slate-900 dark:text-white">
            {valueFormatter(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export const axisTick = { fill: '#94a3b8', fontSize: 11 };
