CREATE TYPE "public"."compliance_event_type" AS ENUM('DATA_ACCESS', 'DATA_MODIFICATION', 'SECURITY_VIOLATION', 'POLICY_VIOLATION', 'AUDIT_TRAIL');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"event_type" varchar NOT NULL,
	"user_id" varchar,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "compliance_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"event_type" "compliance_event_type" NOT NULL,
	"user_id" varchar,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"severity" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "self_healing_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"action_type" varchar NOT NULL,
	"status" varchar NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"metric_type" varchar NOT NULL,
	"value" varchar NOT NULL,
	"tags" jsonb
);
