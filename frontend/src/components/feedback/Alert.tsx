import type { ReactNode } from 'react';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
}

const VARIANT_CLASSES: Record<AlertProps['variant'], string> = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function Alert({ variant, children }: AlertProps) {
  return (
    <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}>
      {children}
    </div>
  );
}
