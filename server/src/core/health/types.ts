/**
 * Platform Core Layer - Health Check Types
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency?: number;
  message?: string;
  lastCheck: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  components: ComponentHealth[];
  metrics?: SystemMetrics;
}

export interface SystemMetrics {
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    percentUsed: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  eventLoop?: {
    lag: number;
  };
}

export interface ReadinessCheck {
  name: string;
  check: () => Promise<ComponentHealth>;
  critical: boolean;
  timeout?: number;
}

export interface LivenessProbe {
  status: 'alive' | 'dead';
  timestamp: Date;
  pid: number;
  uptime: number;
}
