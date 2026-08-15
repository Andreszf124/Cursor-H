interface MissingPublicEnvScreenProps {
  missingKeys: string[];
}

export function MissingPublicEnvScreen({ missingKeys }: MissingPublicEnvScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Academic Ya! no está configurado</h1>
        <p className="mt-3 text-sm text-slate-600">
          El frontend se construyó sin las variables públicas de Vite. En Vercel van en Settings,
          Environment Variables, Production, y hay que volver a desplegar para que queden en el
          bundle.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-800">
          {missingKeys.map((key) => (
            <li key={key}>
              <code>{key}</code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          <code>VITE_API_URL</code> debe ser la URL pública del backend Fastify, no este dominio de
          Vercel.
        </p>
      </section>
    </main>
  );
}
