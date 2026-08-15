import { useState } from 'react';
import { Button } from '../../../components/ui/Button';

interface PDFProgramUploadProps {
  disabled?: boolean;
  uploading?: boolean;
  onSelect: (file: File) => void;
}

export function PDFProgramUpload({ disabled, uploading, onSelect }: PDFProgramUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const takeFile = (file: File | undefined): void => {
    if (!file) return;
    if (file.type !== 'application/pdf') return;
    setFileName(file.name);
    onSelect(file);
  };

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
        dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        takeFile(event.dataTransfer.files[0]);
      }}
    >
      <h3 className="text-lg font-semibold text-slate-900">Arrastra el programa de tu curso</h3>
      <p className="mt-2 text-sm text-slate-500">
        La IA extraerá materias, créditos y prerrequisitos. PDF · máximo 10MB.
      </p>
      {fileName && <p className="mt-3 text-sm font-medium text-indigo-700">{fileName}</p>}
      <label className="mt-4 inline-block">
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          aria-label="Seleccionar PDF del programa"
          disabled={disabled || uploading}
          onChange={(event) => takeFile(event.target.files?.[0])}
        />
        <Button
          variant="secondary"
          loading={uploading}
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            event.currentTarget.parentElement?.querySelector('input')?.click();
          }}
        >
          Seleccionar archivo
        </Button>
      </label>
    </div>
  );
}
