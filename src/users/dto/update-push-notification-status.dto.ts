import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdatePushNotificationStatusDto {
  @IsBoolean()
  is_push_notification: boolean;

  @IsNotEmpty()
  token: string;
}
