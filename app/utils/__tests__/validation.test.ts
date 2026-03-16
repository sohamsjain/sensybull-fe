import { isValidEmail, validatePassword } from '../validation';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('rejects short passwords', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('6 characters');
  });

  it('accepts valid passwords', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });
});
