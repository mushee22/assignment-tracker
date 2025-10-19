import { Priority } from '@prisma/client';

export const STORAGE_OPTIONS = 'STORAGE_OPTIONS';

export const assignment_reminder_schedules = ['24_HOURS', '48_HOURS', '7_DAYS'];

export const PriorityIndex: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export const deviceTokenTypes = {
  android: 'android',
  ios: 'ios',
  web: 'web',
  none: 'n/a',
};
