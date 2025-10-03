import { DeviceToken, Profile, Reminder, User } from '@prisma/client';

export type UserWithDeviceToken = User & { device_tokens: DeviceToken[] };
export type ReminderWithUser = Reminder & {
  user: UserWithDeviceToken & { profile?: Profile };
};

export type EmailReminders = {
  email: string;
  userId: number;
  reminderId: number;
  data: {
    subject: string;
    body: string;
    name: string;
    url?: string;
    type: string;
    referance_id?: number;
  };
};
