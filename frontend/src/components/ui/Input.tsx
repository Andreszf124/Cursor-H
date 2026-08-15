import type { ComponentPropsWithRef } from 'react';

interface InputProps extends ComponentPropsWithRef<'input'> {
  label: string;
  error?: string;
  hint?: string;
  inputSize?: 'md' | 'lg';
}

export function Input({
  label,
  error,
  hint,
  inputSize = 'md',
  id,
  className,
  ...props
}: InputProps) {
  const sizeClasses = inputSize === 'lg' ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm';

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={`mt-1 block w-full rounded-lg border text-slate-900 shadow-sm outline-none transition focus:ring-2 ${sizeClasses} ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
        }`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
