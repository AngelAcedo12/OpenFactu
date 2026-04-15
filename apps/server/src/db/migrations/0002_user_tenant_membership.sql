CREATE TABLE "UserTenantMembership" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tenantId" text NOT NULL,
	"role" text DEFAULT 'USER' NOT NULL,
	"permissions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserTenantMembership_userId_tenantId_unique" UNIQUE("userId","tenantId")
);
--> statement-breakpoint
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_userId_GlobalUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."GlobalUser"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "UserTenantMembership" ADD CONSTRAINT "UserTenantMembership_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE cascade ON UPDATE no action;
