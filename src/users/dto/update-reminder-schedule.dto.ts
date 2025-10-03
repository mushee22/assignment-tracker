import { IsNotEmpty, IsBoolean, IsString } from 'class-validator';

export class UpdateReminderScheduleDto {
  @IsNotEmpty()
  @IsBoolean()
  status: boolean;

  @IsNotEmpty()
  @IsString()
  schedule: string;
}
