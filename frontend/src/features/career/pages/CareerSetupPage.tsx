import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { careerService, type Institution } from '../services/careerService';

const DEGREE_LEVELS = [
  { value: 'tecnico', label: 'Técnico' },
  { value: 'diplomado', label: 'Diplomado' },
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'maestria', label: 'Maestría' },
  { value: 'doctorado', label: 'Doctorado' },
  { value: 'otro', label: 'Otro' },
] as const;

export function CareerSetupPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [customName, setCustomName] = useState('');
  const [careerName, setCareerName] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('licenciatura');
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const institutionsQuery = useQuery({
    queryKey: ['institutions', search],
    queryFn: () => careerService.listInstitutions(search || undefined),
  });

  const createInstitution = useMutation({
    mutationFn: careerService.createInstitution,
    onSuccess: (institution) => {
      setSelectedInstitution(institution);
      void queryClient.invalidateQueries({ queryKey: ['institutions'] });
      setStep(2);
    },
    onError: (err: Error) => setError(err.message),
  });

  const setupCareer = useMutation({
    mutationFn: careerService.setupCareer,
    onSuccess: () => setStep(3),
    onError: (err: Error) => setError(err.message),
  });

  const createPeriod = useMutation({
    mutationFn: careerService.createPeriod,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['career'] });
      setError(null);
      setStep(4);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Configurar carrera</h1>
      <p className="text-sm text-slate-600">Paso {Math.min(step, 3)} de 3</p>
      {error && <Alert variant="error">{error}</Alert>}

      {step === 1 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Institución</h2>
          <Input
            id="search-institution"
            label="Buscar institución"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
            {(institutionsQuery.data?.institutions ?? []).map((institution) => (
              <li key={institution.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    setSelectedInstitution(institution);
                    setStep(2);
                  }}
                >
                  {institution.name}
                  {institution.is_verified ? ' · verificada' : ''}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 pt-4">
            <Input
              id="custom-institution"
              label="O registrar institución personalizada"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <Button
              className="mt-3"
              loading={createInstitution.isPending}
              disabled={customName.trim().length < 2}
              onClick={() => createInstitution.mutate({ name: customName.trim(), country: 'CR' })}
            >
              Crear institución
            </Button>
          </div>
        </section>
      )}

      {step === 2 && selectedInstitution && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Carrera</h2>
          <p className="text-sm text-slate-600">Institución: {selectedInstitution.name}</p>
          <Input
            id="career-name"
            label="Nombre de la carrera"
            value={careerName}
            onChange={(e) => setCareerName(e.target.value)}
          />
          <div>
            <label htmlFor="degree-level" className="block text-sm font-medium text-slate-700">
              Nivel académico
            </label>
            <select
              id="degree-level"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={degreeLevel}
              onChange={(e) => setDegreeLevel(e.target.value)}
            >
              {DEGREE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              loading={setupCareer.isPending}
              disabled={careerName.trim().length < 2}
              onClick={() =>
                setupCareer.mutate({
                  institution_id: selectedInstitution.id,
                  career_name: careerName.trim(),
                  degree_level: degreeLevel,
                })
              }
            >
              Continuar
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Período académico</h2>
          <Input
            id="period-name"
            label="Nombre del período"
            placeholder="2026-I"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
          />
          <Input
            id="start-date"
            type="date"
            label="Fecha inicio"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            id="end-date"
            type="date"
            label="Fecha fin"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button
            loading={createPeriod.isPending}
            disabled={!periodName || !startDate || !endDate}
            onClick={() =>
              createPeriod.mutate({
                name: periodName,
                start_date: startDate,
                end_date: endDate,
                activate: true,
              })
            }
          >
            Guardar y activar período
          </Button>
        </section>
      )}

      {step === 4 && (
        <Alert variant="success">
          Carrera y período configurados. Puedes importar el plan de estudios o registrar cursos.
        </Alert>
      )}
    </div>
  );
}
