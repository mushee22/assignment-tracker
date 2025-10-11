import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { extension } from 'prisma-paginate';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      omit: {
        user: {
          hashed_password: true,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.$extends(extension);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
