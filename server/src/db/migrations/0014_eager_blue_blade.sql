CREATE TABLE IF NOT EXISTS "item_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"item_group_type" varchar(50) NOT NULL,
	"inventory_account_id" uuid,
	"cogs_account_id" uuid,
	"purchase_account_id" uuid,
	"revenue_account_id" uuid,
	"default_tax_code_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_inventory_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("inventory_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_cogs_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("cogs_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_purchase_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("purchase_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_revenue_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("revenue_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_default_tax_code_id_tax_codes_id_fk" FOREIGN KEY ("default_tax_code_id") REFERENCES "public"."tax_codes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_tenant_is_active_idx" ON "item_groups" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_tenant_code_idx" ON "item_groups" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_tenant_type_idx" ON "item_groups" USING btree ("tenant_id","item_group_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_inventory_account_idx" ON "item_groups" USING btree ("inventory_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_cogs_account_idx" ON "item_groups" USING btree ("cogs_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_purchase_account_idx" ON "item_groups" USING btree ("purchase_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_revenue_account_idx" ON "item_groups" USING btree ("revenue_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_groups_default_tax_code_idx" ON "item_groups" USING btree ("default_tax_code_id");