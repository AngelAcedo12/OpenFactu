CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantId" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"action" text NOT NULL,
	"userId" text,
	"oldValue" jsonb,
	"newValue" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_GlobalUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."GlobalUser"("id") ON DELETE no action ON UPDATE no action;
