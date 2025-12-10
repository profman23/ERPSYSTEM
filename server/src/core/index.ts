/**
 * Platform Core Layer
 * Enterprise-grade infrastructure following AWS/Stripe/Uber patterns
 * 
 * Phase 7: AGI-Ready Performance Foundation
 *
 * Components:
 * - Request Context: traceId, correlationId, distributed tracing
 * - Health Checks: Kubernetes-compatible liveness/readiness probes
 * - Audit Logging: Async writes, JSON diff, compliance
 * - API Versioning: /api/v1/* structure with deprecation support
 * - Rate Limiting: Redis-based multi-tier (tenant/user/IP)
 * - Tiered Caching: L1 (in-memory) -> L2 (Redis) -> L3 (AGI Knowledge)
 * - Quota System: Plan-based resource limits
 * - Event Bus: Domain events for async workflows
 * - Queue System: BullMQ-based background processing
 * - Write Safety: Idempotency, distributed locks, deduplication
 */

export * from './context';
export * from './health';
export * from './audit';
export * from './versioning';
export * from './ratelimit';
export * from './cache';
export * from './quota';
export * from './events';
export * from './queue';
export * from './safety';
export * from './metrics';

export { TenantContext } from './tenant/tenantContext';
