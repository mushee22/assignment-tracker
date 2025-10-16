import { AssignmentStatus, Priority } from '@prisma/client';

export class AssigneFindQuery {
  q?: string;
  status?: AssignmentStatus;
  priority?: Priority;
  start?: string;
  end?: string;
  date?: string;
  subject_id?: number;
  page?: number;
  page_size?: number;
  cursor?: number;
  sort?: string | string[];
}
