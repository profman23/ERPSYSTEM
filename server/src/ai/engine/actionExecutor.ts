/**
 * AI Action Executor — Service-Layer Execution
 *
 * Executes AI actions by calling service layer directly.
 * NEVER makes HTTP calls — follows CLAUDE.md: "business logic ONLY in services"
 *
 * Permission is already checked by AGI Engine before reaching here.
 * This module provides defense-in-depth validation of required fields.
 */

import { HierarchyService } from '../../services/HierarchyService';
import { ENTITY_REGISTRY, getEntityMeta } from './entityMetadata';
import type { AgiAction } from '../../../../types/agi';

export interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  message: string;
  messageAr: string;
}

export class ActionExecutor {
  /**
   * Execute an AI action by routing to the appropriate service.
   * Permission already checked by AGI Engine before reaching here.
   *
   * @param tenantId - Tenant context (for tenant-scoped operations)
   * @param userId - Acting user (for audit trail)
   * @param action - The AI action to execute
   */
  async execute(
    tenantId: string,
    userId: string,
    action: AgiAction
  ): Promise<ExecutionResult> {
    const params = action.params || {};

    // READ actions don't require entity metadata — handleRead supports extra entities like 'roles'
    if (action.type === 'READ') {
      try {
        return this.handleRead(tenantId, action.target, params);
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          success: false,
          message: `Failed to read: ${errMessage}`,
          messageAr: `فشل الاستعلام: ${errMessage}`,
        };
      }
    }

    // For mutations (CREATE, UPDATE, DELETE) — validate entity metadata and required fields
    const meta = getEntityMeta(action.target);
    if (!meta) {
      return {
        success: false,
        message: `Unknown entity: ${action.target}`,
        messageAr: `كيان غير معروف: ${action.target}`,
      };
    }

    const missingFields = meta.requiredFields.filter(f => !params[f.name]);
    if (missingFields.length > 0) {
      const missingEn = missingFields.map(f => f.label).join(', ');
      const missingAr = missingFields.map(f => f.labelAr).join('، ');
      return {
        success: false,
        message: `Missing required fields: ${missingEn}`,
        messageAr: `حقول مطلوبة ناقصة: ${missingAr}`,
      };
    }

