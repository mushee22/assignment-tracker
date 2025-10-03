import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { Priority } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @IsNotEmpty()
  @IsDateString()
  due_date: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  subject_id: number;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.LOW;
}
