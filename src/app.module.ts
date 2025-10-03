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
import { NotificationService } from './notification.service';

@Module({
  imports: [
    PrismaModule,
    AssignmentModule,
    SubjectModule,
    AuthModule,
    UsersModule,
    MailModule,
    TokenModule,
    AwsS3Module.forRoot({
      location: 'S3_BUCKET',
      base_url: 'localhost://3000',
      s3_bucket_name: 'assignment-tracker',
      s3_region: 'us-east-1',
      s3_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
      s3_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    }),
    ReminderModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    TokenService,
    TaskService,
    NotificationService,
  ],
})
export class AppModule {}
