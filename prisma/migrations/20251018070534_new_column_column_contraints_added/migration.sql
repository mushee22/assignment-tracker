-- DropForeignKey
ALTER TABLE "public"."assignment_members" DROP CONSTRAINT "assignment_members_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."assignment_members" DROP CONSTRAINT "assignment_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."assignment_notes" DROP CONSTRAINT "assignment_notes_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."assignments" DROP CONSTRAINT "assignments_subject_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."assignments" DROP CONSTRAINT "assignments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."device_tokens" DROP CONSTRAINT "device_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notification_settings" DROP CONSTRAINT "notification_settings_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notification_settings" DROP CONSTRAINT "notification_settings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."otps" DROP CONSTRAINT "otps_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminder_send_histories" DROP CONSTRAINT "reminder_send_histories_reminder_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reminders" DROP CONSTRAINT "reminders_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."subjects" DROP CONSTRAINT "subjects_user_id_fkey";

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_notes" ADD CONSTRAINT "assignment_notes_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_send_histories" ADD CONSTRAINT "reminder_send_histories_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_members" ADD CONSTRAINT "assignment_members_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_members" ADD CONSTRAINT "assignment_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
