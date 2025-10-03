-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('ASSIGNMENT', 'REMINDER', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('READ', 'UN_READ', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."StorageType" AS ENUM ('S3_BUCKET', 'LOCAL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "hashed_password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "notification_preference" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subjects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "priority" "public"."Priority" NOT NULL DEFAULT 'LOW',
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "overdue_date" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification_settings" (
    "id" SERIAL NOT NULL,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER NOT NULL,
    "assignment_id" INTEGER,
    "offset_minute" INTEGER NOT NULL,
    "message_template" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notification_status" "public"."NotificationStatus" NOT NULL DEFAULT 'UN_READ',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UN_READ',
    "data" JSONB,
    "user_id" INTEGER NOT NULL,
    "assignment_id" INTEGER,
    "notification_type" "public"."NotificationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminders" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "notification_type" "public"."NotificationType" NOT NULL,
    "due_date" TIMESTAMP(3),
    "notification_status" "public"."NotificationStatus" NOT NULL DEFAULT 'UN_READ',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "user_id" INTEGER NOT NULL,
    "assignment_id" INTEGER,
    "subject_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_type" "public"."StorageType" NOT NULL,
    "storage_path" TEXT,
    "storage_key" TEXT,
    "assignment_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "device_id" TEXT,
    "device_model" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "device_token_id" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."otps" (
    "id" SERIAL NOT NULL,
    "otp" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE INDEX "subjects_user_id_idx" ON "public"."subjects"("user_id");

-- CreateIndex
CREATE INDEX "assignments_subject_id_idx" ON "public"."assignments"("subject_id");

-- CreateIndex
CREATE INDEX "assignments_user_id_idx" ON "public"."assignments"("user_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "public"."assignments"("status");

-- CreateIndex
CREATE INDEX "notification_settings_user_id_is_global_idx" ON "public"."notification_settings"("user_id", "is_global");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_assignment_id_idx" ON "public"."notifications"("assignment_id");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "public"."reminders"("user_id");

-- CreateIndex
CREATE INDEX "reminders_assignment_id_idx" ON "public"."reminders"("assignment_id");

-- CreateIndex
CREATE INDEX "reminders_subject_id_idx" ON "public"."reminders"("subject_id");

-- CreateIndex
CREATE INDEX "attachments_assignment_id_idx" ON "public"."attachments"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "public"."device_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_device_id_key" ON "public"."device_tokens"("device_id");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "public"."device_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "public"."user_sessions"("session_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_device_token_id_idx" ON "public"."user_sessions"("user_id", "device_token_id");

-- CreateIndex
CREATE INDEX "otps_user_id_idx" ON "public"."otps"("user_id");

-- AddForeignKey
ALTER TABLE "public"."subjects" ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminders" ADD CONSTRAINT "reminders_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_device_token_id_fkey" FOREIGN KEY ("device_token_id") REFERENCES "public"."device_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
