/**
 * Platform Core Layer - Versioning Module
 */

export {
  versionMiddleware,
  createVersionedRouter,
  versionGuard,
  addDeprecationNotice,
} from './versionMiddleware';
export type { ApiVersion, VersionConfig, VersionNegotiation } from './types';
export {
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  VERSION_CONFIGS,
} from './types';
