CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36),
	"user_id" varchar(36),
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(36),
	"old_data" jsonb,
	"new_data" jsonb,
	"diff" jsonb,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"client_ip" varchar(45),
	"user_agent" text,
	"trace_id" varchar(50),
	"correlation_id" varchar(50),
	"request_path" varchar(255),
	"request_method" varchar(10),
	"status_code" integer,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branch_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_line_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"allowed_users" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"business_line_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"address" text,
	"phone" varchar(50),
	"email" varchar(255),
	"timezone" varchar(100),
	"working_hours" jsonb DEFAULT '{}'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_line_type" varchar(50) DEFAULT 'general' NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"primary_color" varchar(50),
	"secondary_color" varchar(50),
	"accent_color" varchar(50),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"screen_id" uuid,
	"action_code" varchar(100) NOT NULL,
	"action_name" varchar(255) NOT NULL,
	"action_name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"action_type" varchar(50) NOT NULL,
	"action_category" varchar(50) NOT NULL,
	"http_method" varchar(10),
	"api_endpoint" varchar(500),
	"socket_event" varchar(100),
	"required_scope" varchar(50),
	"required_agi_level" varchar(50),
	"is_destructive" varchar(10) DEFAULT 'false' NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"voice_commands_en" jsonb,
	"voice_commands_ar" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_agi_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"agi_operation" varchar(100) NOT NULL,
	"input_command" text,
	"input_language" varchar(10),
	"parsed_intent" jsonb,
	"executed_action" varchar(100),
	"target_entity_type" varchar(50),
	"target_entity_id" uuid,
	"status" varchar(50) NOT NULL,
	"failure_reason" text,
	"safety_checks_passed" varchar(10),
	"safety_violations" jsonb,
	"approved_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_code" varchar(100) NOT NULL,
	"module_name" varchar(255) NOT NULL,
	"module_name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"category" varchar(100),
	"icon" varchar(100),
	"route" varchar(255),
	"sort_order" varchar(50) DEFAULT '0',
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"is_system_module" varchar(10) DEFAULT 'false' NOT NULL,
	"required_agi_level" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"permission_code" varchar(100) NOT NULL,
	"permission_name" varchar(255) NOT NULL,
	"permission_name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"module_id" uuid NOT NULL,
	"screen_id" uuid,
	"action_id" uuid,
	"permission_type" varchar(50) NOT NULL,
	"required_scope" varchar(50),
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_agi_level" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_code" varchar(100) NOT NULL,
	"role_name" varchar(255) NOT NULL,
	"role_name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"role_type" varchar(50) NOT NULL,
	"default_agi_level" varchar(50),
	"is_system_role" varchar(10) DEFAULT 'false' NOT NULL,
	"is_built_in" varchar(10) DEFAULT 'false' NOT NULL,
	"is_protected" varchar(10) DEFAULT 'false' NOT NULL,
	"is_default" varchar(10) DEFAULT 'false' NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"screen_code" varchar(100) NOT NULL,
	"screen_name" varchar(255) NOT NULL,
	"screen_name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"route" varchar(255),
	"component_path" varchar(500),
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"required_agi_level" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_scope" varchar(50) NOT NULL,
	"business_line_id" uuid,
	"branch_id" uuid,
	"assigned_by" uuid,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpf_voice_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voice_command" text NOT NULL,
	"detected_language" varchar(10),
	"confidence" varchar(50),
	"recognized_intent" varchar(255),
	"mapped_action" varchar(100),
	"permission_required" varchar(100),
	"permission_granted" varchar(10),
	"execution_status" varchar(50),
	"failure_reason" text,
	"audio_file_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"default_language" varchar(10) DEFAULT 'en' NOT NULL,
	"country" varchar(100),
	"country_code" varchar(10),
	"timezone" varchar(100) DEFAULT 'UTC',
	"subscription_plan" varchar(50) DEFAULT 'trial' NOT NULL,
	"subscription_start_at" timestamp,
	"subscription_expires_at" timestamp,
	"trial_expires_at" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"logo_url" varchar(500),
	"primary_color" varchar(50) DEFAULT '#2563EB',
	"accent_color" varchar(50) DEFAULT '#8B5CF6',
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"address" text,
	"allowed_business_lines" integer DEFAULT 5 NOT NULL,
	"allowed_branches" integer DEFAULT 10 NOT NULL,
	"allowed_users" integer DEFAULT 50 NOT NULL,
	"storage_limit_gb" integer DEFAULT 10 NOT NULL,
	"api_rate_limit" integer DEFAULT 1000 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"dpf_template_applied" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" varchar(50) NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"max_users" integer NOT NULL,
	"max_branches" integer NOT NULL,
	"max_business_lines" integer NOT NULL,
	"storage_limit_gb" integer NOT NULL,
	"api_rate_limit" integer NOT NULL,
	"trial_days" integer DEFAULT 0,
	"features" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_features_plan_code_unique" UNIQUE("plan_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50),
	"name" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"password_hash" varchar(255) NOT NULL,
	"avatar_url" varchar(500),
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"access_scope" varchar(50) DEFAULT 'branch' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"branch_id" uuid,
	"business_line_id" uuid,
	"tenant_id" uuid,
	"allowed_branch_ids" jsonb DEFAULT '[]'::jsonb,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quota_usage" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"bucket_key" varchar(255) NOT NULL,
	"bucket_type" varchar(50) NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"last_refill" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "rate_limit_buckets_bucket_key_unique" UNIQUE("bucket_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_quotas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"plan_tier" varchar(50) DEFAULT 'basic' NOT NULL,
	"max_users" integer DEFAULT 10 NOT NULL,
	"max_branches" integer DEFAULT 1 NOT NULL,
	"max_patients" integer DEFAULT 1000 NOT NULL,
	"max_appointments_per_day" integer DEFAULT 50 NOT NULL,
	"max_api_requests_per_day" integer DEFAULT 10000 NOT NULL,
	"max_storage_mb" integer DEFAULT 1000 NOT NULL,
	"custom_limits" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_quotas_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branch_capacity" ADD CONSTRAINT "branch_capacity_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branch_capacity" ADD CONSTRAINT "branch_capacity_business_line_id_business_lines_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_lines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branch_capacity" ADD CONSTRAINT "branch_capacity_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branches" ADD CONSTRAINT "branches_business_line_id_business_lines_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_lines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "business_lines" ADD CONSTRAINT "business_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_actions" ADD CONSTRAINT "dpf_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_actions" ADD CONSTRAINT "dpf_actions_module_id_dpf_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."dpf_modules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_actions" ADD CONSTRAINT "dpf_actions_screen_id_dpf_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."dpf_screens"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_logs" ADD CONSTRAINT "dpf_agi_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_logs" ADD CONSTRAINT "dpf_agi_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_agi_logs" ADD CONSTRAINT "dpf_agi_logs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_modules" ADD CONSTRAINT "dpf_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_permissions" ADD CONSTRAINT "dpf_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_permissions" ADD CONSTRAINT "dpf_permissions_module_id_dpf_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."dpf_modules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_permissions" ADD CONSTRAINT "dpf_permissions_screen_id_dpf_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."dpf_screens"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_permissions" ADD CONSTRAINT "dpf_permissions_action_id_dpf_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."dpf_actions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_role_permissions" ADD CONSTRAINT "dpf_role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_role_permissions" ADD CONSTRAINT "dpf_role_permissions_role_id_dpf_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."dpf_roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_role_permissions" ADD CONSTRAINT "dpf_role_permissions_permission_id_dpf_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."dpf_permissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_roles" ADD CONSTRAINT "dpf_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_screens" ADD CONSTRAINT "dpf_screens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_screens" ADD CONSTRAINT "dpf_screens_module_id_dpf_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."dpf_modules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_role_id_dpf_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."dpf_roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_business_line_id_business_lines_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_lines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_roles" ADD CONSTRAINT "dpf_user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_voice_logs" ADD CONSTRAINT "dpf_voice_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_voice_logs" ADD CONSTRAINT "dpf_voice_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_business_line_id_business_lines_id_fk" FOREIGN KEY ("business_line_id") REFERENCES "public"."business_lines"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
