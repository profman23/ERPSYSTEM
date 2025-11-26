/**
 * Platform Core Layer - API Version Middleware
 * Handles version negotiation and deprecation warnings
 */

import { Request, Response, NextFunction, Router } from 'express';
import {
  ApiVersion,
  VersionNegotiation,
  SUPPORTED_VERSIONS,
  DEFAULT_VERSION,
  VERSION_CONFIGS,
} from './types';

/**
 * Extract version from request
 */
function extractVersion(req: Request): VersionNegotiation {
  const warnings: string[] = [];

  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(version)) {
      const config = VERSION_CONFIGS[version];
      if (config.deprecated) {
        warnings.push(
          `API version ${version} is deprecated. ` +
          `Please migrate to ${DEFAULT_VERSION} before ${config.sunsetDate?.toISOString()}`
        );
      }
      return {
        requestedVersion: version,
        resolvedVersion: version,
        source: 'path',
        warnings,
      };
    }
    warnings.push(`Unsupported API version ${version}. Falling back to ${DEFAULT_VERSION}`);
  }

  const headerVersion = req.headers['accept-version'] as ApiVersion | undefined;
  if (headerVersion) {
    if (SUPPORTED_VERSIONS.includes(headerVersion)) {
      const config = VERSION_CONFIGS[headerVersion];
      if (config.deprecated) {
        warnings.push(
          `API version ${headerVersion} is deprecated.`
        );
      }
      return {
        requestedVersion: headerVersion,
        resolvedVersion: headerVersion,
        source: 'header',
        warnings,
      };
    }
    warnings.push(`Unsupported API version ${headerVersion} in header`);
  }

  return {
    requestedVersion: null,
    resolvedVersion: DEFAULT_VERSION,
    source: 'default',
    warnings,
  };
}

/**
 * Version negotiation middleware
 */
export const versionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const negotiation = extractVersion(req);

  (req as any).apiVersion = negotiation.resolvedVersion;
  (req as any).versionNegotiation = negotiation;

  res.setHeader('X-API-Version', negotiation.resolvedVersion);

  if (negotiation.warnings.length > 0) {
    res.setHeader('X-API-Warnings', negotiation.warnings.join('; '));
    
    const config = VERSION_CONFIGS[negotiation.resolvedVersion];
    if (config.deprecated && config.sunsetDate) {
      res.setHeader('Sunset', config.sunsetDate.toUTCString());
      res.setHeader(
        'Deprecation',
        config.deprecationDate?.toUTCString() || 'true'
      );
    }
  }

  next();
};

/**
 * Create a versioned router factory
 */
export function createVersionedRouter(version: ApiVersion): Router {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).apiVersion = version;
    res.setHeader('X-API-Version', version);
    next();
  });

  return router;
}

/**
 * Version guard middleware - reject unsupported versions
 */
export const versionGuard = (allowedVersions: ApiVersion[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = (req as any).apiVersion as ApiVersion;

    if (!allowedVersions.includes(version)) {
      return res.status(400).json({
        success: false,
        error: `API version ${version} is not supported for this endpoint`,
        supportedVersions: allowedVersions,
      });
    }

    next();
  };
};

/**
 * Deprecation notice helper
 */
export function addDeprecationNotice(
  res: Response,
  message: string,
  sunsetDate?: Date
): void {
  res.setHeader('Deprecation', 'true');
  res.setHeader('X-Deprecation-Notice', message);
  if (sunsetDate) {
    res.setHeader('Sunset', sunsetDate.toUTCString());
  }
}

export default versionMiddleware;
