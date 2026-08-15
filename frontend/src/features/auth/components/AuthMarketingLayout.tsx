import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { WhatYouCanDo } from './WhatYouCanDo';

interface AuthMarketingLayoutProps {
  children: ReactNode;
}

export function AuthMarketingLayout({ children }: AuthMarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm font-semibold text-slate-900">Academic Ya!</p>
          <Link to="/register" className="text-sm font-medium text-indigo-700 hover:underline">
            Crear cuenta
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-start lg:gap-16 lg:py-16">
        <WhatYouCanDo />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      </div>
    </div>
  );
}
