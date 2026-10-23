// Errores de negocio. La capa de lógica los lanza y la capa API los traduce a códigos HTTP.

class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 'UNAUTHENTICATED');
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 'CONFLICT');
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 'FORBIDDEN');
  }
}

/** La cuenta existe pero aún no ha confirmado su correo: no puede iniciar sesión (es un 403 más concreto). */
class AccountPendingError extends ForbiddenError {
  constructor(message) {
    super(message);
    this.code = 'ACCOUNT_PENDING';
  }
}

/** Un servicio externo (por ejemplo, el de correo) no responde. */
class ServiceUnavailableError extends AppError {
  constructor(message) {
    super(message, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  ServiceUnavailableError,
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  AccountPendingError,
};
