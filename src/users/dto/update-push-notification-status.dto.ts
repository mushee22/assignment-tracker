import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdatePushNotificationStatusDto {
  @IsBoolean()
  is_push_notification: boolean;

  @IsNotEmpty()
  @IsOptional()
  token: string;
}
