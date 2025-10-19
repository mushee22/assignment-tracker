-- CreateTable
CREATE TABLE "assignment_notes" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_notes_assignment_id_idx" ON "assignment_notes"("assignment_id");

-- AddForeignKey
ALTER TABLE "assignment_notes" ADD CONSTRAINT "assignment_notes_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
