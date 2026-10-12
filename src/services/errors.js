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

module.exports = { AppError, ValidationError, NotFoundError, ConflictError, ForbiddenError };
