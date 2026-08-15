import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { SidebarPomodoro } from '../../features/pomodoro/components/SidebarPomodoro';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  end?: boolean;
  icon: 'home' | 'courses' | 'calendar' | 'progress' | 'tutor' | 'profile' | 'practice';
}

const DESKTOP_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', shortLabel: 'Inicio', end: true, icon: 'home' },
  { to: '/courses', label: 'Mis cursos', shortLabel: 'Cursos', icon: 'courses' },
  { to: '/practice', label: 'Práctica', shortLabel: 'Práctica', icon: 'practice' },
  { to: '/schedule', label: 'Calendario', shortLabel: 'Calendario', icon: 'calendar' },
  { to: '/progress', label: 'Progreso', shortLabel: 'Progreso', icon: 'progress' },
  { to: '/tutor', label: 'Tutor IA', shortLabel: 'Tutor', icon: 'tutor' },
];

const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Inicio', shortLabel: 'Inicio', end: true, icon: 'home' },
  { to: '/courses', label: 'Mis cursos', shortLabel: 'Cursos', icon: 'courses' },
  { to: '/practice', label: 'Práctica', shortLabel: 'Práctica', icon: 'practice' },
  { to: '/tutor', label: 'Tutor IA', shortLabel: 'Tutor', icon: 'tutor' },
  { to: '/progress', label: 'Progreso', shortLabel: 'Progreso', icon: 'progress' },
];

const PROFILE_NAV: NavItem = {
  to: '/profile',
  label: 'Perfil',
  shortLabel: 'Perfil',
  icon: 'profile',
};

function navClass(active: boolean): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
    active ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;
}

function NavIcon({ name }: { name: NavItem['icon'] }) {
  const common = 'h-5 w-5 shrink-0';
  switch (name) {
    case 'home':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case 'courses':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case 'progress':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15l4-5 3 3 5-7" />
        </svg>
      );
    case 'practice':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M8 4h8l4 4v12H8z" />
          <path d="M12 4v4h4M10 13h6M10 17h4" />
        </svg>
      );
    case 'tutor':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 6h14v9H8l-3 3V6Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19c1.4-3 4-4.5 7-4.5S17.6 16 19 19" />
        </svg>
      );
  }
}

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout.mutateAsync();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link to="/" className="border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
          Academic Ya!
        </Link>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Principal">
          {DESKTOP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) => navClass(isActive)}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-3 py-3">
          <SidebarPomodoro idPrefix="pomodoro-desktop" />
        </div>
        <div className="border-t border-slate-100 px-3 py-3">
          <NavLink to={PROFILE_NAV.to} className={({ isActive }) => navClass(isActive)}>
            <NavIcon name="profile" />
            {PROFILE_NAV.label}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <Link to="/" className="text-base font-semibold text-slate-900 lg:hidden">
            Academic Ya!
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {user && <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>}
            <Button variant="secondary" loading={logout.isPending} onClick={() => void handleLogout()}>
              Cerrar sesión
            </Button>
          </div>
        </header>
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <SidebarPomodoro compact idPrefix="pomodoro-mobile" />
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden"
        aria-label="Principal"
      >
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] ${
                    isActive ? 'font-medium text-indigo-700' : 'text-slate-500'
                  }`
                }
              >
                <NavIcon name={item.icon} />
                {item.shortLabel}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
