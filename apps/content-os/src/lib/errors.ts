/**
 * @crumb
 * id: error-hierarchy
 * AREA: ERR
 * why: Define domain error types with HTTP status codes—enable consistent error handling and API response contracts
 * in: message (string), code (string), statusCode (number, default 500)
 * out: 5 Error subclasses: ContentOSError, NotFoundError, ValidationError, ProcessingError, DistributionError
 * err: Errors self-declared; no validation of code or statusCode values
 * hazard: statusCode assigned at construction but no validation—callers could instantiate ProcessingError with statusCode 200, breaking HTTP contract
 * hazard: DistributionError accepts optional platform field but no validation—missing platform field leaves distribution failures undiagnosable
 * edge: THROWN_BY all service layers (decomposition, asset-generator, distribution, media, queue)
 * edge: CAUGHT_BY API handlers (not shown) for HTTP status code mapping
 * edge: LOGGED_BY publishing log (distribution.service.ts uses errorMessage field on DistributionJob)
 * prompt: Test HTTP status code correctness per error type; verify DistributionError platform field population; test error message serialization in JSON responses; validate code field uniqueness
 */

export class ContentOSError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ContentOSError';
  }
}

export class NotFoundError extends ContentOSError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends ContentOSError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ProcessingError extends ContentOSError {
  constructor(message: string) {
    super(message, 'PROCESSING_ERROR', 500);
  }
}

export class DistributionError extends ContentOSError {
  constructor(message: string, public platform?: string) {
    super(message, 'DISTRIBUTION_ERROR', 502);
  }
}

export class ForbiddenError extends ContentOSError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
  }
}
