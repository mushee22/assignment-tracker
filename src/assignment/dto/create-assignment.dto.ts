import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
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

  @IsOptional()
  @IsDateString()
  start_date?: string;

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

  @IsOptional()
  @IsString({ each: true })
  notes?: string[];

  @IsOptional()
  @IsBoolean()
  is_reminder?: boolean = false;
}
