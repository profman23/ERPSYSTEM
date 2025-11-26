/**
 * Platform Core Layer - API Versioning Types
 */

export type ApiVersion = 'v1' | 'v2' | 'v3';

export interface VersionConfig {
  version: ApiVersion;
  deprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  minClientVersion?: string;
}

export interface VersionNegotiation {
  requestedVersion: ApiVersion | null;
  resolvedVersion: ApiVersion;
  source: 'path' | 'header' | 'default';
  warnings: string[];
}

export const CURRENT_VERSION: ApiVersion = 'v1';
export const SUPPORTED_VERSIONS: ApiVersion[] = ['v1'];
export const DEFAULT_VERSION: ApiVersion = 'v1';

export const VERSION_CONFIGS: Record<ApiVersion, VersionConfig> = {
  v1: {
    version: 'v1',
    deprecated: false,
  },
  v2: {
    version: 'v2',
    deprecated: false,
  },
  v3: {
    version: 'v3',
    deprecated: false,
  },
};
