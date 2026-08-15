import type { ProductCapability } from '../lib/capabilities';

const ICON_CLASS = 'h-5 w-5 shrink-0';

export function CapabilityIcon({ name }: { name: ProductCapability['icon'] }) {
  switch (name) {
    case 'courses':
      return (
        <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case 'checkin':
      return (
        <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 12.5 9.5 17 19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'practice':
      return (
        <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M8 4h8l4 4v12H8z" />
          <path d="M12 4v4h4M10 13h6M10 17h4" />
        </svg>
      );
    case 'tutor':
      return (
        <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 6h14v9H8l-3 3V6Z" />
        </svg>
      );
    case 'progress':
      return (
        <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15l4-5 3 3 5-7" />
        </svg>
      );
  }
}
