import { AssignmentStatus } from '@prisma/client';

export class AssigneFindQuery {
  q?: string;
  status?: AssignmentStatus;
  start?: string;
  end?: string;
  date?: string;
  subject_id?: number;
}
