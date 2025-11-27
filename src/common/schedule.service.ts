import { Injectable } from '@nestjs/common';
import { Prisma, Schedule } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSchedules(
    userId: number,
    isGlobal: boolean = true,
    assignment_id?: number,
    isDefault: boolean = false,
  ) {
    const schedules = await this.prismaService.schedule.findMany({
      where: {
        user_id: userId,
        is_global: isGlobal,
        is_default: isDefault,
        assignment_id: assignment_id,
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

  async getScheduleBySchedule(
    userId: number,
    schedule: string,
    assignment_id?: number,
    type: 'BEFORE' | 'AFTER' = 'BEFORE',
  ) {
    const existingSchedule = await this.prismaService.schedule.findFirst({
      where: {
        user_id: userId,
        schedule,
        assignment_id: assignment_id,
        type: type,
      },
    });
    return existingSchedule;
  }

  async updateSchedule(id: number, data: Prisma.ScheduleUpdateInput) {
    const schedule = await this.prismaService.schedule.update({
      where: {
        id,
      },
      data,
    });
    return schedule;
  }

  async deleteSchedule(id: number) {
    const schedule = await this.prismaService.schedule.delete({
      where: {
        id,
      },
    });
    return schedule;
  }

  async createSchedule(
    data: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>,
  ) {
    const schedule = await this.prismaService.schedule.create({
      data: {
        ...data,
      },
    });
    return schedule;
  }
}
