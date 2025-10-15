import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AssignmentModule } from './assignment/assignment.module';
import { SubjectModule } from './subject/subject.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { TokenService } from './token/token.service';
import { TokenModule } from './token/token.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { ReminderModule } from './reminder/reminder.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    PrismaModule,
    AssignmentModule,
    SubjectModule,
    AuthModule,
    UsersModule,
    MailModule,
    TokenModule,
    AwsS3Module.forRoot({
      location: 'S3_BUCKET',
      base_url: process.env.BASE_URL,
      s3_bucket_name: process.env.S3_BUCKET_NAME,
      s3_region: process.env.S3_REGION,
      s3_access_key_id: process.env.S3_ACCESS_KEY_ID,
      s3_secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
    }),
    ReminderModule,
    ScheduleModule.forRoot(),
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    AppService,
    PrismaService,
    TokenService,
    TaskService,
  ],
})
export class AppModule {}
