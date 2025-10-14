import { Module } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ExpoService } from './common/expo.service';
import { CommonModule } from './common/common.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
    ExpoService,
  ],
  exports: [AsyncLocalStorage],
  imports: [CommonModule, NotificationModule],
})
export class AlsModule {}
