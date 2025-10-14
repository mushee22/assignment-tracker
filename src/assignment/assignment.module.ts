import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { ReminderModule } from 'src/reminder/reminder.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  providers: [AssignmentService],
  controllers: [AssignmentController],
  imports: [ReminderModule, NotificationModule],
})
export class AssignmentModule {}
