import type { ReactNode } from 'react';

export interface WizardStepMeta {
  id: string;
  label: string;
}

interface WizardLayoutProps {
  title: string;
  steps: WizardStepMeta[];
  current: number;
  tip: string;
  children: ReactNode;
}

export function WizardLayout({ title, steps, current, tip, children }: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-6 py-8 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-indigo-600">Academic Copilot</p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900">{title}</h1>
          <ol className="mt-8 space-y-3">
            {steps.map((step, index) => {
              const active = index === current;
              const done = index < current;
              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-3 text-sm ${
                    active ? 'font-semibold text-indigo-700' : done ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  {step.label}
                </li>
              );
            })}
          </ol>
          <div className="mt-10 hidden rounded-xl bg-slate-50 p-4 text-sm text-slate-600 lg:block">
            <p className="font-medium text-slate-800">Consejo</p>
            <p className="mt-1">{tip}</p>
            <p className="mt-3 text-xs text-slate-400">Enter avanza · Escape vuelve</p>
          </div>
        </aside>
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
