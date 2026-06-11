export class SourceProviderError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'SourceProviderError';
    this.code = code;
    this.cause = cause;
  }
}

export const PROVIDER_ERROR = {
  AUTH: 'auth-failed',
  NOT_FOUND: 'source-not-found',
  INVALID_REF: 'invalid-ref',
  MISSING_TOOL: 'missing-tool',
  UNSUPPORTED_ARCHIVE: 'unsupported-archive',
  UNSUPPORTED_SOURCE: 'unsupported-source'
};
