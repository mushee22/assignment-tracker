import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from './reminder/reminder.service';

@Injectable()
export class TaskService {
  constructor(private readonly reminderService: ReminderService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendPushReminderUsers() {
    try {
      const date = new Date();
      await this.reminderService.sendRemindersToUsers(date);
    } catch (_error) {
      console.log(_error);
    }
  }
}
