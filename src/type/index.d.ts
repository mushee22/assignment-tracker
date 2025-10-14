import {
  Assignment,
  DeviceToken,
  NotificationType,
  Profile,
  Reminder,
  ReminderSentType,
  User,
} from '@prisma/client';

import admin from 'firebase-admin';

export type UserWithDeviceToken = User & { device_tokens: DeviceToken[] };
export type ReminderWithUser = Reminder & {
  user: UserWithDeviceToken & { profile?: Profile };
};

export type EmailReminders = {
  email: string;
  userId: number;
  id: number;
  data: {
    subject: string;
    body: string;
    name: string;
    url?: string;
    type: string;
    referance_id?: number;
  };
};

export type NotificationData = {
  title: string;
  body?: string;
  url?: string;
  type?: NotificationType;
  id?: number;
  referance_id?: number;
};

export type FirebaseMessage = {
  token: string;
} & admin.messaging.Message;

export type AssignmentWithUser = Assignment & {
  user: User;
};

export type ReminderUnsendHistoryData = {
  sent_type: ReminderSentType;
  reason?: string;
  data?: string;
};
