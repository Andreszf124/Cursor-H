import { useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { careerService, type Institution } from '../../career/services/careerService';
import { SUGGESTED_UNIVERSITIES } from '../lib/suggestedUniversities';

const DEGREE_LEVELS = [
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'diplomado', label: 'Diplomado' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'maestria', label: 'Maestría' },
  { value: 'doctorado', label: 'Doctorado' },
  { value: 'otro', label: 'Otro' },
];

interface UniversityStepProps {
  search: string;
  onSearchChange: (value: string) => void;
  selected: Institution | null;
  onSelect: (institution: Institution | null) => void;
  careerName: string;
  onCareerNameChange: (value: string) => void;
  degreeLevel: string;
  onDegreeLevelChange: (value: string) => void;
  periodLabel: string;
  busy: boolean;
  onSubmit: () => void;
}

export function UniversityStep({
  search,
  onSearchChange,
  selected,
  onSelect,
  careerName,
  onCareerNameChange,
  degreeLevel,
  onDegreeLevelChange,
  periodLabel,
  busy,
  onSubmit,
}: UniversityStepProps) {
  const deferredSearch = useDeferredValue(search.trim());
  const institutionsQuery = useQuery({
    queryKey: ['institutions', deferredSearch],
    queryFn: () => careerService.listInstitutions(deferredSearch || undefined),
  });

  const catalog = institutionsQuery.data?.institutions ?? [];
  const showCatalog = !selected && catalog.length > 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tu universidad</h1>
        <p className="mt-2 text-sm text-slate-600">
          Elige o escribe dónde estudias y tu carrera. Después registras las materias de este
          semestre.
        </p>
      </header>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Universidades frecuentes</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_UNIVERSITIES.map((name) => {
            const active = selected?.name === name || search === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onSelect(null);
                  onSearchChange(name);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? 'border-teal-700 bg-teal-50 font-medium text-teal-900'
                    : 'border-stone-300 bg-white text-slate-700 hover:border-teal-600'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
          <p className="text-sm font-medium text-teal-950">{selected.name}</p>
          <button
            type="button"
            className="text-sm text-teal-800 underline-offset-2 hover:underline"
            onClick={() => onSelect(null)}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div>
          <Input
            id="institution-search"
            label="Universidad"
            placeholder="Busca o escribe el nombre completo"
            autoComplete="organization"
            value={search}
            onChange={(event) => {
              onSelect(null);
              onSearchChange(event.target.value);
            }}
          />
          {institutionsQuery.isLoading ? (
            <p className="mt-2 text-sm text-slate-500">Buscando universidades…</p>
          ) : null}
          {showCatalog ? (
            <ul className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-stone-200 bg-white">
              {catalog.map((institution) => (
                <li key={institution.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-stone-50"
                    onClick={() => {
                      onSelect(institution);
                      onSearchChange(institution.name);
                    }}
                  >
                    {institution.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {search.trim().length >= 2 && !selected ? (
            <p className="mt-2 text-xs text-slate-500">
              Si no aparece, la registramos con el nombre que escribiste.
            </p>
          ) : null}
        </div>
      )}

      <Input
        id="career-name"
        label="Carrera"
        placeholder="Ej. Ingeniería en Computación"
        value={careerName}
        onChange={(event) => onCareerNameChange(event.target.value)}
      />

      <div>
        <label htmlFor="degree-level" className="block text-sm font-medium text-slate-700">
          Nivel
        </label>
        <select
          id="degree-level"
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          value={degreeLevel}
          onChange={(event) => onDegreeLevelChange(event.target.value)}
        >
          {DEGREE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">Semestre actual: {periodLabel}</p>

      <Button type="submit" loading={busy} className="w-full">
        Continuar a cursos
      </Button>
    </form>
  );
}
