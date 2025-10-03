import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    console.log('Called EVERY MInute');
  }
}
