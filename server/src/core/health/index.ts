/**
 * Platform Core Layer - Health Module
 */

export { healthService } from './healthService';
export { default as healthRoutes } from './healthRoutes';
export type {
  HealthStatus,
  ComponentHealth,
  SystemHealth,
  SystemMetrics,
  ReadinessCheck,
  LivenessProbe,
} from './types';
