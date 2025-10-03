import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ReminderModule } from 'src/reminder/reminder.module';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
  imports: [forwardRef(() => ReminderModule)],
})
export class UsersModule {}
