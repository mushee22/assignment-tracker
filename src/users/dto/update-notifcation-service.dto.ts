import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserNotifcationSetttingsDto {
  @IsBoolean()
  @IsOptional()
  assignment_reminder?: boolean;

  @IsBoolean()
  @IsOptional()
  push_notification?: boolean;

  @IsBoolean()
  @IsOptional()
  email_notification?: boolean;
}
