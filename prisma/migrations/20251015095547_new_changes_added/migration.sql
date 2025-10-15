-- CreateEnum
CREATE TYPE "SocialLoginType" AS ENUM ('GOOGLE', 'APPLE');

-- DropIndex
DROP INDEX "public"."User_phone_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "social_login_data" TEXT,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "hashed_password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "is_email_notification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_push_notification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority_index" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "assignment_members" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "guest_access_token" TEXT,
    "guest_access_token_expires_at" TIMESTAMP(3),
    "is_accepted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_members_assignment_id_idx" ON "assignment_members"("assignment_id");

-- CreateIndex
CREATE INDEX "assignment_members_user_id_idx" ON "assignment_members"("user_id");

-- AddForeignKey
ALTER TABLE "assignment_members" ADD CONSTRAINT "assignment_members_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_members" ADD CONSTRAINT "assignment_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
