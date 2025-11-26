/**
 * Platform Core Layer
 * Enterprise-grade infrastructure following AWS/Stripe/Uber patterns
 *
 * Components:
 * - Request Context: traceId, correlationId, distributed tracing
 * - Health Checks: Kubernetes-compatible liveness/readiness probes
 * - Audit Logging: Async writes, JSON diff, compliance
 * - API Versioning: /api/v1/* structure with deprecation support
 * - Rate Limiting: Redis-based multi-tier (tenant/user/IP)
 * - Tiered Caching: L1 (in-memory) -> L2 (Redis) -> L3 (DB)
 * - Quota System: Plan-based resource limits
 * - Event Bus: Domain events for future async workflows
 */

export * from './context';
export * from './health';
export * from './audit';
export * from './versioning';
export * from './ratelimit';
export * from './cache';
export * from './quota';
export * from './events';

export { TenantContext } from './tenant/tenantContext';
