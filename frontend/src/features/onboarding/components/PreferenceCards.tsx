interface PreferenceCardsProps {
  value: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  onChange: (value: 'visual' | 'auditory' | 'kinesthetic' | 'mixed') => void;
}

const STYLES = [
  { value: 'visual' as const, title: 'Visual', hint: 'Diagramas, colores y mapas' },
  { value: 'auditory' as const, title: 'Auditivo', hint: 'Explicaciones y audio' },
  { value: 'kinesthetic' as const, title: 'Kinestésico', hint: 'Práctica y movimiento' },
  { value: 'mixed' as const, title: 'Mixto', hint: 'Un poco de todo' },
];

export function PreferenceCards({ value, onChange }: PreferenceCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {STYLES.map((style) => {
        const selected = style.value === value;
        return (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              selected
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:border-indigo-300'
            }`}
          >
            <p className="font-semibold text-slate-900">{style.title}</p>
            <p className="mt-1 text-sm text-slate-500">{style.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
