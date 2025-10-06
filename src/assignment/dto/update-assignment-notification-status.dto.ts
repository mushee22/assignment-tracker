import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateAssignmentNotificationStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  is_push_notification: boolean;

  @IsNotEmpty()
  @IsBoolean()
  is_email_notification: boolean;
}
