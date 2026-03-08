CREATE TABLE IF NOT EXISTS "species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ar" varchar(255),
	"description" text,
	"description_ar" text,
	"icon" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "building_number" varchar(50);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "vat_registration_number" varchar(50);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "commercial_registration_number" varchar(100);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "species" ADD CONSTRAINT "species_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
