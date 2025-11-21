import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { ReminderModule } from 'src/reminder/reminder.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MailModule } from 'src/mail/mail.module';
import { UserInterceptor } from 'src/interceptor/user.interceptor';

@Module({
  providers: [AssignmentService, UserInterceptor],
  controllers: [AssignmentController],
  imports: [ReminderModule, NotificationModule, MailModule],
})
export class AssignmentModule {}
