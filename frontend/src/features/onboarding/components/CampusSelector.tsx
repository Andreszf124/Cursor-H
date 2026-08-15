export type CampusProvider = 'ucr' | 'teams' | 'moodle' | 'manual';

interface CampusSelectorProps {
  selected: CampusProvider | null;
  onSelect: (provider: CampusProvider) => void;
}

const CARDS: Array<{
  provider: CampusProvider;
  title: string;
  description: string;
  recommended?: boolean;
  disabled?: boolean;
}> = [
  {
    provider: 'ucr',
    title: 'Campus Virtual UCR',
    description: 'Abrimos una pestaña: tú inicias sesión ahí. Luego escaneamos tus cursos.',
    recommended: true,
  },
  {
    provider: 'teams',
    title: 'Microsoft Teams',
    description: 'Conecta con OAuth. No pedimos tu contraseña.',
  },
  {
    provider: 'moodle',
    title: 'Moodle',
    description: 'Misma idea: pestaña del campus, tú entras, nosotros escaneamos.',
  },
  {
    provider: 'manual',
    title: 'Configuración manual',
    description: 'Prefiero agregar cursos después.',
  },
];

export function CampusSelector({ selected, onSelect }: CampusSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CARDS.map((card) => {
        const active = selected === card.provider;
        return (
          <button
            key={card.provider}
            type="button"
            disabled={card.disabled}
            title={card.disabled ? 'No disponible en este prototipo' : card.description}
            onClick={() => onSelect(card.provider)}
            className={`rounded-2xl border px-4 py-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{card.title}</p>
              {card.recommended && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                  Recomendado
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">{card.description}</p>
          </button>
        );
      })}
    </div>
  );
}
