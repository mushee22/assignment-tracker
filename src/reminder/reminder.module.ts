import { Module, forwardRef } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { UsersModule } from 'src/users/users.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  providers: [ReminderService],
  controllers: [ReminderController],
  exports: [ReminderService],
  imports: [forwardRef(() => UsersModule), NotificationModule, MailModule],
})
export class ReminderModule {}
