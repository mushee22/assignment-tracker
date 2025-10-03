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
} from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';
import { deadlineMinus } from 'src/lib/helper';
import { EmailReminders, ReminderWithUser } from 'src/type';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ReminderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
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
      const notificationPreference = user.profile
        ?.notification_preference as Prisma.JsonObject;

      if (notificationPreference?.email_notification) {
        reminders.push({
          reminder_at: reminderCreateDto.due_date,
          title: reminderCreateDto.title,
          message: reminderCreateDto.message,
          reference_id: reminderCreateDto.reference_id,
          reference_model: reminderCreateDto.reference_model,
          status: ReminderStatus['PENDING'],
          user_id: user.id,
          notification_type: NotificationType.OTHER,
          sent_type: ReminderSentType.EMAIL,
        });
      }

      if (notificationPreference?.push_notification) {
        reminders.push({
          reminder_at: reminderCreateDto.due_date,
          title: reminderCreateDto.title,
          message: reminderCreateDto.message,
          reference_id: reminderCreateDto.reference_id,
          reference_model: reminderCreateDto.reference_model,
          status: ReminderStatus['PENDING'],
          user_id: userId,
          notification_type: NotificationType.OTHER,
          sent_type: ReminderSentType.PUSH,
        });
      }

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

  async deleteAssignmentReminder(userId: number, assignmentId: number) {
    try {
      await this.prismaService.reminder.deleteMany({
        where: {
          reference_id: assignmentId,
          reference_model: Prisma.ModelName.Assignment,
          user_id: userId,
          notification_type: NotificationType.ASSIGNMENT,
          status: ReminderStatus['PENDING'],
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

        if (reminderAt < new Date()) {
          continue;
        }

        const reminder = {
          reminder_at: reminderAt.toISOString(),
          title: `Reminder for ${assignment.title}`,
          message: `You have an assignment due on ${assignment?.due_date?.toDateString()}`,
          reference_id: assignment.id,
          reference_model: 'Assignment',
          status: ReminderStatus['PENDING'],
          user_id: userId,
          notification_type: NotificationType.ASSIGNMENT,
        };

        if (notification_preference.email_notification) {
          const emailReminder = {
            ...reminder,
            sent_type: ReminderSentType.EMAIL,
          };
          reminders.push(emailReminder);
        }

        if (notification_preference.push_notification) {
          const pushReminder = {
            ...reminder,
            sent_type: ReminderSentType.EMAIL,
          };
          reminders.push(pushReminder);
        }
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

  private async getAllAssignmentRemindersTosend(date: Date) {
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

  private async getAllOtherRemindersTosend(date: Date) {
    return await this.prismaService.reminder.findMany({
      where: {
        reminder_at: {
          lte: date,
        },
        status: ReminderStatus['PENDING'],
        reference_model: {
          not: Prisma.ModelName.Assignment,
        },
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

  private setAssigmentRemindersToSendEmail(reminders: ReminderWithUser[]) {
    const emailReminders: EmailReminders[] = [];
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
      const email_notification =
        notification_preference.email_notification as boolean;
      const assignment_notification =
        notification_preference.assignment_notification as boolean;
      if (!email_notification || !assignment_notification) {
        continue;
      }
      emailReminders.push({
        email: user.email,
        userId: user.id,
        reminderId: reminder.id,
        data: {
          subject: `Reminder for ${reminder.title}`,
          body: reminder.message!,
          name: user.name,
          type: NotificationType.ASSIGNMENT,
          referance_id: reminder.reference_id ?? undefined,
        },
      });
    }
    return emailReminders;
  }

  private setOtherRemindersToSendEmail(reminders: ReminderWithUser[]) {
    const emailReminders: EmailReminders[] = [];
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
      const email_notification =
        notification_preference.email_notification as boolean;
      const assignment_notification =
        notification_preference.assignment_notification as boolean;
      if (!email_notification || !assignment_notification) {
        continue;
      }
      emailReminders.push({
        email: user.email,
        userId: user.id,
        reminderId: reminder.id,
        data: {
          subject: `Reminder for ${reminder.title}`,
          body: reminder.message!,
          name: user.name,
          type: NotificationType.OTHER,
          referance_id: reminder.reference_id ?? undefined,
        },
      });
    }
    return emailReminders;
  }

  private async sendReminderToEmail(reminders?: EmailReminders[]) {
    if (!reminders || reminders.length === 0) {
      return [];
    }
    try {
      const reminderIdsMarkAsCompleted: number[] = [];
      for (const reminder of reminders) {
        await this.mailerService.sendMail(reminder.data);
        reminderIdsMarkAsCompleted.push(reminder.reminderId);
      }
      return reminderIdsMarkAsCompleted;
    } catch (_error) {
      throw new HttpException(
        'somthing went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendRemindersToUers() {
    try {
      const date = new Date();
      const assignmentRemindersToSend =
        await this.getAllAssignmentRemindersTosend(date);
      const otherRemindersToSend = await this.getAllOtherRemindersTosend(date);

      const assignmentEmailReminders = this.setAssigmentRemindersToSendEmail(
        assignmentRemindersToSend as ReminderWithUser[],
      );

      const otherEmailReminders = this.setOtherRemindersToSendEmail(
        otherRemindersToSend as ReminderWithUser[],
      );

      const reminderIdsSendToMail = await this.sendReminderToEmail([
        ...(assignmentEmailReminders ?? []),
        ...(otherEmailReminders ?? []),
      ]);
      console.log(reminderIdsSendToMail);
    } catch (error) {
      console.log(error);
    }
  }
}
