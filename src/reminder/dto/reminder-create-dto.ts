import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReminderCreateDto {
  @IsDateString()
  @IsNotEmpty()
  due_date: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  @IsInt()
  reference_id?: number;

  @IsOptional()
  @IsString()
  reference_model?: string;
}
