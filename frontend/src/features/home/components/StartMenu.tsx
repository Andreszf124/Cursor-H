import { Link } from 'react-router-dom';
import { START_MENU } from '../lib/startMenu';

export function StartMenu() {
  return (
    <nav aria-label="Menú de inicio" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Qué quieres hacer</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {START_MENU.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center justify-between gap-3 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <span>
                <span className="block font-medium text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{item.hint}</span>
              </span>
              <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 3.5 11 8l-5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
