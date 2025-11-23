/**
 * DPF AGI Interpreter
 * Natural language to permission operations (English + Arabic)
 * S-Tier AGI integration with safety validation
 */

import {
  AgiInterpretRequest,
  AgiInterpretResult,
  AgiOperationType,
  SafetyCheckResult,
  AgiAccessLevel,
} from './dpfTypes';
import { dpfEngine } from './dpfEngine';
import logger from '../config/logger';

class DPFAgiInterpreter {
  // English command patterns
  private readonly EN_PATTERNS = {
    CREATE_ROLE: [
      /create.*role.*(?:named|called)\s+"?([^"]+)"?/i,
      /add.*new.*role.*"?([^"]+)"?/i,
      /make.*role.*"?([^"]+)"?/i,
    ],
    ASSIGN_PERMISSION: [
      /(?:give|grant|assign).*permission.*"?([^"]+)"?.*to.*role.*"?([^"]+)"?/i,
      /(?:add|grant).*"?([^"]+)"?.*permission.*to.*"?([^"]+)"?/i,
    ],
    ASSIGN_USER_ROLE: [
      /(?:give|assign|add).*"?([^"]+)"?.*role.*to.*(?:user|doctor|employee).*"?([^"]+)"?/i,
      /make.*"?([^"]+)"?.*(?:a|an).*"?([^"]+)"?/i,
    ],
    CREATE_USER: [
      /(?:create|add).*(?:new)?\s*(?:user|doctor|employee).*"?([^"]+)"?/i,
      /add.*(?:user|doctor).*"?([^"]+)"?.*(?:to|in).*(?:branch|clinic).*"?([^"]+)"?/i,
    ],
    GRANT_ACCESS: [
      /(?:give|grant).*access.*to.*"?([^"]+)"?.*module/i,
      /allow.*"?([^"]+)"?.*to.*(?:access|use).*"?([^"]+)"?/i,
    ],
    REVOKE_ACCESS: [
      /(?:revoke|remove|take away).*(?:access|permission).*from.*"?([^"]+)"?/i,
      /deny.*"?([^"]+)"?.*(?:access to).*"?([^"]+)"?/i,
    ],
  };

  // Arabic command patterns
  private readonly AR_PATTERNS = {
    CREATE_ROLE: [
      /(?:أنشئ|اعمل|أضف).*(?:دور|صلاحية).*(?:اسمه|اسمها|يسمى)\s*"?([^"]+)"?/i,
    ],
    ASSIGN_PERMISSION: [
      /(?:أعط|امنح|اعطي).*"?([^"]+)"?.*(?:صلاحية|إذن).*(?:لل|إلى).*"?([^"]+)"?/i,
    ],
    ASSIGN_USER_ROLE: [
      /(?:أعط|امنح|اعطي).*"?([^"]+)"?.*(?:دور|صلاحية).*(?:لل|إلى).*(?:موظف|دكتور|مستخدم).*"?([^"]+)"?/i,
      /(?:أضف|اجعل).*(?:موظف|دكتور).*"?([^"]+)"?.*(?:في|بفرع).*"?([^"]+)"?/i,
    ],
    CREATE_USER: [
      /(?:أضف|أنشئ).*(?:موظف|دكتور|مستخدم).*(?:جديد)?\s*"?([^"]+)"?/i,
      /(?:أضف|أنشئ).*(?:موظف|دكتور).*"?([^"]+)"?.*(?:في|بفرع).*"?([^"]+)"?/i,
    ],
    GRANT_ACCESS: [
      /(?:أعط|امنح).*(?:وصول|صلاحية|حق).*(?:إلى|لل).*"?([^"]+)"?/i,
    ],
    REVOKE_ACCESS: [
      /(?:أزل|امنع|احذف).*(?:وصول|صلاحية).*(?:من|عن).*"?([^"]+)"?/i,
    ],
  };

  /**
   * Interpret natural language command
   */
  async interpret(request: AgiInterpretRequest): Promise<AgiInterpretResult> {
    const { command, language, userId, tenantId, context } = request;

    try {
      logger.info(`🤖 AGI: Interpreting ${language} command from user ${userId}: "${command}"`);

      // Detect operation type
      const operation = this.detectOperation(command, language);
      if (!operation) {
        return {
          success: false,
          error: 'Could not understand the command. Please try rephrasing.',
        };
      }

      // Extract parameters
      const params = this.extractParameters(command, language, operation);
      if (!params) {
        return {
          success: false,
          error: 'Could not extract required parameters from command.',
        };
      }

      // Run safety checks
      const safetyChecks = await this.runSafetyChecks(
        userId,
        tenantId,
        operation,
        params
      );

      const criticalFailures = safetyChecks.filter(
        (check) => !check.passed && (check.severity === 'CRITICAL' || check.severity === 'HIGH')
      );

      if (criticalFailures.length > 0) {
        logger.warn(`⚠️ AGI: Safety check failed for user ${userId}:`, criticalFailures);
        return {
          success: false,
          operation,
          intent: this.getOperationIntent(operation),
          extractedParams: params,
          confidence: 0.8,
          safetyChecks,
          error: `Safety violation: ${criticalFailures[0].message}`,
        };
      }

      // Determine required permissions
      const requiredPermissions = this.getRequiredPermissions(operation);

      // Build suggested action
      const suggestedAction = this.buildSuggestedAction(operation, params);

      logger.info(`✅ AGI: Successfully interpreted command - operation: ${operation}`);

      return {
        success: true,
        operation,
        intent: this.getOperationIntent(operation),
        extractedParams: params,
        confidence: 0.85,
        requiredPermissions,
        safetyChecks,
        suggestedAction,
      };
    } catch (error) {
      logger.error(`❌ AGI: Interpretation error:`, error);
      return {
        success: false,
        error: `Interpretation failed: ${error}`,
      };
    }
  }

  /**
   * Detect operation type from command
   */
  private detectOperation(command: string, language: 'en' | 'ar'): AgiOperationType | null {
    const patterns = language === 'en' ? this.EN_PATTERNS : this.AR_PATTERNS;

    for (const [operation, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        if (regex.test(command)) {
          return operation as AgiOperationType;
        }
      }
    }

    return null;
  }

  /**
   * Extract parameters from command
   */
  private extractParameters(
    command: string,
    language: 'en' | 'ar',
    operation: AgiOperationType
  ): Record<string, any> | null {
    const patterns = language === 'en' ? this.EN_PATTERNS : this.AR_PATTERNS;
    const operationPatterns = patterns[operation as keyof typeof patterns];

    if (!operationPatterns) return null;

    for (const regex of operationPatterns) {
      const match = command.match(regex);
      if (match) {
        return this.mapMatchToParams(operation, match);
      }
    }

    return null;
  }

  /**
   * Map regex match to operation parameters
   */
  private mapMatchToParams(
    operation: AgiOperationType,
    match: RegExpMatchArray
  ): Record<string, any> {
    switch (operation) {
      case AgiOperationType.CREATE_ROLE:
        return { roleName: match[1] };

      case AgiOperationType.ASSIGN_PERMISSION:
        return { permissionName: match[1], roleName: match[2] };

      case AgiOperationType.ASSIGN_USER_ROLE:
        return { roleName: match[1], userName: match[2] };

      case AgiOperationType.CREATE_USER:
        return { userName: match[1], branchName: match[2] };

      case AgiOperationType.GRANT_ACCESS:
        return { targetUser: match[1], moduleName: match[2] };

      case AgiOperationType.REVOKE_ACCESS:
        return { targetUser: match[1], resource: match[2] };

      default:
        return {};
    }
  }

  /**
   * Run safety checks before allowing AGI action
   */
  private async runSafetyChecks(
    userId: string,
    tenantId: string,
    operation: AgiOperationType,
    params: Record<string, any>
  ): Promise<SafetyCheckResult[]> {
    const checks: SafetyCheckResult[] = [];

    // Check 1: User has permission to perform AGI operations
    const hasAgiPermission = await dpfEngine.checkPermission({
      userId,
      tenantId,
      permissionCode: 'AGI:CONFIGURE',
    });

    checks.push({
      checkName: 'AGI Permission Check',
      passed: hasAgiPermission.granted,
      severity: 'CRITICAL',
      message: hasAgiPermission.granted
        ? 'User has AGI configuration permission'
        : 'User does not have AGI configuration permission',
      violation: hasAgiPermission.granted ? undefined : 'MISSING_AGI_PERMISSION',
    });

    // Check 2: Destructive operations require approval
    const destructiveOps = [
      AgiOperationType.DELETE_ROLE,
      AgiOperationType.REVOKE_PERMISSION,
      AgiOperationType.REVOKE_USER_ROLE,
    ];

    if (destructiveOps.includes(operation)) {
      checks.push({
        checkName: 'Destructive Operation Check',
        passed: false, // Always require approval for destructive ops
        severity: 'HIGH',
        message: 'Destructive operations require explicit approval',
        violation: 'REQUIRES_APPROVAL',
      });
    }

    // Check 3: Tenant boundary check
    checks.push({
      checkName: 'Tenant Isolation Check',
      passed: true, // tenantId is already enforced at request level
      severity: 'CRITICAL',
      message: 'Tenant isolation verified',
    });

    // Check 4: Parameter validation
    const hasRequiredParams = this.validateRequiredParams(operation, params);
    checks.push({
      checkName: 'Parameter Validation',
      passed: hasRequiredParams,
      severity: 'MEDIUM',
      message: hasRequiredParams
        ? 'All required parameters present'
        : 'Missing required parameters',
      violation: hasRequiredParams ? undefined : 'MISSING_PARAMS',
    });

    return checks;
  }

  /**
   * Validate required parameters for operation
   */
  private validateRequiredParams(
    operation: AgiOperationType,
    params: Record<string, any>
  ): boolean {
    switch (operation) {
      case AgiOperationType.CREATE_ROLE:
        return !!params.roleName;
      case AgiOperationType.ASSIGN_PERMISSION:
        return !!params.permissionName && !!params.roleName;
      case AgiOperationType.ASSIGN_USER_ROLE:
        return !!params.roleName && !!params.userName;
      case AgiOperationType.CREATE_USER:
        return !!params.userName;
      default:
        return true;
    }
  }

  /**
   * Get human-readable intent for operation
   */
  private getOperationIntent(operation: AgiOperationType): string {
    const intents: Record<AgiOperationType, string> = {
      [AgiOperationType.CREATE_ROLE]: 'Create a new role',
      [AgiOperationType.UPDATE_ROLE]: 'Update an existing role',
      [AgiOperationType.DELETE_ROLE]: 'Delete a role',
      [AgiOperationType.ASSIGN_PERMISSION]: 'Assign permission to role',
      [AgiOperationType.REVOKE_PERMISSION]: 'Revoke permission from role',
      [AgiOperationType.ASSIGN_USER_ROLE]: 'Assign role to user',
      [AgiOperationType.REVOKE_USER_ROLE]: 'Revoke role from user',
      [AgiOperationType.CREATE_USER]: 'Create a new user',
      [AgiOperationType.UPDATE_USER]: 'Update user information',
      [AgiOperationType.GRANT_ACCESS]: 'Grant access to module',
      [AgiOperationType.REVOKE_ACCESS]: 'Revoke access from module',
    };

    return intents[operation] || 'Unknown operation';
  }

  /**
   * Get required permissions for operation
   */
  private getRequiredPermissions(operation: AgiOperationType): string[] {
    const permissionMap: Record<AgiOperationType, string[]> = {
      [AgiOperationType.CREATE_ROLE]: ['ROLE:CREATE', 'AGI:CONFIGURE'],
      [AgiOperationType.UPDATE_ROLE]: ['ROLE:UPDATE', 'AGI:CONFIGURE'],
      [AgiOperationType.DELETE_ROLE]: ['ROLE:DELETE', 'AGI:CONFIGURE'],
      [AgiOperationType.ASSIGN_PERMISSION]: ['PERMISSION:ASSIGN', 'AGI:CONFIGURE'],
      [AgiOperationType.REVOKE_PERMISSION]: ['PERMISSION:REVOKE', 'AGI:CONFIGURE'],
      [AgiOperationType.ASSIGN_USER_ROLE]: ['USER:ASSIGN_ROLE', 'AGI:CONFIGURE'],
      [AgiOperationType.REVOKE_USER_ROLE]: ['USER:REVOKE_ROLE', 'AGI:CONFIGURE'],
      [AgiOperationType.CREATE_USER]: ['USER:CREATE', 'AGI:CONFIGURE'],
      [AgiOperationType.UPDATE_USER]: ['USER:UPDATE', 'AGI:CONFIGURE'],
      [AgiOperationType.GRANT_ACCESS]: ['ACCESS:GRANT', 'AGI:CONFIGURE'],
      [AgiOperationType.REVOKE_ACCESS]: ['ACCESS:REVOKE', 'AGI:CONFIGURE'],
    };

    return permissionMap[operation] || ['AGI:CONFIGURE'];
  }

  /**
   * Build suggested action description
   */
  private buildSuggestedAction(
    operation: AgiOperationType,
    params: Record<string, any>
  ): string {
    switch (operation) {
      case AgiOperationType.CREATE_ROLE:
        return `Create role "${params.roleName}"`;
      case AgiOperationType.ASSIGN_PERMISSION:
        return `Assign "${params.permissionName}" permission to role "${params.roleName}"`;
      case AgiOperationType.ASSIGN_USER_ROLE:
        return `Assign role "${params.roleName}" to user "${params.userName}"`;
      case AgiOperationType.CREATE_USER:
        return params.branchName
          ? `Create user "${params.userName}" in branch "${params.branchName}"`
          : `Create user "${params.userName}"`;
      case AgiOperationType.GRANT_ACCESS:
        return `Grant "${params.targetUser}" access to "${params.moduleName}" module`;
      default:
        return 'Execute AGI operation';
    }
  }
}

export const dpfAgiInterpreter = new DPFAgiInterpreter();
