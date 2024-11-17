ALTER TABLE "echidna" ALTER COLUMN "activity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "echidna" ALTER COLUMN "activity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "echidna" ALTER COLUMN "activity_type" SET DEFAULT 4;--> statement-breakpoint
ALTER TABLE "echidna" ALTER COLUMN "state" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "echidna" ALTER COLUMN "state" DROP NOT NULL;