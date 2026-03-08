import { Request, Response, NextFunction } from 'express';
import { tenantSetupService } from '../../services/TenantSetupService';
import { subscriptionService } from '../../services/SubscriptionService';
import { tenantCodeGenerator } from '../../services/TenantCodeGenerator';
import { MIDDLE_EAST_COUNTRIES, SUBSCRIPTION_PLANS, SubscriptionPlanType } from '../../db/schemas';
import { createTenantSchema, updateTenantSchema } from '../../validations/tenantValidation';
import { contextLogger } from '../../core/context/contextLogger';
import { metricsCollector } from '../../core/metrics/metricsCollector';

export const createTenantAdvanced = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const validatedData = createTenantSchema.parse(req.body);

    const result = await tenantSetupService.createTenant({
      name: validatedData.name,
      subscriptionPlan: validatedData.subscriptionPlan as SubscriptionPlanType,
      countryCode: validatedData.countryCode,
      contactEmail: validatedData.contactEmail,
      contactPhone: validatedData.contactPhone,
      address: validatedData.address,
      primaryColor: validatedData.primaryColor,
      defaultLanguage: validatedData.defaultLanguage,
      aiAssistantEnabled: validatedData.aiAssistantEnabled,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    contextLogger.info('Tenant created via advanced flow', {
      tenantId: result.tenant?.id,
      tenantCode: result.tenant?.code,
      userId: user.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: result.tenant,
      dpfResult: result.dpfCopyResult,
      queuedTasks: result.queuedTasks,
    });
  } catch (error: any) {
    contextLogger.error('Error creating tenant', { error });
    next(error);
  }
};

export const updateTenantAdvanced = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const validatedData = updateTenantSchema.parse(req.body);

    const result = await tenantSetupService.updateTenant(id, {
      name: validatedData.name,
      subscriptionPlan: validatedData.subscriptionPlan as SubscriptionPlanType | undefined,
      countryCode: validatedData.countryCode,
      contactEmail: validatedData.contactEmail,
      contactPhone: validatedData.contactPhone,
      address: validatedData.address,
      primaryColor: validatedData.primaryColor,
      defaultLanguage: validatedData.defaultLanguage,
      status: validatedData.status,
      aiAssistantEnabled: validatedData.aiAssistantEnabled,
      allowedBranches: validatedData.allowedBranches,
      allowedBusinessLines: validatedData.allowedBusinessLines,
      allowedUsers: validatedData.allowedUsers,
      storageLimitGB: validatedData.storageLimitGB,
      apiRateLimit: validatedData.apiRateLimit,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: result.tenant,
    });
  } catch (error: any) {
    contextLogger.error('Error updating tenant', { error });
    next(error);
  }
};

export const generateTenantCode = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const code = await tenantSetupService.generateTenantCode();

    res.json({
      success: true,
      code,
    });
  } catch (error: any) {
    contextLogger.error('Error generating tenant code', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate tenant code',
    });
  }
};

export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([planCode, limits]) => ({
      code: planCode,
      name: planCode.charAt(0).toUpperCase() + planCode.slice(1),
      ...limits,
    }));

    res.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    contextLogger.error('Error fetching subscription plans', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans',
    });
  }
};

export const getCountries = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const { lang } = req.query;
    const isArabic = lang === 'ar';

    const countries = MIDDLE_EAST_COUNTRIES.map(country => ({
      code: country.code,
      name: isArabic ? country.nameAr : country.name,
      nameEn: country.name,
      nameAr: country.nameAr,
      timezone: country.timezone,
    }));

    res.json({
      success: true,
      data: countries,
    });
  } catch (error: any) {
    contextLogger.error('Error fetching countries', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch countries',
    });
  }
};

export const getTenantDetails = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const tenant = await tenantSetupService.getTenantById(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error: any) {
    contextLogger.error('Error fetching tenant details', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant details',
    });
  }
};

export const listTenantsAdvanced = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.accessScope !== 'system') {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden: System access required' 
      });
    }

    const { page, limit, status, subscriptionPlan } = req.query;

    const result = await tenantSetupService.listTenants({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string | undefined,
      subscriptionPlan: subscriptionPlan as string | undefined,
    });

    res.json({
      success: true,
      data: result.tenants,
      pagination: result.pagination,
    });
  } catch (error: any) {
    contextLogger.error('Error listing tenants', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list tenants',
    });
  }
};

export const testConcurrentCodeGeneration = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const result = await tenantCodeGenerator.generateUniqueCodeAtomic();
    
    res.json({
      success: true,
      code: result.code,
      retries: result.retries,
      durationMs: result.durationMs,
      method: result.method,
      concurrentRequests: tenantCodeGenerator.getConcurrentRequests(),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    contextLogger.error('Concurrent code generation test failed', { error, durationMs: duration });
    
    res.status(500).json({
      success: false,
      error: error.message || 'Code generation failed',
      durationMs: duration,
    });
  }
};

export const getCodeGenerationMetrics = async (_req: Request, res: Response) => {
  try {
    const prometheusFormat = metricsCollector.exportPrometheusFormat();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusFormat);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
};
