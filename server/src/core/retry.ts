/**
 * Retry Utility with Exponential Backoff + Jitter
 *
 * Wraps async operations to automatically retry on transient failures.
 * Designed for Neon serverless PostgreSQL cold starts and network blips.
 *
 * Usage:
 *   const result = await withRetry(() => db.query(...), { maxRetries: 3 });
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 50) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 2000) */
  maxDelay?: number;
  /** Jitter factor 0-1 (default: 0.1) */
  jitter?: number;
  /** Custom function to decide if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Label for logging */
  label?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 50,
  maxDelay: 2000,
  jitter: 0.1,
  isRetryable: defaultIsRetryable,
  label: 'operation',
};

/**
 * Default retry policy: retry on transient/connection errors, not on client errors
 */
function defaultIsRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const msg = error.message.toLowerCase();

  // Connection/network errors (retryable)
  if (msg.includes('econnrefused')) return true;
  if (msg.includes('econnreset')) return true;
  if (msg.includes('etimedout')) return true;
  if (msg.includes('epipe')) return true;
  if (msg.includes('connection terminated')) return true;
  if (msg.includes('connection timeout')) return true;
  if (msg.includes('too many clients')) return true;
  if (msg.includes('remaining connection slots')) return true;
  if (msg.includes('could not connect')) return true;

  // Neon serverless cold start
  if (msg.includes('endpoint is disabled')) return true;
  if (msg.includes('compute is starting')) return true;

  // Deadlock/lock timeout (retryable)
  if (msg.includes('deadlock detected')) return true;
  if (msg.includes('lock timeout')) return true;

  // Serialization failure (retryable)
  if (msg.includes('serialization failure')) return true;
  if (msg.includes('could not serialize access')) return true;

  // HTTP-like status codes in error
  const anyError = error as any;
  if (anyError.code === '40001') return true; // serialization_failure
  if (anyError.code === '40P01') return true; // deadlock_detected
  if (anyError.code === '08006') return true; // connection_failure
  if (anyError.code === '08001') return true; // sqlclient_unable_to_establish_sqlconnection
  if (anyError.code === '57P01') return true; // admin_shutdown

  return false;
}

/**
 * Execute an async function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxRetries || !opts.isRetryable(error)) {
        throw error;
      }

      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt),
        opts.maxDelay
      );
      const jitteredDelay = delay + Math.random() * delay * opts.jitter;

      console.warn(
        `⚡ Retry ${attempt + 1}/${opts.maxRetries} for ${opts.label} ` +
        `in ${Math.round(jitteredDelay)}ms: ${(error as Error).message}`
      );

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
