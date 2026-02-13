/**
 * AGI/AI System Types - Enterprise-Grade Type Definitions
 * Shared between client and server
 */

// ═══════════════════════════════════════════════════════════════
// AGI ACCESS LEVELS
// ═══════════════════════════════════════════════════════════════

export type AgiAccessLevel =
  | 'NO_ACCESS'      // No AI features
  | 'READ_ONLY'      // Can only query/read data via AI
  | 'SUGGEST'        // AI suggests actions, user must execute
  | 'AUTOMATE'       // AI executes with approval workflow
  | 'AUTONOMOUS';    // AI executes without approval

export const AGI_ACCESS_LEVELS: Record<AgiAccessLevel, { label: string; labelAr: string; description: string }> = {
  NO_ACCESS: { label: 'No Access', labelAr: 'بدون وصول', description: 'AI features disabled' },
  READ_ONLY: { label: 'Read Only', labelAr: 'قراءة فقط', description: 'Can query data only' },
  SUGGEST: { label: 'Suggest', labelAr: 'اقتراح', description: 'AI suggests, user executes' },
  AUTOMATE: { label: 'Automate', labelAr: 'أتمتة', description: 'AI executes with approval' },
  AUTONOMOUS: { label: 'Autonomous', labelAr: 'مستقل', description: 'AI executes directly' },
};

// ═══════════════════════════════════════════════════════════════
// AGI SETTINGS
// ═══════════════════════════════════════════════════════════════

export interface AgiSettings {
  id: string;
  tenantId: string;

  // Feature Flags
  isEnabled: boolean;
  allowVoiceCommands: boolean;
  allowAutonomousActions: boolean;
  requireApprovalForDestructive: boolean;

  // LLM Configuration
  defaultModel: string;
  maxTokensPerRequest: number;
  temperature: number;

  // Usage Limits (0 = unlimited)
  dailyRequestLimit: number;
  monthlyRequestLimit: number;

  // Default Access Level for new users
  defaultAgiLevel: AgiAccessLevel;

  // Custom System Prompt (optional)
  customSystemPrompt?: string | null;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateAgiSettingsInput {
  isEnabled?: boolean;
  allowVoiceCommands?: boolean;
  allowAutonomousActions?: boolean;
  requireApprovalForDestructive?: boolean;
  defaultModel?: string;
  maxTokensPerRequest?: number;
  temperature?: number;
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
  defaultAgiLevel?: AgiAccessLevel;
  customSystemPrompt?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// AGI CHAT & MESSAGES
// ═══════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AgiMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    processingTimeMs?: number;
    wasPatternMatched?: boolean;
    actionExecuted?: string;
    approvalRequired?: boolean;
  };
}

export interface AgiFormFillState {
  sessionId?: string;            // UUID — concurrent safety (3000+ tenants)
  entity: string;               // 'users', 'branches'
  action: 'CREATE' | 'UPDATE';
  collectedFields: Record<string, unknown>;
  missingRequired: string[];    // Field names still needed
  isComplete: boolean;
  confirmedByUser: boolean;     // User said "yes"/"نعم"
}

export interface AgiChatRequest {
  message: string;
  context?: {
    currentPage?: string;
    currentModule?: string;
    selectedItems?: string[];
    locale?: 'en' | 'ar';
  };
  formFillState?: AgiFormFillState;
  history?: { role: string; content: string }[];
}

export interface AgiChatResponse {
  success: boolean;
  message: AgiMessage;
  action?: AgiAction;
  formFillState?: AgiFormFillState;
  data?: Record<string, unknown>;
  requiresApproval?: boolean;
  approvalId?: string;
  error?: string;
}

// Streaming response chunk
export interface AgiStreamChunk {
  type: 'text' | 'action' | 'approval' | 'error' | 'done';
  content?: string;
  action?: AgiAction;
  approvalId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// AGI ACTIONS
// ═══════════════════════════════════════════════════════════════

export type AgiActionType =
  | 'NAVIGATE'       // Navigate to a page
  | 'CREATE'         // Create a record
  | 'READ'           // Read/query data
  | 'UPDATE'         // Update a record
  | 'DELETE'         // Delete a record
  | 'BULK_ACTION'    // Bulk operations
  | 'REPORT'         // Generate report
  | 'CUSTOM';        // Custom action

export interface AgiAction {
  type: AgiActionType;
  target: string;           // Module/Screen/Entity
  params?: Record<string, unknown>;
  description: string;
  descriptionAr?: string;
  isDestructive: boolean;
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ParsedCommand {
  intent: string;
  action: AgiActionType;
  target: string;
  params: Record<string, unknown>;
  confidence: number;
  rawInput: string;
  language: 'en' | 'ar';
}

// ═══════════════════════════════════════════════════════════════
// AGI APPROVALS
// ═══════════════════════════════════════════════════════════════

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED';

export interface AgiApproval {
  id: string;
  tenantId: string;
  userId: string;           // Who requested

