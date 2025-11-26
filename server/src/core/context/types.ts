/**
 * Platform Core Layer - Request Context Types
 * Enterprise-grade request context following AWS/Stripe/Uber patterns
 */

export interface RequestContextData {
  traceId: string;
  correlationId: string;
  requestId: string;
  parentSpanId?: string;
  spanId: string;
  tenantId: string | null;
  userId: string | null;
  branchId: string | null;
  businessLineId: string | null;
  accessScope: string | null;
  role: string | null;
  clientIp: string;
  forwardedFor: string | null;
  userAgent: string;
  deviceFingerprint: string | null;
  requestPath: string;
  requestMethod: string;
  timestamp: Date;
  requestStart: number;
  requestDuration?: number;
  sampling: SamplingDecision;
  metadata: Record<string, unknown>;
}

export interface SamplingDecision {
  sampled: boolean;
  reason: 'always' | 'percentage' | 'error' | 'adaptive' | 'force';
  rate: number;
}

export interface TracingHeaders {
  'x-trace-id'?: string;
  'x-correlation-id'?: string;
  'x-parent-span-id'?: string;
  'x-request-id'?: string;
  'x-sampling-decision'?: string;
}

export interface OutboundPropagation {
  headers: TracingHeaders;
  metadata: Record<string, unknown>;
}

export type ContextLogData = Pick<
  RequestContextData,
  | 'traceId'
  | 'correlationId'
  | 'requestId'
  | 'spanId'
  | 'tenantId'
  | 'userId'
  | 'branchId'
  | 'clientIp'
  | 'requestPath'
  | 'requestMethod'
>;

export interface SamplingConfig {
  defaultRate: number;
  errorRate: number;
  adaptiveThreshold: number;
  forceSamplePaths: string[];
  excludePaths: string[];
}

export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  defaultRate: 0.01,
  errorRate: 1.0,
  adaptiveThreshold: 500,
  forceSamplePaths: ['/api/v1/auth/', '/health'],
  excludePaths: ['/health/live', '/metrics'],
};
