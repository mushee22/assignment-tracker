import { Priority } from '@prisma/client';

export const STORAGE_OPTIONS = 'STORAGE_OPTIONS';

export const assignment_reminder_schedules = {
  '24_HOURS': '24 hours',
  '48_HOURS': '48 hours',
  '7_DAYS': '7 days',
};

export const PriorityIndex: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};
