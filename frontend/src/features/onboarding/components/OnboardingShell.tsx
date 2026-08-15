import type { ReactNode } from 'react';

export interface OnboardingStepMeta {
  id: string;
  label: string;
}

interface OnboardingShellProps {
  steps: OnboardingStepMeta[];
  current: number;
  children: ReactNode;
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingShell({ steps, current, children }: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm font-semibold text-slate-900">Academic Ya!</p>
          <p className="text-sm text-slate-500">
            Paso {current + 1} de {steps.length}
          </p>
        </div>
        <ol
          className={`mx-auto grid max-w-3xl gap-2 px-4 pb-4 sm:px-6 ${
            steps.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {steps.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={step.id}>
                <div
                  className={`h-1.5 rounded-full ${
                    done || active ? 'bg-teal-700' : 'bg-stone-200'
                  }`}
                />
                <p
                  className={`mt-2 flex items-center gap-1.5 text-xs ${
                    active ? 'font-semibold text-slate-900' : done ? 'text-teal-800' : 'text-slate-400'
                  }`}
                >
                  {done ? (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-white">
                      <CheckIcon />
                    </span>
                  ) : (
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        active ? 'bg-teal-700 text-white' : 'bg-stone-200 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
