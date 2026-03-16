import { ApiError, NetworkError, getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  it('extracts message from ApiError', () => {
    const error = new ApiError('Not found', 404);
    expect(getErrorMessage(error)).toBe('Not found');
  });

  it('extracts message from NetworkError', () => {
    const error = new NetworkError();
    expect(getErrorMessage(error)).toContain('Network');
  });

  it('extracts message from generic Error', () => {
    const error = new Error('Something broke');
    expect(getErrorMessage(error)).toBe('Something broke');
  });

  it('handles unknown error types', () => {
    expect(getErrorMessage('string error')).toBe('An unexpected error occurred');
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });
});

describe('ApiError', () => {
  it('has correct properties', () => {
    const error = new ApiError('Unauthorized', 401, true);
    expect(error.statusCode).toBe(401);
    expect(error.isAuthError).toBe(true);
    expect(error.name).toBe('ApiError');
  });
});
