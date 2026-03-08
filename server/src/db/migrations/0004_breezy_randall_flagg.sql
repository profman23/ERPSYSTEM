CREATE TABLE IF NOT EXISTS "dpf_agi_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"action_target" varchar(255) NOT NULL,
	"action_params" jsonb,
	"action_description" text NOT NULL,
	"action_description_ar" text,
	"risk_level" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
	"is_destructive" varchar(10) DEFAULT 'false' NOT NULL,
	"original_message" text NOT NULL,
	"detected_language" varchar(5) DEFAULT 'en',
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"executed_at" timestamp,
	"execution_result" jsonb,
	"execution_error" text,
	"expires_at" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_agi_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_enabled" varchar(10) DEFAULT 'true' NOT NULL,
	"allow_voice_commands" varchar(10) DEFAULT 'false' NOT NULL,
	"allow_autonomous_actions" varchar(10) DEFAULT 'false' NOT NULL,
	"require_approval_destructive" varchar(10) DEFAULT 'true' NOT NULL,
	"default_model" varchar(100) DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"max_tokens_per_request" integer DEFAULT 4096 NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"daily_request_limit" integer DEFAULT 0 NOT NULL,
	"monthly_request_limit" integer DEFAULT 0 NOT NULL,
	"default_agi_level" varchar(20) DEFAULT 'SUGGEST' NOT NULL,
	"custom_system_prompt" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dpf_agi_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_system_ai_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_ai_enabled" varchar(10) DEFAULT 'true' NOT NULL,
	"default_model" varchar(100) DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"fallback_model" varchar(100) DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"api_key_configured" varchar(10) DEFAULT 'false' NOT NULL,
	"allow_tenant_custom_prompts" varchar(10) DEFAULT 'true' NOT NULL,
	"allow_voice_globally" varchar(10) DEFAULT 'true' NOT NULL,
	"max_tokens_per_request" integer DEFAULT 4096 NOT NULL,
	"global_rate_limit_per_minute" integer DEFAULT 100 NOT NULL,
	"enable_detailed_logging" varchar(10) DEFAULT 'true' NOT NULL,
	"log_retention_days" integer DEFAULT 90 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_agi_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" varchar(20) NOT NULL,
	"request_id" uuid,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"model" varchar(100) NOT NULL,
	"processing_time_ms" integer DEFAULT 0 NOT NULL,
	"was_pattern_matched" varchar(10) DEFAULT 'false' NOT NULL,
	"was_claude" varchar(10) DEFAULT 'false' NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"page_context" varchar(255),
	"module_context" varchar(100),
	"locale" varchar(5) DEFAULT 'en',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_agi_usage_daily_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"date_key" varchar(10) NOT NULL,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"chat_requests" integer DEFAULT 0 NOT NULL,
	"voice_requests" integer DEFAULT 0 NOT NULL,
	"action_requests" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_cents" integer DEFAULT 0 NOT NULL,
	"avg_processing_time_ms" integer DEFAULT 0 NOT NULL,
	"pattern_match_count" integer DEFAULT 0 NOT NULL,
	"claude_call_count" integer DEFAULT 0 NOT NULL,
	"unique_users" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_role_screen_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"screen_code" varchar(100) NOT NULL,
	"authorization_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_role_screen" UNIQUE("role_id","screen_code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_approvals" ADD CONSTRAINT "dpf_agi_approvals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_approvals" ADD CONSTRAINT "dpf_agi_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_approvals" ADD CONSTRAINT "dpf_agi_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_approvals" ADD CONSTRAINT "dpf_agi_approvals_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_settings" ADD CONSTRAINT "dpf_agi_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_usage" ADD CONSTRAINT "dpf_agi_usage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_usage" ADD CONSTRAINT "dpf_agi_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_usage_daily_aggregates" ADD CONSTRAINT "dpf_agi_usage_daily_aggregates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_role_screen_authorizations" ADD CONSTRAINT "dpf_role_screen_authorizations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_role_screen_authorizations" ADD CONSTRAINT "dpf_role_screen_authorizations_role_id_dpf_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."dpf_roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_approvals_tenant_status_idx" ON "dpf_agi_approvals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_approvals_user_idx" ON "dpf_agi_approvals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_approvals_pending_idx" ON "dpf_agi_approvals" USING btree ("tenant_id","status","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_approvals_created_idx" ON "dpf_agi_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_settings_tenant_idx" ON "dpf_agi_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_usage_tenant_daily_idx" ON "dpf_agi_usage" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_usage_user_idx" ON "dpf_agi_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_usage_model_idx" ON "dpf_agi_usage" USING btree ("model","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_usage_created_idx" ON "dpf_agi_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpf_agi_usage_daily_tenant_date_idx" ON "dpf_agi_usage_daily_aggregates" USING btree ("tenant_id","date_key");