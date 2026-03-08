CREATE TABLE IF NOT EXISTS "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"account_type" varchar(20) NOT NULL,
	"normal_balance" varchar(10) NOT NULL,
	"is_postable" boolean DEFAULT false NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"path" varchar(500) NOT NULL,
	"currency" varchar(3),
	"is_cash_account" boolean DEFAULT false NOT NULL,
	"is_bank_account" boolean DEFAULT false NOT NULL,
	"is_system_account" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_chart_of_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coa_tenant_is_active_idx" ON "chart_of_accounts" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coa_tenant_code_idx" ON "chart_of_accounts" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coa_parent_id_idx" ON "chart_of_accounts" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coa_tenant_type_idx" ON "chart_of_accounts" USING btree ("tenant_id","account_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coa_tenant_path_idx" ON "chart_of_accounts" USING btree ("tenant_id","path");