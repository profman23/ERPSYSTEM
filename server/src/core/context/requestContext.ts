/**
 * Platform Core Layer - Request Context
 * Enterprise-grade AsyncLocalStorage-based request context
 * Supports distributed tracing, sampling, and context propagation
 */

import { AsyncLocalStorage } from 'async_hooks';
import { ulid } from 'ulid';
import crypto from 'crypto';
import {
  RequestContextData,
  SamplingDecision,
  SamplingConfig,
  OutboundPropagation,
  ContextLogData,
  DEFAULT_SAMPLING_CONFIG,
} from './types';

const asyncLocalStorage = new AsyncLocalStorage<RequestContextData>();

let samplingConfig: SamplingConfig = { ...DEFAULT_SAMPLING_CONFIG };
let adaptiveCounter = 0;

export class RequestContext {
  /**
   * Generate a new trace ID using ULID (sortable, unique)
   */
  static generateTraceId(): string {
    return `trc_${ulid()}`;
  }

  /**
   * Generate a span ID
   */
  static generateSpanId(): string {
    return `spn_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate a request ID
   */
  static generateRequestId(): string {
    return `req_${ulid()}`;
  }

  /**
   * Generate correlation ID (for linking related requests)
   */
  static generateCorrelationId(): string {
    return `cor_${ulid()}`;
  }

  /**
   * Calculate device fingerprint from request headers
   */
  static calculateFingerprint(
    userAgent: string,
    acceptLanguage: string,
    acceptEncoding: string
  ): string {
    const data = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Determine sampling decision based on configuration
   */
  static determineSampling(
    path: string,
    isError: boolean = false
  ): SamplingDecision {
    if (samplingConfig.excludePaths.some(p => path.startsWith(p))) {
      return { sampled: false, reason: 'always', rate: 0 };
    }

    if (samplingConfig.forceSamplePaths.some(p => path.startsWith(p))) {
      return { sampled: true, reason: 'force', rate: 1 };
    }

    if (isError) {
      return { sampled: true, reason: 'error', rate: samplingConfig.errorRate };
    }

    adaptiveCounter++;
    if (adaptiveCounter >= samplingConfig.adaptiveThreshold) {
      adaptiveCounter = 0;
      return { sampled: true, reason: 'adaptive', rate: 1 };
    }

    const sampled = Math.random() < samplingConfig.defaultRate;
    return {
      sampled,
      reason: 'percentage',
      rate: samplingConfig.defaultRate,
    };
  }

  /**
   * Create a new request context
   */
  static create(params: {
    traceId?: string;
    correlationId?: string;
    parentSpanId?: string;
    tenantId?: string | null;
    userId?: string | null;
    branchId?: string | null;
    businessLineId?: string | null;
    accessScope?: string | null;
    role?: string | null;
    clientIp: string;
    forwardedFor?: string | null;
    userAgent: string;
    acceptLanguage?: string;
    acceptEncoding?: string;
    requestPath: string;
    requestMethod: string;
    metadata?: Record<string, unknown>;
  }): RequestContextData {
    const now = Date.now();
    const traceId = params.traceId || this.generateTraceId();
    const sampling = this.determineSampling(params.requestPath);

    return {
      traceId,
      correlationId: params.correlationId || this.generateCorrelationId(),
      requestId: this.generateRequestId(),
      parentSpanId: params.parentSpanId,
      spanId: this.generateSpanId(),
      tenantId: params.tenantId ?? null,
      userId: params.userId ?? null,
      branchId: params.branchId ?? null,
      businessLineId: params.businessLineId ?? null,
      accessScope: params.accessScope ?? null,
      role: params.role ?? null,
      clientIp: params.clientIp,
      forwardedFor: params.forwardedFor ?? null,
      userAgent: params.userAgent,
      deviceFingerprint: this.calculateFingerprint(
        params.userAgent,
        params.acceptLanguage || '',
        params.acceptEncoding || ''
      ),
      requestPath: params.requestPath,
      requestMethod: params.requestMethod,
      timestamp: new Date(),
      requestStart: now,
      sampling,
      metadata: params.metadata || {},
    };
  }

  /**
   * Run a function within a request context
   */
  static run<T>(context: RequestContextData, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Run an async function within a request context
   */
  static async runAsync<T>(
    context: RequestContextData,
    callback: () => Promise<T>
  ): Promise<T> {
    return asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current request context
   */
  static get(): RequestContextData | null {
    return asyncLocalStorage.getStore() ?? null;
  }

  /**
   * Get the current request context or throw if not in context
   */
  static getOrThrow(): RequestContextData {
    const context = asyncLocalStorage.getStore();
    if (!context) {
      throw new Error('RequestContext not available. Ensure middleware is applied.');
    }
    return context;
  }

  /**
   * Get trace ID from current context
   */
  static getTraceId(): string | null {
    return asyncLocalStorage.getStore()?.traceId ?? null;
  }

  /**
   * Get tenant ID from current context
   */
  static getTenantId(): string | null {
    return asyncLocalStorage.getStore()?.tenantId ?? null;
  }

  /**
   * Get user ID from current context
   */
  static getUserId(): string | null {
    return asyncLocalStorage.getStore()?.userId ?? null;
  }

  /**
   * Get branch ID from current context
   */
  static getBranchId(): string | null {
    return asyncLocalStorage.getStore()?.branchId ?? null;
  }

  /**
   * Get business line ID from current context
   */
  static getBusinessLineId(): string | null {
    return asyncLocalStorage.getStore()?.businessLineId ?? null;
  }

  /**
   * Get access scope from current context
   */
  static getAccessScope(): string | null {
    return asyncLocalStorage.getStore()?.accessScope ?? null;
  }

  /**
   * Get client IP from current context
   */
  static getClientIp(): string | null {
    return asyncLocalStorage.getStore()?.clientIp ?? null;
  }

  /**
   * Set request duration (called when request completes)
   */
  static setDuration(duration: number): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.requestDuration = duration;
    }
  }

  /**
   * Mark request as error (updates sampling)
   */
  static markError(): void {
    const store = asyncLocalStorage.getStore();
    if (store && !store.sampling.sampled) {
      store.sampling = {
        sampled: true,
        reason: 'error',
        rate: samplingConfig.errorRate,
      };
    }
  }

  /**
   * Add metadata to current context
   */
  static addMetadata(key: string, value: unknown): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.metadata[key] = value;
    }
  }

  /**
   * Get log-safe context data (excludes sensitive info)
   */
  static getLogData(): ContextLogData | null {
    const store = asyncLocalStorage.getStore();
    if (!store) return null;

    return {
      traceId: store.traceId,
      correlationId: store.correlationId,
      requestId: store.requestId,
      spanId: store.spanId,
      tenantId: store.tenantId,
      userId: store.userId,
      branchId: store.branchId,
      clientIp: store.clientIp,
      requestPath: store.requestPath,
      requestMethod: store.requestMethod,
    };
  }

  /**
   * Get headers for outbound HTTP request propagation
   */
  static getPropagationHeaders(): OutboundPropagation {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      return { headers: {}, metadata: {} };
    }

    return {
      headers: {
        'x-trace-id': store.traceId,
        'x-correlation-id': store.correlationId,
        'x-parent-span-id': store.spanId,
        'x-request-id': store.requestId,
        'x-sampling-decision': store.sampling.sampled ? '1' : '0',
      },
      metadata: {
        tenantId: store.tenantId,
        userId: store.userId,
      },
    };
  }

  /**
   * Get context for background job propagation
   */
  static getJobContext(): Record<string, unknown> {
    const store = asyncLocalStorage.getStore();
    if (!store) return {};

    return {
      traceId: store.traceId,
      correlationId: store.correlationId,
      parentSpanId: store.spanId,
      tenantId: store.tenantId,
      userId: store.userId,
      branchId: store.branchId,
      originPath: store.requestPath,
      originMethod: store.requestMethod,
    };
  }

  /**
   * Create child context for sub-operations
   */
  static createChildSpan(operationName: string): RequestContextData | null {
    const parent = asyncLocalStorage.getStore();
    if (!parent) return null;

    return {
      ...parent,
      parentSpanId: parent.spanId,
      spanId: this.generateSpanId(),
      requestStart: Date.now(),
      metadata: {
        ...parent.metadata,
        operation: operationName,
      },
    };
  }

  /**
   * Update sampling configuration
   */
  static updateSamplingConfig(config: Partial<SamplingConfig>): void {
    samplingConfig = { ...samplingConfig, ...config };
  }

  /**
   * Get current sampling configuration
   */
  static getSamplingConfig(): SamplingConfig {
    return { ...samplingConfig };
  }
}

export default RequestContext;
