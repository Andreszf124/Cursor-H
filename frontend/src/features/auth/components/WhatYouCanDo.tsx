import { PRODUCT_CAPABILITIES } from '../lib/capabilities';
import { CapabilityIcon } from './CapabilityIcon';

export function WhatYouCanDo() {
  return (
    <section aria-labelledby="what-you-can-do-heading">
      <p className="text-sm font-semibold text-indigo-700">Academic Ya!</p>
      <h1 id="what-you-can-do-heading" className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        Qué puedes hacer
      </h1>
      <p className="mt-3 max-w-xl text-base text-slate-600">
        Academic Ya! te ayuda a estudiar en la universidad. Parte de tus clases reales: no pide la
        clave del campus y no inventa lo que no puede evidenciar.
      </p>
      <ul className="mt-8 space-y-5">
        {PRODUCT_CAPABILITIES.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700">
              <CapabilityIcon name={item.icon} />
            </span>
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
