import { sanitizeInput } from '../sanitize';

describe('sanitizeInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('removes control characters', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld');
  });

  it('preserves newlines and tabs', () => {
    expect(sanitizeInput('hello\nworld')).toBe('hello\nworld');
  });

  it('enforces max length', () => {
    const longString = 'a'.repeat(1000);
    expect(sanitizeInput(longString).length).toBe(500);
  });

  it('uses custom max length', () => {
    const longString = 'a'.repeat(100);
    expect(sanitizeInput(longString, 50).length).toBe(50);
  });
});
