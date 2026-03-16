// app/utils/errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isAuthError: boolean = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Extracts a user-friendly error message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
