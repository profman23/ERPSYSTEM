ALTER TABLE "warehouses" ADD COLUMN "inventory_account_id" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "cogs_account_id" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "price_difference_account_id" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "revenue_account_id" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "expense_account_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_inventory_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("inventory_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_cogs_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("cogs_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_price_difference_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("price_difference_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_revenue_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("revenue_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_expense_account_id_chart_of_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_inventory_account_idx" ON "warehouses" USING btree ("inventory_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_cogs_account_idx" ON "warehouses" USING btree ("cogs_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_price_diff_account_idx" ON "warehouses" USING btree ("price_difference_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_revenue_account_idx" ON "warehouses" USING btree ("revenue_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_expense_account_idx" ON "warehouses" USING btree ("expense_account_id");