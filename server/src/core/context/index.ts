/**
 * Platform Core Layer - Context Module
 * Exports all context-related functionality
 */

export { RequestContext } from './requestContext';
export {
  requestContextMiddleware,
  enrichContextWithAuth,
} from './contextMiddleware';
export {
  contextLogger,
  logWithContext,
  createChildLogger,
  queryLogger,
} from './contextLogger';
export type {
  RequestContextData,
  SamplingDecision,
  SamplingConfig,
  OutboundPropagation,
  ContextLogData,
  TracingHeaders,
} from './types';
export { DEFAULT_SAMPLING_CONFIG } from './types';
