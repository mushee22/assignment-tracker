import { IsNotEmpty, IsBoolean, IsString } from 'class-validator';

export class UpdateReminderScheduleDto {
  @IsNotEmpty()
  @IsBoolean()
  status: boolean;

  @IsNotEmpty()
  @IsString()
  schedule: string;
}

export class RemoveReminderScheduleDto {
  @IsNotEmpty()
  @IsString()
  schedule: string;
}
