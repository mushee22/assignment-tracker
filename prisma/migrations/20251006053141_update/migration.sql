/*
  Warnings:

  - You are about to drop the column `sent_type` on the `reminders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."reminders" DROP COLUMN "sent_type",
ADD COLUMN     "disabled_at" TIMESTAMP(3),
ADD COLUMN     "disabled_reason" TEXT;

-- CreateTable
CREATE TABLE "public"."reminder_send_histories" (
    "id" SERIAL NOT NULL,
    "reminder_id" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3),
    "can_be_sent" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "sent_type" "public"."ReminderSentType",
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_send_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminder_send_histories_reminder_id_idx" ON "public"."reminder_send_histories"("reminder_id");

-- AddForeignKey
ALTER TABLE "public"."reminder_send_histories" ADD CONSTRAINT "reminder_send_histories_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