    try {
      switch (action.type) {
        case 'CREATE':
          return this.handleCreate(tenantId, action.target, params);
        default:
          return {
            success: false,
            message: `Action type "${action.type}" is not yet supported for entity "${action.target}"`,
            messageAr: `نوع العملية "${action.type}" غير مدعوم حالياً للكيان "${action.target}"`,
          };
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to execute: ${errMessage}`,
        messageAr: `فشل التنفيذ: ${errMessage}`,
      };
    }
  }

  /**
   * Handle CREATE actions by routing to the appropriate service method
   */
  private async handleCreate(
    tenantId: string,
    entity: string,
    params: Record<string, unknown>
  ): Promise<ExecutionResult> {
    switch (entity) {
      case 'users': {
        const result = await HierarchyService.createUser({
          branchId: params.branchId as string,
          firstName: params.firstName as string,
          lastName: params.lastName as string,
          email: params.email as string,
          password: params.password as string,
          phone: params.phone as string | undefined,
          role: params.role as string | undefined,
          accessScope: params.accessScope as string | undefined,
          allowedBranchIds: params.allowedBranchIds as string[] | undefined,
        });
        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          message: `User "${params.firstName} ${params.lastName}" created successfully`,
          messageAr: `تم إنشاء المستخدم "${params.firstName} ${params.lastName}" بنجاح`,
        };
      }

      case 'branches': {
        const result = await HierarchyService.createBranch({
          businessLineId: params.businessLineId as string,
          name: params.name as string,
          country: params.country as string,
          city: params.city as string,
          address: params.address as string,
          buildingNumber: params.buildingNumber as string,
          vatRegistrationNumber: params.vatRegistrationNumber as string,
          commercialRegistrationNumber: params.commercialRegistrationNumber as string,
          phone: params.phone as string | undefined,
          email: params.email as string | undefined,
          district: params.district as string | undefined,
          postalCode: params.postalCode as string | undefined,
          timezone: params.timezone as string | undefined,
        });
        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          message: `Branch "${params.name}" created successfully`,
          messageAr: `تم إنشاء الفرع "${params.name}" بنجاح`,
        };
      }

      case 'business-lines': {
        const result = await HierarchyService.createBusinessLine({
          tenantId: params.tenantId as string || tenantId,
          code: params.code as string || `BL-${Date.now()}`,
          name: params.name as string,
          businessLineType: params.businessLineType as string | undefined,
          description: params.description as string | undefined,
          contactEmail: params.contactEmail as string | undefined,
          contactPhone: params.contactPhone as string | undefined,
        });
        return {
          success: true,
          data: result as unknown as Record<string, unknown>,
          message: `Business line "${params.name}" created successfully`,
          messageAr: `تم إنشاء خط العمل "${params.name}" بنجاح`,
        };
      }

      default:
        return {
          success: false,
          message: `Entity "${entity}" creation is not yet supported`,
          messageAr: `إنشاء الكيان "${entity}" غير مدعوم حالياً`,
        };
    }
  }

  /**
   * Handle READ actions — query data and return formatted text
   * Uses HierarchyService.getTenantHierarchy() for hierarchy data
   */
  private async handleRead(
    tenantId: string,
    entity: string,
    params: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const MAX_DISPLAY = 20;

    const hierarchy = await HierarchyService.getTenantHierarchy(tenantId);
    if (!hierarchy) {
      return {
        success: false,
        message: 'Could not load tenant data',
        messageAr: 'لم نتمكن من تحميل بيانات المؤسسة',
      };
    }

    switch (entity) {
      case 'branches': {
        const allBranches: { id: string; name: string; city: string; blName: string; blId: string; userCount: number }[] = [];
        for (const bl of hierarchy.businessLines) {
          for (const branch of bl.branches) {
            allBranches.push({
              id: (branch as any).id || '',
              name: branch.name,
              city: (branch as any).city || '',
              blName: bl.name,
              blId: (bl as any).id || '',
              userCount: (branch as any).userCount || 0,
            });
          }
        }

        if (allBranches.length === 0) {
          return {
            success: true,
            data: { branches: [], count: 0 },
            message: 'No branches found for this tenant.',
            messageAr: 'لا توجد فروع لهذه المؤسسة.',
          };
        }

        const displayed = allBranches.slice(0, MAX_DISPLAY);
        const remaining = allBranches.length - displayed.length;

        // Include IDs in display so Claude can reference them for create_entity
        const linesAr = displayed.map((b, i) =>
          `${i + 1}. ${b.name} — ${b.city} (${b.blName}) — ${b.userCount} مستخدم [id: ${b.id}]`
        );
        const linesEn = displayed.map((b, i) =>
          `${i + 1}. ${b.name} — ${b.city} (${b.blName}) — ${b.userCount} users [id: ${b.id}]`
        );

        const suffixAr = remaining > 0 ? `\n... و${remaining} فرع آخر` : '';
        const suffixEn = remaining > 0 ? `\n... and ${remaining} more` : '';

        return {
          success: true,
          data: { branches: allBranches, count: allBranches.length },
          message: `You have ${allBranches.length} branch(es):\n\n${linesEn.join('\n')}${suffixEn}`,
          messageAr: `لديكم ${allBranches.length} فرع/فروع:\n\n${linesAr.join('\n')}${suffixAr}`,
        };
      }

      case 'business-lines': {
        const bls = hierarchy.businessLines;

        if (bls.length === 0) {
          return {
            success: true,
            data: { businessLines: [], count: 0 },
            message: 'No business lines found for this tenant.',
            messageAr: 'لا توجد خطوط أعمال لهذه المؤسسة.',
          };
        }

        const displayed = bls.slice(0, MAX_DISPLAY);
        const remaining = bls.length - displayed.length;

        const linesAr = displayed.map((bl, i) =>
          `${i + 1}. ${bl.name} — ${bl.branchCount} فرع — ${bl.totalUsers} مستخدم [id: ${(bl as any).id || ''}]`
        );
        const linesEn = displayed.map((bl, i) =>
          `${i + 1}. ${bl.name} — ${bl.branchCount} branches — ${bl.totalUsers} users [id: ${(bl as any).id || ''}]`
        );

        const suffixAr = remaining > 0 ? `\n... و${remaining} خط عمل آخر` : '';
        const suffixEn = remaining > 0 ? `\n... and ${remaining} more` : '';

        return {
          success: true,
          data: { businessLines: bls, count: bls.length },
          message: `You have ${bls.length} business line(s):\n\n${linesEn.join('\n')}${suffixEn}`,
          messageAr: `لديكم ${bls.length} خط/خطوط أعمال:\n\n${linesAr.join('\n')}${suffixAr}`,
        };
      }

      case 'users': {
        const allUsers: { name: string; email: string; role: string; branch: string }[] = [];
        for (const bl of hierarchy.businessLines) {
          for (const branch of bl.branches) {
            for (const user of (branch as any).users || []) {
              allUsers.push({
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: user.email || '',
                role: user.role || '',
                branch: branch.name,
              });
            }
          }
        }

        if (allUsers.length === 0) {
          return {
            success: true,
            data: { users: [], count: 0 },
            message: 'No users found for this tenant.',
            messageAr: 'لا يوجد مستخدمين لهذه المؤسسة.',
          };
        }

        const displayed = allUsers.slice(0, MAX_DISPLAY);
        const remaining = allUsers.length - displayed.length;

        const linesAr = displayed.map((u, i) =>
          `${i + 1}. ${u.name} — ${u.email} — ${u.role} — ${u.branch}`
        );
        const linesEn = displayed.map((u, i) =>
          `${i + 1}. ${u.name} — ${u.email} — ${u.role} — ${u.branch}`
        );

        const suffixAr = remaining > 0 ? `\n... و${remaining} مستخدم آخر` : '';
        const suffixEn = remaining > 0 ? `\n... and ${remaining} more` : '';

        return {
          success: true,
          data: { users: allUsers, count: allUsers.length },
          message: `You have ${allUsers.length} user(s):\n\n${linesEn.join('\n')}${suffixEn}`,
          messageAr: `لديكم ${allUsers.length} مستخدم/مستخدمين:\n\n${linesAr.join('\n')}${suffixAr}`,
        };
      }

      case 'roles': {
        // Roles don't come from hierarchy, return summary
        return {
          success: true,
          data: { summary: true },
          message: `Tenant has ${hierarchy.businessLineCount} business line(s), ${hierarchy.totalBranches} branch(es), and ${hierarchy.totalUsers} user(s). Navigate to Roles page to see detailed role assignments.`,
          messageAr: `المؤسسة لديها ${hierarchy.businessLineCount} خط عمل، ${hierarchy.totalBranches} فرع، و${hierarchy.totalUsers} مستخدم. انتقل لصفحة الأدوار لمشاهدة تفاصيل الصلاحيات.`,
        };
      }

      default:
        return {
          success: false,
          message: `Reading "${entity}" is not yet supported`,
          messageAr: `استعلام "${entity}" غير مدعوم حالياً`,
        };
    }
  }
}

// Export singleton instance
export const actionExecutor = new ActionExecutor();
