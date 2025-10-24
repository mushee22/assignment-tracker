import { Prisma } from '@prisma/client';
import { AssigneFindQuery } from 'src/assignment/dto/assignment.dto';

export function deadlineMinus(due_date: Date, schedule: string) {
  const dueDate = new Date(due_date);
  const [time, unit] = schedule.split('_');
  switch (unit) {
    case 'MINUTES':
      dueDate.setMinutes(dueDate.getMinutes() - Number(time));
      break;
    case 'HOURS':
      dueDate.setHours(dueDate.getHours() - Number(time));
      break;
    case 'DAYS':
      dueDate.setDate(dueDate.getDate() - Number(time));
      break;
    case 'WEEKS':
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
      {
        notes: {
          some: {
            content: {
              contains: query.q,
            },
          },
        },
      },
    ];
  }

  if (query.priority) {
    where.priority = query.priority;
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

export const generateFindOrderByQuery = (query: AssigneFindQuery) => {
  const orderBy: Prisma.AssignmentOrderByWithRelationInput = {};
  let sort = query.sort || 'id:desc';

  if (typeof sort === 'string') {
    sort = [sort];
  }

  sort.forEach((item) => {
    const relations = item.split('.');
    if (relations.length === 1) {
      const [field, direction] = relations[0].split(':');
      orderBy[field] = direction || 'desc';
      return orderBy;
    }
    orderBy[relations[0]] = {
      [relations[1].split(':')[0]]: relations[1].split(':')[1] || 'desc',
    };
  });

  return orderBy;
};
