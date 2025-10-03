/*
  Warnings:

  - You are about to drop the column `notification_preference` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `assignment_id` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `assignment_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `notification_type` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `assignment_id` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `due_date` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `subject_id` on the `reminders` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."ReminderType" AS ENUM ('CUSTOM', 'AUTO');

-- CreateEnum
CREATE TYPE "public"."ReminderSentType" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- AlterEnum
ALTER TYPE "public"."NotificationStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "public"."attachments" DROP CONSTRAINT "attachments_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_subject_id_fkey";

-- DropIndex
DROP INDEX "public"."attachments_assignment_id_idx";

-- DropIndex
DROP INDEX "public"."notifications_assignment_id_idx";

-- DropIndex
DROP INDEX "public"."reminders_assignment_id_idx";

-- DropIndex
DROP INDEX "public"."reminders_subject_id_idx";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "notification_preference";

-- AlterTable
ALTER TABLE "public"."assignments" ADD COLUMN     "cancelled_resason" TEXT;

-- AlterTable
ALTER TABLE "public"."attachments" DROP COLUMN "assignment_id",
ADD COLUMN     "reference_id" INTEGER,
ADD COLUMN     "reference_model" TEXT;

-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "assignment_id",
DROP COLUMN "notification_type",
ADD COLUMN     "reference_id" INTEGER,
ADD COLUMN     "reference_model" TEXT;

-- AlterTable
ALTER TABLE "public"."reminders" DROP COLUMN "assignment_id",
DROP COLUMN "due_date",
DROP COLUMN "subject_id",
ADD COLUMN     "reference_id" INTEGER,
ADD COLUMN     "reference_model" TEXT,
ADD COLUMN     "reminder_at" TIMESTAMP(3),
ADD COLUMN     "sent_type" "public"."ReminderSentType",
ADD COLUMN     "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "type" "public"."ReminderType";

-- CreateTable
CREATE TABLE "public"."profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profile_picture" TEXT,
    "notification_preference" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "public"."profiles"("user_id");

-- CreateIndex
CREATE INDEX "attachments_reference_id_idx" ON "public"."attachments"("reference_id");

-- CreateIndex
CREATE INDEX "attachments_reference_model_idx" ON "public"."attachments"("reference_model");

-- CreateIndex
CREATE INDEX "notifications_reference_id_idx" ON "public"."notifications"("reference_id");

-- CreateIndex
CREATE INDEX "notifications_reference_model_idx" ON "public"."notifications"("reference_model");

-- CreateIndex
CREATE INDEX "reminders_reference_id_idx" ON "public"."reminders"("reference_id");

-- CreateIndex
CREATE INDEX "reminders_reference_model_idx" ON "public"."reminders"("reference_model");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
