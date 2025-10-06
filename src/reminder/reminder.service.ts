import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReminderCreateDto } from './dto/reminder-create-dto';
import {
  ReminderStatus,
  NotificationType,
  Prisma,
  AssignmentStatus,
  ReminderSentType,
  ReminderType,
} from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { deadlineMinus } from 'src/lib/helper';
import { EmailReminders, NotificationData, ReminderWithUser } from 'src/type';
import { UsersService } from 'src/users/users.service';
import { FirebaseService } from 'src/common/firebase.service';
import { ExpoService } from 'src/common/expo.service';
import { DeviceToken } from 'generated/prisma';
import { AssignmentProvider } from 'src/common/assignment.provider';

@Injectable()
export class ReminderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly fcmService: FirebaseService,
    private readonly expoService: ExpoService,
    private readonly assignmentProvider: AssignmentProvider,
  ) {}

  private async insertDataToReminder(data: Prisma.ReminderCreateManyInput[]) {
    try {
      const reminders = await this.prismaService.reminder.createMany({
        data,
      });
      return reminders;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createReminder(userId: number, reminderCreateDto: ReminderCreateDto) {
    try {
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new HttpException('user not found', HttpStatus.NOT_FOUND);
      }
      const reminders: Prisma.ReminderCreateManyInput[] = [];
      reminders.push({
        reminder_at: reminderCreateDto.due_date,
        title: reminderCreateDto.title,
        message: reminderCreateDto.message,
        reference_id: reminderCreateDto.reference_id,
        reference_model: reminderCreateDto.reference_model,
        status: ReminderStatus['PENDING'],
        user_id: user.id,
        notification_type: NotificationType.OTHER,
        type: 'CUSTOM',
        //   sent_type: ReminderSentType.EMAIL,
      });

      const reminder = await this.insertDataToReminder(reminders);
      return reminder;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findeReminderById(userid: number, reminderId: number) {
    try {
      const reminder = await this.prismaService.reminder.findFirst({
        where: {
          id: reminderId,
          user_id: userid,
        },
      });
      if (!reminder) {
        throw new HttpException('reminder not found', HttpStatus.NOT_FOUND);
      }
      return reminder;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getReminders(userId: number, status?: ReminderStatus) {
    try {
      const reminders = await this.prismaService.reminder.findMany({
        where: {
          user_id: userId,
          status,
        },
      });
      return reminders;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateReminderStatus(
    userId: number,
    reminderId: number,
    status: ReminderStatus,
  ) {
    try {
      const reminder = await this.prismaService.reminder.update({
        where: {
          id: reminderId,
          user_id: userId,
        },
        data: {
          status,
        },
      });
      return reminder;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteReminder(userId: number, reminderId: number) {
    try {
      const reminder = await this.prismaService.reminder.delete({
        where: {
          id: reminderId,
          user_id: userId,
        },
      });
      return reminder;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteAssignmentReminder(
    userId: number,
    assignmentId: number,
    type: ReminderType[] = ['AUTO'],
  ) {
    try {
      await this.prismaService.reminder.deleteMany({
        where: {
          reference_id: assignmentId,
          reference_model: Prisma.ModelName.Assignment,
          user_id: userId,
          notification_type: NotificationType.ASSIGNMENT,
          status: ReminderStatus['PENDING'],
          type: {
            in: type,
          },
        },
      });
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async disableAssignmentReminder(userId: number, assignmentIds: number) {
    try {
      await this.prismaService.reminder.updateMany({
        where: {
          user_id: userId,
          reference_id: assignmentIds,
          reference_model: Prisma.ModelName.Assignment,
          type: 'AUTO',
        },
        data: {
          status: ReminderStatus.DISABLED,
        },
      });
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async markRemindersAsSent(reminderIds: number[]) {
    try {
      await this.prismaService.reminder.updateMany({
        where: {
          id: {
            in: reminderIds,
          },
        },
        data: {
          status: ReminderStatus.SENT,
        },
      });
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createAssignmentReminder(userId: number, assignmentId: number) {
    try {
      const assignment = await this.prismaService.assignment.findFirst({
        where: {
          id: assignmentId,
          user_id: userId,
        },
        include: {
          subject: true,
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new HttpException('assignment not found', HttpStatus.NOT_FOUND);
      }

      if (
        assignment.status === AssignmentStatus.COMPLETED ||
        assignment.status === AssignmentStatus.CANCELLED
      ) {
        await this.disableAssignmentReminder(userId, assignment.id);
        return;
      }

      const user = assignment.user;

      const reminders: Prisma.ReminderCreateManyInput[] = [];
      const notification_preference = user.profile
        ?.notification_preference as Prisma.JsonObject;

      if (!notification_preference.assignment_reminder) {
        return reminders;
      }

      const schedules =
        notification_preference.reminder_schedules as Prisma.JsonObject;

      if (!schedules) {
        return reminders;
      }

      for (const schedule in schedules) {
        if (!schedules[schedule]) {
          continue;
        }

        const reminderAt = deadlineMinus(
          assignment.due_date!,
          schedules[schedule] as string,
        );

        const reminder: Prisma.ReminderCreateManyInput = {
          reminder_at: reminderAt.toISOString(),
          title: `Reminder for ${assignment.title}`,
          message: `You have an assignment due on ${assignment?.due_date?.toDateString()}`,
          reference_id: assignment.id,
          reference_model: 'Assignment',
          status: ReminderStatus['PENDING'],
          user_id: userId,
          notification_type: NotificationType.ASSIGNMENT,
          type: 'AUTO',
        };

        if (reminderAt < new Date()) {
          reminder.status = ReminderStatus.DISABLED;
          reminder.disabled_at = new Date();
          reminder.disabled_reason =
            'Reminder is disabled because the due date has passed';
        }

        reminders.push(reminder);
      }

      await this.insertDataToReminder(reminders);
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAssignmentReminder(userId: number, assignmentId: number) {
    try {
      await this.deleteAssignmentReminder(userId, assignmentId);
      await this.createAssignmentReminder(userId, assignmentId);
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reValidateUserAssignmentReminders(userId: number) {
    try {
      const userAssignments = await this.prismaService.assignment.findMany({
        where: {
          user_id: userId,
        },
        select: {
          id: true,
        },
      });

      for (const assignment of userAssignments) {
        await this.updateAssignmentReminder(userId, assignment.id);
      }
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAssignmentReminders(
    userId: number,
    assignmentId: number,
    status?: ReminderStatus,
  ) {
    try {
      const reminders = await this.prismaService.reminder.findMany({
        where: {
          reference_id: assignmentId,
          reference_model: Prisma.ModelName.Assignment,
          user_id: userId,
          notification_type: NotificationType.ASSIGNMENT,
          ...(status
            ? {
                status: ReminderStatus[status],
              }
            : {}),
        },
      });
      return reminders;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getRemindersToNotifyUser(date: Date) {
    return await this.prismaService.reminder.findMany({
      where: {
        reminder_at: {
          lte: date,
        },
        status: ReminderStatus['PENDING'],
        reference_model: Prisma.ModelName.Assignment,
      },
      include: {
        user: {
          include: {
            profile: true,
            device_tokens: {
              where: {
                is_active: true,
              },
            },
          },
        },
      },
    });
  }

  private setMessageData(
    reminder: ReminderWithUser,
    sentType: ReminderSentType,
  ) {
    const user = reminder.user;
    if (sentType === ReminderSentType.PUSH) {
      return {
        title: reminder.title,
        body: reminder.message!,
        type: reminder.notification_type,
        referance_id: reminder.reference_id ?? undefined,
        id: reminder.id,
      };
    }
    return {
      email: user.email,
      userId: user.id,
      id: reminder.id,
      data: {
        subject: `Reminder for ${reminder.title}`,
        body: reminder.message!,
        name: user.name,
        type: reminder.notification_type,
        referance_id: reminder.reference_id ?? undefined,
      },
    };
  }

  private async setReminderMessagesToSendEmail(reminders: ReminderWithUser[]) {
    const emailReminderMessages: EmailReminders[] = [];
    if (reminders.length === 0) {
      return;
    }
    for (const reminder of reminders) {
      const user = reminder.user;
      const profile = user.profile;
      if (!profile) {
        continue;
      }
      const notification_preference =
        profile.notification_preference as Prisma.JsonObject;
      const isEmailNotification =
        notification_preference.email_notification as boolean;
      const isAssignmentNotification =
        notification_preference.assignment_notification as boolean;

      if (!isEmailNotification) {
        continue;
      }

      if (
        reminder.notification_type == NotificationType.ASSIGNMENT &&
        !isAssignmentNotification
      ) {
        continue;
      }

      if (reminder.notification_type == NotificationType.ASSIGNMENT) {
        const assignment = await this.assignmentProvider.findOne(
          reminder.user_id,
          reminder.reference_id!,
        );
        if (!assignment || !assignment.is_email_notification) {
          continue;
        }
      }

      if (isEmailNotification) {
        const message = this.setMessageData(reminder, ReminderSentType.EMAIL);
        emailReminderMessages.push(message as EmailReminders);
      }
    }
    return emailReminderMessages;
  }

  private async sendReminderToEmail(reminders?: EmailReminders[]) {
    if (!reminders || reminders.length === 0) {
      return [];
    }
    try {
      const reminderIdsMarkAsCompleted: number[] = [];
      for (const reminder of reminders) {
        await this.mailerService.sendMail(reminder.data);
        reminderIdsMarkAsCompleted.push(reminder.id);
      }
      return reminderIdsMarkAsCompleted;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private setNotifcationMessageForDevices(
    devices: DeviceToken[],
    reminder: ReminderWithUser,
  ) {
    const firabasePushNotificationMessage: Map<string, NotificationData> =
      new Map();
    const expoPushNotificationMessageTo: Map<string, NotificationData> =
      new Map();
    for (const deviceToken of devices) {
      const message = {
        title: reminder.title,
        body: reminder.message!,
        id: reminder.id,
        type: reminder.notification_type,
        reference_id: reminder.reference_id ?? undefined,
      };
      if (deviceToken.device_model === 'android') {
        firabasePushNotificationMessage.set(deviceToken.token, message);
      }
      if (deviceToken.device_model === 'ios') {
        expoPushNotificationMessageTo.set(deviceToken.token, message);
      }
    }
    return {
      firabasePushNotificationMessage,
      expoPushNotificationMessageTo,
    };
  }

  private async setReminderMessagesToSendPush(reminders: ReminderWithUser[]) {
    const firabasePushNotificationMessage: Map<string, NotificationData> =
      new Map();
    const expoPushNotificationMessageTo: Map<string, NotificationData> =
      new Map();
    if (reminders.length === 0) {
      return {
        firabasePushNotificationMessage,
        expoPushNotificationMessageTo,
      };
    }
    for (const reminder of reminders) {
      const user = reminder.user;
      const profile = user.profile;
      if (!profile) {
        continue;
      }
      const notification_preference =
        profile.notification_preference as Prisma.JsonObject;
      const isPushNotification =
        notification_preference.push_notification as boolean;

      const isAssignmentNotification =
        notification_preference.assignment_notification as boolean;

      if (!isPushNotification) {
        continue;
      }

      if (
        reminder.notification_type == NotificationType.ASSIGNMENT &&
        !isAssignmentNotification
      ) {
        continue;
      }

      if (reminder.notification_type == NotificationType.ASSIGNMENT) {
        const assignment = await this.assignmentProvider.findOne(
          reminder.user_id,
          reminder.reference_id!,
        );
        if (!assignment || !assignment.is_push_notification) {
          continue;
        }
      }

      if (user.device_tokens.length) {
        const {
          firabasePushNotificationMessage,
          expoPushNotificationMessageTo,
        } = this.setNotifcationMessageForDevices(user.device_tokens, reminder);
        firabasePushNotificationMessage.forEach((value, key) => {
          firabasePushNotificationMessage.set(key, value);
        });
        expoPushNotificationMessageTo.forEach((value, key) => {
          expoPushNotificationMessageTo.set(key, value);
        });
      }
    }
    return {
      firabasePushNotificationMessage,
      expoPushNotificationMessageTo,
    };
  }

  private async sendReminderToPushNotification(
    iosNotficationData: Map<string, NotificationData>,
    androidNotficationData: Map<string, NotificationData>,
  ) {
    if (!iosNotficationData || iosNotficationData.size === 0) {
      return [];
    }
    try {
      const invalidTokens: string[] = [];
      if (androidNotficationData.size > 0) {
        const invalidAndoidTokens = await this.fcmService.sendPushNotification(
          androidNotficationData,
        );
        if (invalidAndoidTokens) {
          invalidTokens.push(...invalidAndoidTokens);
        }
      }
      if (iosNotficationData.size > 0) {
        const { inValidTokens: invalidIosTokens } =
          await this.expoService.sendPushNotification(iosNotficationData);
        if (invalidIosTokens) {
          invalidTokens.push(...invalidIosTokens);
        }
      }

      return invalidTokens;
    } catch (_error) {
      throw new Error('somthing went wrong');
    }
  }

  private async sendPushRemindersToUers() {
    try {
      const date = new Date();
      const remindersToNotifyUsers = await this.getRemindersToNotifyUser(date);
      const { firabasePushNotificationMessage, expoPushNotificationMessageTo } =
        await this.setReminderMessagesToSendPush(
          remindersToNotifyUsers as ReminderWithUser[],
        );
      const invalidTokens = await this.sendReminderToPushNotification(
        expoPushNotificationMessageTo,
        firabasePushNotificationMessage,
      );
      const reminderIdsMarkAsCompleted: number[] = remindersToNotifyUsers.map(
        (reminder) => reminder.id,
      );
      await this.markRemindersAsSent(reminderIdsMarkAsCompleted);
      if (invalidTokens.length) {
        await this.userService.invalidateTokens(invalidTokens);
      }
    } catch (_error) {
      throw new Error('somthing went wrong');
    }
  }

  private async sendEmialRemindersToUers() {
    try {
      const date = new Date();
      const remindersToNotifyUsers = await this.getRemindersToNotifyUser(date);

      const emailReminderMessages = await this.setReminderMessagesToSendEmail(
        remindersToNotifyUsers as ReminderWithUser[],
      );

      const reminderIdsSendToMail = await this.sendReminderToEmail(
        emailReminderMessages,
      );

      console.log(reminderIdsSendToMail);
    } catch (error) {
      console.log(error);
    }
  }

  async sendRemindersToUsers(type: ReminderSentType) {
    if (type === ReminderSentType.PUSH) {
      await this.sendPushRemindersToUers();
    } else if (type === ReminderSentType.EMAIL) {
      await this.sendEmialRemindersToUers();
    }
  }
}
