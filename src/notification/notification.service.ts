import { Injectable } from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserNotifications(userId: number) {
    const notifications = await this.prismaService.notification.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return notifications;
  }

  async getUnreadNotificationCount(userId: number) {
    const count = await this.prismaService.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
    return count;
  }

  async saveNotificationsToDB(
    notifications: Prisma.NotificationCreateManyInput[],
  ) {
    await this.prismaService.notification.createMany({
      data: notifications,
    });
  }

  async markAsRead(userId: number, id: number) {
    const result = await this.prismaService.notification.update({
      where: {
        id,
        user_id: userId,
      },
      data: {
        is_read: true,
        status: NotificationStatus.READ,
      },
    });
    return result;
  }

  async markAllAsRead(user_id: number) {
    const ids = await this.prismaService.notification.findMany({
      where: {
        user_id,
        is_read: false,
      },
      select: {
        id: true,
      },
    });
    const notificationIds = ids.map((item) => item.id);
    const result = await this.markAsManyRead(user_id, notificationIds);
    return result;
  }

  async markAsManyRead(userId: number, notificationIds: number[]) {
    const result = await this.prismaService.notification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
        user_id: userId,
      },
      data: {
        is_read: true,
        status: NotificationStatus.READ,
      },
    });
    return result;
  }

  async deleteMany(userId: number, notificationIds: number[]) {
    const result = await this.prismaService.notification.deleteMany({
      where: {
        id: {
          in: notificationIds,
        },
        user_id: userId,
      },
    });
    return result;
  }
}
