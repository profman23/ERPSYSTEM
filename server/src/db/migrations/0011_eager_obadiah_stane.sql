CREATE TABLE IF NOT EXISTS "tax_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"tax_type" varchar(20) NOT NULL,
	"rate" numeric(7, 4) DEFAULT '0' NOT NULL,
	"calculation_method" varchar(20) DEFAULT 'PERCENTAGE' NOT NULL,
	"sales_tax_account_id" uuid,
	"purchase_tax_account_id" uuid,
	"effective_from" date,
	"effective_to" date,
	"jurisdiction" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_sales_tax_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("sales_tax_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_purchase_tax_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("purchase_tax_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_codes_tenant_is_active_idx" ON "tax_codes" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tax_codes_tenant_code_idx" ON "tax_codes" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_codes_tenant_tax_type_idx" ON "tax_codes" USING btree ("tenant_id","tax_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_codes_sales_tax_account_idx" ON "tax_codes" USING btree ("sales_tax_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_codes_purchase_tax_account_idx" ON "tax_codes" USING btree ("purchase_tax_account_id");