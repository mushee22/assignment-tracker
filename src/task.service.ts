import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from './reminder/reminder.service';
import { ReminderSentType } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(private readonly reminderService: ReminderService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendPushReminderUsers() {
    try {
      await this.reminderService.sendRemindersToUsers(ReminderSentType.PUSH);
      await this.reminderService.sendRemindersToUsers(ReminderSentType.EMAIL);
    } catch (error) {
      console.log(error);
    }
  }
}
