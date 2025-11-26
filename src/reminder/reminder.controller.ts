import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderStatus } from '@prisma/client';
import { AuthUser } from 'src/users/auth-user.decorator';
import { ReminderCreateDto } from './dto/reminder-create-dto';

@Controller('reminder')
export class ReminderController {
  constructor(private reminderService: ReminderService) {}

  @Get('/')
  async getReminders(
    @AuthUser('id') userId: number,
    @Query('status') status?: ReminderStatus,
  ) {
    const reminders = await this.reminderService.getReminders(userId, status);
    return [reminders, 'Reminders fetched successfully'];
  }

  @Get('test-reminder-email')
  async testReminderEmail() {
    const now = new Date();
    const remindersCout = await this.reminderService.sendRemindersToUsers(now);
    return [remindersCout, 'Reminders sent successfully'];
  }

  @Get('/:id')
  async getReminder(@AuthUser('id') userId: number, @Param('id') id: number) {
    const reminder = await this.reminderService.findeReminderById(userId, id);
    return [reminder, 'Reminder fetched successfully'];
  }

  @Post('/')
  async createReminder(
    @AuthUser('id') userId: number,
    @Body() createReminderDto: ReminderCreateDto,
  ) {
    const reminder = await this.reminderService.createReminder(
      userId,
      createReminderDto,
    );
    return [reminder, 'Reminder created successfully'];
  }

  @Put('/:id/update-status')
  async updateReminderStatus(
    @AuthUser('id') userId: number,
    @Param('id') id: number,
    @Body('status') status: ReminderStatus,
  ) {
    const reminder = await this.reminderService.updateReminderStatus(
      userId,
      id,
      status,
    );
    return [reminder, 'Reminder status updated successfully'];
  }

  @Delete('/:id')
  async deleteReminder(
    @AuthUser('id') userId: number,
    @Param('id') id: number,
  ) {
    const reminder = await this.reminderService.deleteReminder(userId, id);
    return [reminder, 'Reminder deleted successfully'];
  }
}
