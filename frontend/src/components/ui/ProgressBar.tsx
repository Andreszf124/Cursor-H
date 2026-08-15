interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-700">{label}</span>
          <span className="tabular-nums text-slate-500">{Math.round(clamped)}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
