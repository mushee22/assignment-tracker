-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "assignment_id" INTEGER;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