  // The action to be approved
  action: AgiAction;
  originalMessage: string;

  // Status
  status: ApprovalStatus;

  // Approver info
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;

  // Execution info
  executedAt?: Date | null;
  executionResult?: Record<string, unknown> | null;

  // Timestamps
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApprovalInput {
  action: AgiAction;
  originalMessage: string;
  expiresInMinutes?: number; // Default: 60
}

export interface ApproveRejectInput {
  approvalId: string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// AGI USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

export interface AgiUsageRecord {
  id: string;
  tenantId: string;
  userId: string;

  // Request info
  requestType: 'CHAT' | 'VOICE' | 'ACTION';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  // Processing info
  model: string;
  processingTimeMs: number;
  wasPatternMatched: boolean;   // True if handled by pattern matching
  wasClaude: boolean;           // True if sent to Claude API

  // Cost tracking (in USD cents)
  estimatedCost: number;

  // Timestamps
  createdAt: Date;
}

export interface AgiUsageStats {
  // Current period
  dailyRequests: number;
  dailyTokens: number;
  monthlyRequests: number;
  monthlyTokens: number;

  // Limits
  dailyLimit: number;           // 0 = unlimited
  monthlyLimit: number;         // 0 = unlimited

  // Percentages
  dailyUsagePercent: number;
  monthlyUsagePercent: number;

  // Cost
  estimatedMonthlyCost: number;
}

export interface AgiAnalytics {
  // Time range
  startDate: Date;
  endDate: Date;

  // Totals
  totalRequests: number;
  totalTokens: number;
  totalCost: number;

  // Breakdown
  requestsByType: Record<string, number>;
  requestsByUser: { userId: string; count: number }[];
  requestsByDay: { date: string; count: number; tokens: number }[];

  // Performance
  avgProcessingTimeMs: number;
  patternMatchRate: number;     // % handled without Claude
  claudeCallRate: number;       // % sent to Claude
}

// ═══════════════════════════════════════════════════════════════
// AGI LOGS
// ═══════════════════════════════════════════════════════════════

export type AgiLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface AgiLog {
  id: string;
  tenantId: string;
  userId?: string | null;

  // Log info
  level: AgiLogLevel;
  category: string;           // 'CHAT', 'ACTION', 'APPROVAL', 'ERROR', etc.
  message: string;

  // Context
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;

  // Timestamps
  createdAt: Date;
}

export interface AgiLogQuery {
  tenantId?: string;
  userId?: string;
  level?: AgiLogLevel;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM AI CONFIGURATION (Platform-Wide)
// ═══════════════════════════════════════════════════════════════

export interface SystemAiConfig {
  // Global settings
  isAiEnabled: boolean;               // Kill switch for entire platform
  defaultModel: string;
  fallbackModel: string;

  // API Configuration
  apiKeyConfigured: boolean;          // Don't expose the key itself

  // Feature flags
  allowTenantCustomPrompts: boolean;
  allowVoiceCommandsGlobally: boolean;

  // Limits
  maxTokensPerRequest: number;
  globalRateLimitPerMinute: number;

  // Monitoring
  enableDetailedLogging: boolean;
  logRetentionDays: number;
}

export interface UpdateSystemAiConfigInput {
  isAiEnabled?: boolean;
  defaultModel?: string;
  fallbackModel?: string;
  allowTenantCustomPrompts?: boolean;
  allowVoiceCommandsGlobally?: boolean;
  maxTokensPerRequest?: number;
  globalRateLimitPerMinute?: number;
  enableDetailedLogging?: boolean;
  logRetentionDays?: number;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM AI MONITORING
// ═══════════════════════════════════════════════════════════════

export interface SystemAiMonitoring {
  // Overall stats
  totalTenants: number;
  tenantsWithAiEnabled: number;

  // Platform usage (today)
  todayRequests: number;
  todayTokens: number;
  todayErrors: number;

  // Platform usage (month)
  monthRequests: number;
  monthTokens: number;
  monthCost: number;

  // Top tenants
  topTenantsByUsage: {
    tenantId: string;
    tenantName: string;
    requests: number;
    tokens: number;
  }[];

  // Health
  apiStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  avgResponseTimeMs: number;
  errorRate: number;
}

// ═══════════════════════════════════════════════════════════════
// UI STATE TYPES
// ═══════════════════════════════════════════════════════════════

export type AiButtonState =
  | 'idle'        // Default state
  | 'hover'       // Mouse over
  | 'thinking'    // Processing request
  | 'listening'   // Voice input active
  | 'success'     // Action completed
  | 'error';      // Error occurred

export interface AiChatState {
  isOpen: boolean;
  isLoading: boolean;
  messages: AgiMessage[];
  currentContext: {
    page: string;
    module?: string;
    locale: 'en' | 'ar';
  };
  pendingApprovals: AgiApproval[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AgiApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    requestId?: string;
    processingTimeMs?: number;
  };
}

export interface PaginatedAgiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
