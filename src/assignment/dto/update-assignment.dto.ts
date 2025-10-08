import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsEnum,
  Max,
} from 'class-validator';
import { Priority, AssignmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  subject_id?: number;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.LOW;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus = AssignmentStatus.PENDING;

  @IsOptional()
  @IsDateString()
  completed_date?: string;

  @IsOptional()
  @IsDateString()
  start_at?: string;

  @IsOptional()
  @IsDateString()
  cancelled_at?: string;

  @IsOptional()
  @IsDateString()
  completed_at?: string;

  @IsOptional()
  @IsString()
  cancelled_resason?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  progress?: number;
}
