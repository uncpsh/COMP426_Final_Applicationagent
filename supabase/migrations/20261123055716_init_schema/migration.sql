CREATE TYPE "application_kind" AS ENUM('grad_school', 'internship');--> statement-breakpoint
CREATE TYPE "application_priority" AS ENUM('reach', 'target', 'safety');--> statement-breakpoint
CREATE TYPE "application_status" AS ENUM('researching', 'preparing', 'submitted', 'interviewing', 'offer', 'waitlisted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "document_type" AS ENUM('sop', 'personal_statement', 'cv', 'resume', 'cover_letter', 'writing_sample', 'other');--> statement-breakpoint
CREATE TYPE "letter_status" AS ENUM('planned', 'requested', 'confirmed', 'submitted', 'declined');--> statement-breakpoint
CREATE TABLE "application_documents" (
	"application_id" uuid,
	"document_version_id" uuid,
	"attached_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_pkey" PRIMARY KEY("application_id","document_version_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"kind" "application_kind" NOT NULL,
	"organization" text NOT NULL,
	"position" text NOT NULL,
	"term" text,
	"status" "application_status" DEFAULT 'researching'::"application_status" NOT NULL,
	"priority" "application_priority",
	"deadline_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"portal_url" text,
	"location" text,
	"application_fee_cents" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_fee_non_negative" CHECK ("application_fee_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_document_version_unique" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "document_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" uuid NOT NULL,
	"recommender_id" uuid NOT NULL,
	"status" "letter_status" DEFAULT 'planned'::"letter_status" NOT NULL,
	"requested_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_requests_application_recommender_unique" UNIQUE("application_id","recommender_id")
);
--> statement-breakpoint
CREATE TABLE "recommenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"title" text,
	"organization" text,
	"relationship" text,
	"notes" text,
	"share_token" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"share_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "application_documents_version_idx" ON "application_documents" ("document_version_id");--> statement-breakpoint
CREATE INDEX "applications_user_deadline_idx" ON "applications" ("user_id","deadline_at");--> statement-breakpoint
CREATE INDEX "documents_user_idx" ON "documents" ("user_id");--> statement-breakpoint
CREATE INDEX "recommendation_requests_recommender_idx" ON "recommendation_requests" ("recommender_id");--> statement-breakpoint
CREATE INDEX "recommenders_user_idx" ON "recommenders" ("user_id");--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_version_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recommendation_requests" ADD CONSTRAINT "recommendation_requests_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recommendation_requests" ADD CONSTRAINT "recommendation_requests_recommender_id_recommenders_id_fkey" FOREIGN KEY ("recommender_id") REFERENCES "recommenders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recommenders" ADD CONSTRAINT "recommenders_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;