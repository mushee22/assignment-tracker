import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserProvider {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserWithPassword(id?: number, email?: string) {
    return await this.prismaService.user.findFirst({
      where: {
        OR: [{ id }, { email }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        hashed_password: true,
        profile: true,
        is_active: true,
        is_verified: true,
        social_login_data: true,
      },
    });
  }

  async findOneById(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email,
      },
      include: {
        profile: true,
      },
    });
    return user;
  }

  async getUserTokens(userId: number) {
    const tokens = await this.prismaService.deviceToken.findMany({
      where: {
        user_id: userId,
      },
    });
    return tokens;
  }

  async getUserSchedules(userId: number) {
    const schedules = await this.prismaService.schedule.findMany({
      where: {
        user_id: userId,
      },
    });
    return schedules;
  }

  async getScheduleById(id: number) {
    const schedule = await this.prismaService.schedule.findUnique({
      where: {
        id,
      },
    });
    return schedule;
  }

  async getUserScheduleBySchedule(userId: number, schedule: string) {
    const userSchedule = await this.prismaService.schedule.findFirst({
      where: {
        user_id: userId,
        schedule,
      },
    });
    return userSchedule;
  }

  async removeSchedule(id: number) {
    const schedule = await this.prismaService.schedule.delete({
      where: {
        id,
      },
    });
    return schedule;
  }

  async updateScheduleStatus(id: number, isEnabled: boolean) {
    const updatedSchedule = await this.prismaService.schedule.update({
      where: {
        id,
      },
      data: {
        is_enabled: isEnabled,
      },
    });
    return updatedSchedule;
  }

  async invalidateTokens(tokens: string[]) {
    try {
      await this.prismaService.deviceToken.updateMany({
        where: {
          token: {
            in: tokens,
          },
        },
        data: {
          is_active: false,
        },
      });
    } catch (_error) {
      throw new HttpException(
        'Failed to invalidate tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
