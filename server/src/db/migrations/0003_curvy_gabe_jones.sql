CREATE TABLE IF NOT EXISTS "dpf_user_role_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_role_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_role_branch" UNIQUE("user_role_id","branch_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_role_branches" ADD CONSTRAINT "dpf_user_role_branches_user_role_id_dpf_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."dpf_user_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_role_branches" ADD CONSTRAINT "dpf_user_role_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dpf_user_role_branches" ADD CONSTRAINT "dpf_user_role_branches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dpf_user_role_branches_user_role" ON "dpf_user_role_branches" USING btree ("user_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dpf_user_role_branches_branch" ON "dpf_user_role_branches" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dpf_user_role_branches_tenant_user_role" ON "dpf_user_role_branches" USING btree ("tenant_id","user_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dpf_user_role_branches_full" ON "dpf_user_role_branches" USING btree ("tenant_id","user_role_id","branch_id");