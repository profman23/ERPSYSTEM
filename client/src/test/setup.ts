import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

// MSW server lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Mock import.meta.env — MUST be before api module loads
vi.stubEnv('VITE_API_URL', 'http://localhost:5500');

// Suppress console noise in tests
const originalError = console.error;
const originalLog = console.log;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('React Query') || msg.includes('API Error') || msg.includes('API Base URL')) return;
  originalError.call(console, ...args);
};
console.log = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('API Base URL')) return;
  originalLog.call(console, ...args);
};
