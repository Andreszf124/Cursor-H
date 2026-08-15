import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../../components/feedback/Alert';
import { Button } from '../../../components/ui/Button';
import { profileService } from '../services/profileService';
import { validateAvatarFile } from '../schemas/profileSchema';

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
}

export function AvatarUpload({ avatarUrl, fullName }: AvatarUploadProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const invalidateProfile = () => void queryClient.invalidateQueries({ queryKey: ['profile'] });

  const upload = useMutation({
    mutationFn: profileService.uploadAvatar,
    onSuccess: invalidateProfile,
  });

  const remove = useMutation({
    mutationFn: profileService.deleteAvatar,
    onSuccess: () => {
      setPreview(null);
      invalidateProfile();
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAvatarFile(file);
    setClientError(validationError);
    if (validationError) return;

    setPreview(URL.createObjectURL(file));
    upload.mutate(file);
  };

  const displayedImage = preview ?? avatarUrl;
  const initial = (fullName ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Foto de perfil</h2>
      <p className="mt-1 text-sm text-slate-600">JPEG o PNG, máximo 2MB.</p>

      <div className="mt-4 flex items-center gap-4">
        {displayedImage ? (
          <img
            src={displayedImage}
            alt="Avatar"
            className="h-20 w-20 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
            {initial}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Seleccionar imagen de avatar"
          />
          <Button
            variant="secondary"
            loading={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            Subir imagen
          </Button>
          {(displayedImage || avatarUrl) && (
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {clientError && <Alert variant="error">{clientError}</Alert>}
        {upload.error && <Alert variant="error">{upload.error.message}</Alert>}
        {remove.error && <Alert variant="error">{remove.error.message}</Alert>}
      </div>
    </section>
  );
}
