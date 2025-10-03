import { Module, forwardRef } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  providers: [ReminderService],
  controllers: [ReminderController],
  exports: [ReminderService],
  imports: [forwardRef(() => UsersModule)],
})
export class ReminderModule {}
