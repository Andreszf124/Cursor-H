import { env } from '../../app/config/env';
import { useAuthStore } from '../../stores/authStore';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  /** Headers extra (p. ej. recovery token en reset-password) — pisan los por defecto */
  headers?: Record<string, string>;
}

/**
 * Cliente HTTP del frontend: agrega Authorization desde el store en memoria
 * y ante 401 limpia la sesión (el usuario debe volver a autenticarse).
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = useAuthStore.getState().session?.access_token;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  Object.assign(headers, options.headers);

  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (response.status === 401) {
    useAuthStore.getState().clear();
  }

  if (!response.ok) {
    let message = 'Ocurrió un error inesperado';
    let code: string | undefined;
    try {
      const data = (await response.json()) as { error?: { message?: string; code?: string } };
      message = data.error?.message ?? message;
      code = data.error?.code;
    } catch {
      // respuesta sin JSON: se usa el mensaje genérico
    }
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
