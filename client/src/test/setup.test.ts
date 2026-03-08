import { describe, it, expect } from 'vitest';

describe('Test setup', () => {
  it('vitest runs with jsdom', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('localStorage mock works', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
  });
});
