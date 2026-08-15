import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authService } from '../../auth/services/authService';
import { useAuthStore } from '../../../stores/authStore';

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const clear = useAuthStore((state) => state.clear);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');

  const deleteAccount = useMutation({
    mutationFn: authService.deleteAccount,
    onSuccess: () => {
      clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-red-700">Eliminar cuenta</h2>
      <p className="mt-1 text-sm text-slate-600">
        Esta acción es permanente: se eliminan tu perfil, preferencias y archivos. No se puede
        deshacer.
      </p>

      {!confirming ? (
        <Button variant="danger" className="mt-4" onClick={() => setConfirming(true)}>
          Quiero eliminar mi cuenta
        </Button>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            deleteAccount.mutate(password);
          }}
        >
          {deleteAccount.error && <Alert variant="error">{deleteAccount.error.message}</Alert>}

          <Input
            id="delete-password"
            type="password"
            label="Confirma tu contraseña para eliminar la cuenta"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={deleteAccount.isPending}
              disabled={password.length === 0}
            >
              Eliminar definitivamente
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
