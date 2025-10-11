import { Prisma } from '@prisma/client';
import { AssigneFindQuery } from 'src/assignment/dto/assignment.dto';

export function deadlineMinus(due_date: Date, schedule: string) {
  const dueDate = new Date(due_date);
  const [time, unit] = schedule.split(',');
  switch (unit) {
    case 'minutes':
      dueDate.setMinutes(dueDate.getMinutes() - Number(time));
      break;
    case 'hours':
      dueDate.setHours(dueDate.getHours() - Number(time));
      break;
    case 'days':
      dueDate.setDate(dueDate.getDate() - Number(time));
      break;
    case 'weeks':
      dueDate.setDate(dueDate.getDate() - Number(time) * 7);
      break;
    default:
      break;
  }
  return dueDate;
}

export const generateFindWhereQuery = (query: AssigneFindQuery) => {
  const where: Prisma.AssignmentWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.subject_id) {
    where.subject_id = query.subject_id;
  }

  if (query.q) {
    where.OR = [
      {
        title: {
          contains: query.q,
        },
      },
      {
        description: {
          contains: query.q,
        },
      },
    ];
  }

  if (query.start) {
    where.created_at = {
      gte: new Date(query.start),
    };
  }

  if (query.end) {
    where.created_at = {
      lte: new Date(query.end),
    };
  }

  if (query.date) {
    where.created_at = {
      gte: new Date(query.date),
      lte: new Date(query.date + ' 23:59:59'),
    };
  }

  return where;
};
