-- DropForeignKey
ALTER TABLE "public"."assignments" DROP CONSTRAINT "assignments_subject_id_fkey";

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET DEFAULT ON UPDATE CASCADE;
