import { IsNotEmpty, IsBoolean, IsString } from 'class-validator';

export class CreateAssignmentScheduleDto {
  @IsNotEmpty()
  @IsBoolean()
  status: boolean;

  @IsNotEmpty()
  @IsString()
  schedule: string;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class UpdateAssignmentScheduleDto {
  @IsNotEmpty()
  @IsBoolean()
  status: boolean;

  @IsNotEmpty()
  @IsString()
  schedule: string;

  @IsNotEmpty()
  @IsString()
  type?: string;
}

export class RemoveReminderScheduleDto {
  @IsNotEmpty()
  @IsString()
  schedule: string;
}
