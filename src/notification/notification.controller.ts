import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthUser } from 'src/users/auth-user.decorator';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/')
  async getNotifications(@AuthUser('id') userId: number) {
    const notifications =
      await this.notificationService.getUserNotifications(userId);
    return [notifications, 'Notifications fetched successfully'];
  }

  @Get('/unread-count')
  async getNotificationCount(@AuthUser('id') userId: number) {
    const count =
      await this.notificationService.getUnreadNotificationCount(userId);
    return [count, 'Notification count fetched successfully'];
  }

  @Post('/mark-as-read/')
  async markAsRead(
    @AuthUser('id') userId: number,
    @Body('ids') notificationIds: number[],
  ) {
    await this.notificationService.markAsManyRead(userId, notificationIds);
    return ['Notifications marked as read successfully'];
  }

  @Post('/mark-all-as-read')
  async markAllAsRead(@AuthUser('id') userId: number) {
    await this.notificationService.markAllAsRead(userId);
    return ['All notifications marked as read successfully'];
  }

  @Delete('/delete')
  async deleteNotification(
    @AuthUser('id') userId: number,
    @Body('ids') notificationIds: number[],
  ) {
    await this.notificationService.deleteMany(userId, notificationIds);
    return ['Notifications deleted successfully'];
  }
}
