CREATE TABLE IF NOT EXISTS "dpf_user_custom_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"permission_type" varchar(10) NOT NULL,
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"expires_at" timestamp,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dpf_modules" ADD COLUMN "module_level" varchar(20) DEFAULT 'APP' NOT NULL;--> statement-breakpoint
ALTER TABLE "dpf_permissions" ADD COLUMN "permission_level" varchar(20) DEFAULT 'APP' NOT NULL;--> statement-breakpoint
ALTER TABLE "dpf_roles" ADD COLUMN "role_level" varchar(20) DEFAULT 'APP' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_custom_permissions" ADD CONSTRAINT "dpf_user_custom_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_custom_permissions" ADD CONSTRAINT "dpf_user_custom_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_custom_permissions" ADD CONSTRAINT "dpf_user_custom_permissions_permission_id_dpf_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."dpf_permissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_custom_permissions" ADD CONSTRAINT "dpf_user_custom_permissions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
