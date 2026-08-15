/**
 * Errores de aplicación con status HTTP y código estable.
 * Regla (SECURITY.md §10): mensajes genéricos al cliente, detalle en logs.
 * Regla (SECURITY.md R1): recurso ajeno responde 404, nunca 403,
 * para evitar enumeración de IDs.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Solicitud inválida') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Solo para permisos de rol (admin). El acceso a un recurso ajeno del mismo
 * tipo sigue respondiendo 404 vía NotFoundError (SECURITY.md R1).
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Permisos insuficientes') {
    super(message, 403, 'FORBIDDEN');
  }
}
